import type { AuctionRuntimeState, WalletActionKey, WalletAuctionState } from "./types";

export function getCurrentBid(state: AuctionRuntimeState): bigint | null {
  return state.auction.rankedBidders[0]?.amount ?? null;
}

export function getLeadingBidder(state: AuctionRuntimeState): string | null {
  return (
    state.auction.rankedBidders[state.auction.currentSettlementIndex]?.bidder.toBase58() ??
    null
  );
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
          .some(
            (bid) =>
              bid.bidder.toBase58() === walletAddress &&
              !bid.disqualified &&
              !bid.settled,
          )),
  );

  const actions: WalletActionKey[] = [];
  if (!walletAddress) {
    actions.push("connect");
  } else if (!bidderState) {
    if (state.auction.phase === "bidding") {
      actions.push("submitCommitment");
    } else {
      actions.push("wait");
    }
  } else if (
    state.auction.phase === "bidding" &&
    bidderState.depositPaid &&
    !bidderState.revealed
  ) {
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
