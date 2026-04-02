import { PublicKey } from "@solana/web3.js";
import type { RankedBid } from "@valorem/sdk";
import { buildBidCommitment } from "@valorem/sdk";
import type { AuctionRuntimeState, WalletActionKey, WalletAuctionState } from "./types";

function cloneRankedBid(bid: RankedBid): RankedBid {
  return { ...bid };
}

function cloneRuntimeState(state: AuctionRuntimeState): AuctionRuntimeState {
  return {
    ...state,
    auction: {
      ...state.auction,
      auctionSeed: new Uint8Array(state.auction.auctionSeed),
      rankedBidders: state.auction.rankedBidders.map(cloneRankedBid),
    },
    bidderStates: Object.fromEntries(
      Object.entries(state.bidderStates).map(([key, value]) => [key, { ...value }]),
    ),
    complianceRecords: Object.fromEntries(
      Object.entries(state.complianceRecords).map(([key, value]) => [key, { ...value }]),
    ),
  };
}

function sortRankedBids(left: RankedBid, right: RankedBid): number {
  if (left.amount !== right.amount) {
    return left.amount > right.amount ? -1 : 1;
  }
  if (left.revealTimestamp !== right.revealTimestamp) {
    return left.revealTimestamp < right.revealTimestamp ? -1 : 1;
  }
  return left.bidder.toBase58().localeCompare(right.bidder.toBase58());
}

export function getCurrentBid(state: AuctionRuntimeState): bigint | null {
  return state.auction.rankedBidders[0]?.amount ?? null;
}

export function getLeadingBidder(state: AuctionRuntimeState): string | null {
  return state.auction.rankedBidders[state.auction.currentSettlementIndex]?.bidder.toBase58() ?? null;
}

export function getWalletAuctionState(
  state: AuctionRuntimeState,
  walletAddress: string | null,
): WalletAuctionState {
  const bidderState = walletAddress ? state.bidderStates[walletAddress] ?? null : null;
  const complianceRecord = walletAddress
    ? state.complianceRecords[walletAddress] ?? null
    : null;
  const activeBidder = getLeadingBidder(state);
  const isLeadingCandidate = Boolean(
    walletAddress &&
      bidderState?.settlementEligible &&
      activeBidder === walletAddress &&
      state.auction.phase === "settlement",
  );
  const isRefundEligible = Boolean(
    bidderState &&
      bidderState.revealed &&
      !bidderState.depositRefunded &&
      !bidderState.depositSlashed &&
      (state.auction.phase === "completed" ||
        !state.auction.rankedBidders
          .slice(state.auction.currentSettlementIndex)
          .some((bid) => bid.bidder.toBase58() === walletAddress && !bid.disqualified && !bid.settled)),
  );

  const actions: WalletActionKey[] = [];
  if (!walletAddress) {
    actions.push("connect");
  } else if (!bidderState) {
    if (state.auction.phase === "bidding") {
      actions.push("submitCommitment");
    }
  } else if (state.auction.phase === "bidding" && bidderState.depositPaid && !bidderState.revealed) {
    actions.push("awaitReveal");
  } else if (state.auction.phase === "reveal" && !bidderState.revealed) {
    actions.push("reveal");
  } else if (isLeadingCandidate) {
    if (complianceRecord?.status === "approved" && bidderState.complianceApproved) {
      actions.push("settle");
    } else {
      actions.push("awaitCompliance");
    }
  } else if (isRefundEligible) {
    actions.push("claimRefund");
  } else {
    actions.push("wait");
  }

  return {
    bidderState,
    complianceRecord,
    actions,
    isLeadingCandidate,
    isRefundEligible,
    currentBid: getCurrentBid(state),
  };
}

export function submitMockCommitment(params: {
  state: AuctionRuntimeState;
  walletAddress: string;
  commitment: Uint8Array;
  committedAt: bigint;
}): AuctionRuntimeState {
  const next = cloneRuntimeState(params.state);
  if (next.auction.phase !== "bidding") {
    throw new Error("Auction is not accepting commitments.");
  }

  if (next.bidderStates[params.walletAddress]) {
    throw new Error("Bidder already committed.");
  }

  next.bidderStates[params.walletAddress] = {
    auction: new PublicKey(next.auctionAddress),
    bidder: new PublicKey(params.walletAddress),
    commitment: params.commitment,
    commitmentSubmittedAt: params.committedAt,
    bidAmount: 0n,
    revealTimestamp: 0n,
    depositAmount: next.auction.depositAmount,
    rank: 0,
    bump: 255,
    depositPaid: true,
    revealed: false,
    settlementEligible: false,
    complianceApproved: false,
    settled: false,
    depositRefunded: false,
    depositSlashed: false,
  };
  next.auction.registeredBidders += 1;
  next.auction.totalDepositsHeld += next.auction.depositAmount;
  return next;
}

export function advanceMockAuctionToReveal(state: AuctionRuntimeState): AuctionRuntimeState {
  const next = cloneRuntimeState(state);
  if (next.auction.phase !== "bidding") {
    throw new Error("Auction is not in bidding.");
  }
  next.auction.phase = "reveal";
  return next;
}

export function revealMockBid(params: {
  state: AuctionRuntimeState;
  walletAddress: string;
  bidAmount: bigint;
  salt: Uint8Array;
  revealedAt: bigint;
}): AuctionRuntimeState {
  const next = cloneRuntimeState(params.state);
  const bidderState = next.bidderStates[params.walletAddress];
  if (!bidderState) {
    throw new Error("No commitment found.");
  }
  if (next.auction.phase !== "reveal") {
    throw new Error("Auction is not in reveal.");
  }
  if (bidderState.revealed) {
    throw new Error("Bid already revealed.");
  }

  const expected = buildBidCommitment({
    auction: next.auctionAddress,
    bidder: params.walletAddress,
    bidAmount: params.bidAmount,
    salt: params.salt,
  });
  if (!Buffer.from(expected).equals(Buffer.from(bidderState.commitment))) {
    throw new Error("Reveal does not match commitment.");
  }

  bidderState.bidAmount = params.bidAmount;
  bidderState.revealed = true;
  bidderState.revealTimestamp = params.revealedAt;
  next.auction.rankedBidders.push({
    bidder: bidderState.bidder,
    amount: params.bidAmount,
    revealTimestamp: params.revealedAt,
    disqualified: false,
    settled: false,
  });
  next.auction.rankedBidders.sort(sortRankedBids);

  for (const [index, bid] of next.auction.rankedBidders.entries()) {
    const address = bid.bidder.toBase58();
    if (next.bidderStates[address]) {
      next.bidderStates[address].rank = index + 1;
    }
  }

  return next;
}

export function closeMockReveal(state: AuctionRuntimeState, startedAt: bigint): AuctionRuntimeState {
  const next = cloneRuntimeState(state);
  if (next.auction.phase !== "reveal") {
    throw new Error("Auction is not in reveal.");
  }

  const candidateIndex = next.auction.rankedBidders.findIndex(
    (bid) => !bid.disqualified && !bid.settled && bid.amount >= next.auction.reservePrice,
  );

  if (candidateIndex === -1) {
    next.auction.phase = "completed";
    return next;
  }

  next.auction.phase = "settlement";
  next.auction.currentSettlementIndex = candidateIndex;
  next.auction.activeSettlementStartedAt = startedAt;

  const active = next.auction.rankedBidders[candidateIndex];
  const activeState = next.bidderStates[active.bidder.toBase58()];
  if (activeState) {
    activeState.settlementEligible = true;
    activeState.rank = candidateIndex + 1;
  }

  return next;
}

export function recordMockCompliance(params: {
  state: AuctionRuntimeState;
  walletAddress: string;
  approved: boolean;
  reviewedAt: bigint;
  expiresAt: bigint;
}): AuctionRuntimeState {
  const next = cloneRuntimeState(params.state);
  const bidderState = next.bidderStates[params.walletAddress];
  if (!bidderState) {
    throw new Error("Bidder not found.");
  }

  next.complianceRecords[params.walletAddress] = {
    auction: bidderState.auction,
    bidder: bidderState.bidder,
    reviewer: next.auction.reviewerAuthority,
    status: params.approved ? "approved" : "rejected",
    attestationDigest: new Uint8Array(32).fill(params.approved ? 9 : 1),
    reviewedAt: params.reviewedAt,
    expiresAt: params.expiresAt,
    bump: 255,
  };
  bidderState.complianceApproved = params.approved;
  return next;
}

export function settleMockCandidate(
  state: AuctionRuntimeState,
  walletAddress: string,
): AuctionRuntimeState {
  const next = cloneRuntimeState(state);
  const bidderState = next.bidderStates[walletAddress];
  const record = next.complianceRecords[walletAddress];
  if (!bidderState) {
    throw new Error("Bidder not found.");
  }
  if (next.auction.phase !== "settlement" || !bidderState.settlementEligible) {
    throw new Error("Bidder is not the active settlement candidate.");
  }
  if (!record || record.status !== "approved" || !bidderState.complianceApproved) {
    throw new Error("Compliance approval is still required.");
  }

  bidderState.settlementEligible = false;
  bidderState.settled = true;
  next.auction.phase = "completed";
  next.auction.hasSettledBidder = true;
  next.auction.settledBidder = bidderState.bidder;
  next.auction.activeSettlementStartedAt = 0n;
  next.auction.assetDeposited = false;
  next.auction.totalDepositsHeld -= bidderState.depositAmount;
  next.auction.totalProceeds += bidderState.bidAmount;

  const ranked = next.auction.rankedBidders.find(
    (bid) => bid.bidder.toBase58() === walletAddress,
  );
  if (ranked) {
    ranked.settled = true;
  }

  return next;
}

export function claimMockRefund(
  state: AuctionRuntimeState,
  walletAddress: string,
): AuctionRuntimeState {
  const next = cloneRuntimeState(state);
  const bidderState = next.bidderStates[walletAddress];
  if (!bidderState || bidderState.depositRefunded || bidderState.depositSlashed) {
    throw new Error("Refund is unavailable.");
  }
  if (!bidderState.revealed) {
    throw new Error("Only revealed bidders can claim refunds.");
  }

  bidderState.depositRefunded = true;
  next.auction.totalDepositsHeld -= bidderState.depositAmount;
  return next;
}

export function slashMockUnrevealed(
  state: AuctionRuntimeState,
  walletAddress: string,
): AuctionRuntimeState {
  const next = cloneRuntimeState(state);
  const bidderState = next.bidderStates[walletAddress];
  if (!bidderState || bidderState.revealed || bidderState.depositSlashed) {
    throw new Error("Bidder is not slashable as unrevealed.");
  }

  bidderState.depositSlashed = true;
  next.auction.totalDepositsHeld -= bidderState.depositAmount;
  next.auction.totalSlashed += bidderState.depositAmount;
  return next;
}

export function slashMockCandidateAndAdvance(
  state: AuctionRuntimeState,
  walletAddress: string,
  startedAt: bigint,
): AuctionRuntimeState {
  const next = cloneRuntimeState(state);
  const bidderState = next.bidderStates[walletAddress];
  if (!bidderState || !bidderState.settlementEligible) {
    throw new Error("Bidder is not the active candidate.");
  }

  bidderState.depositSlashed = true;
  bidderState.settlementEligible = false;
  next.auction.totalDepositsHeld -= bidderState.depositAmount;
  next.auction.totalSlashed += bidderState.depositAmount;

  const current = next.auction.rankedBidders.find(
    (bid) => bid.bidder.toBase58() === walletAddress,
  );
  if (current) {
    current.disqualified = true;
  }

  const nextIndex = next.auction.rankedBidders.findIndex(
    (bid, index) =>
      index > next.auction.currentSettlementIndex &&
      !bid.disqualified &&
      !bid.settled &&
      bid.amount >= next.auction.reservePrice,
  );

  if (nextIndex === -1) {
    next.auction.phase = "completed";
    next.auction.activeSettlementStartedAt = 0n;
    return next;
  }

  next.auction.currentSettlementIndex = nextIndex;
  next.auction.activeSettlementStartedAt = startedAt;
  const promoted = next.auction.rankedBidders[nextIndex];
  const promotedState = next.bidderStates[promoted.bidder.toBase58()];
  if (promotedState) {
    promotedState.settlementEligible = true;
    promotedState.rank = nextIndex + 1;
  }

  return next;
}

export function withdrawMockProceeds(
  state: AuctionRuntimeState,
  amount: bigint,
): AuctionRuntimeState {
  const next = cloneRuntimeState(state);
  next.auction.totalWithdrawn += amount;
  return next;
}
