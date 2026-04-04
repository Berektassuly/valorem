import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { catalogAuctions } from "@/lib/catalog";
import { getWalletAuctionState } from "./runtime-state";
import type { AuctionRuntimeState } from "./types";
import { buildDashboardRows, buildMarketplaceLots } from "./view-models";

const PRIMARY_WALLET = new PublicKey(new Uint8Array(32).fill(91));
const SECONDARY_WALLET = new PublicKey(new Uint8Array(32).fill(92));
const REVIEWER = new PublicKey(new Uint8Array(32).fill(93));
const ISSUER = new PublicKey(new Uint8Array(32).fill(94));
const MINT = new PublicKey(new Uint8Array(32).fill(95));
const VAULT = new PublicKey(new Uint8Array(32).fill(96));
const ZERO_PUBKEY = new PublicKey(new Uint8Array(32).fill(0));

function buildAuctionState(params: {
  catalogIndex: number;
  phase: "bidding" | "reveal" | "settlement" | "completed";
  rankedBidders?: Array<{
    bidder: PublicKey;
    amount: bigint;
    disqualified?: boolean;
    settled?: boolean;
  }>;
  currentSettlementIndex?: number;
  bidderState?: {
    wallet: PublicKey;
    bidAmount: bigint;
    rank: number;
    revealed: boolean;
    settlementEligible: boolean;
    complianceApproved: boolean;
    depositRefunded?: boolean;
    depositSlashed?: boolean;
  } | null;
  complianceStatus?: "pending" | "approved" | "rejected" | null;
}): AuctionRuntimeState {
  const catalog = catalogAuctions[params.catalogIndex]!;
  const bidderStates =
    params.bidderState === null || params.bidderState === undefined
      ? {}
      : {
          [params.bidderState.wallet.toBase58()]: {
            auction: new PublicKey(catalog.protocol.auctionAddress),
            bidder: params.bidderState.wallet,
            commitment: new Uint8Array(32).fill(3),
            commitmentSubmittedAt: 1n,
            bidAmount: params.bidderState.bidAmount,
            revealTimestamp: params.bidderState.revealed ? 2n : 0n,
            depositAmount: 25_000_000n,
            rank: params.bidderState.rank,
            bump: 1,
            depositPaid: true,
            revealed: params.bidderState.revealed,
            settlementEligible: params.bidderState.settlementEligible,
            complianceApproved: params.bidderState.complianceApproved,
            settled: false,
            depositRefunded: params.bidderState.depositRefunded ?? false,
            depositSlashed: params.bidderState.depositSlashed ?? false,
          },
        };
  const complianceRecords =
    !params.bidderState || !params.complianceStatus
      ? {}
      : {
          [params.bidderState.wallet.toBase58()]: {
            auction: new PublicKey(catalog.protocol.auctionAddress),
            bidder: params.bidderState.wallet,
            reviewer: REVIEWER,
            status: params.complianceStatus,
            attestationDigest: new Uint8Array(32).fill(7),
            reviewedAt: 3n,
            expiresAt: 4n,
            bump: 1,
          },
        };

  return {
    catalog,
    auctionAddress: catalog.protocol.auctionAddress,
    auction: {
      issuer: ISSUER,
      reviewerAuthority: REVIEWER,
      assetMint: MINT,
      paymentMint: MINT,
      assetVault: VAULT,
      paymentVault: VAULT,
      issuerPaymentDestination: VAULT,
      transferHookConfig: VAULT,
      transferHookValidation: VAULT,
      auctionSeed: new Uint8Array(32).fill(5),
      phase: params.phase,
      bump: 1,
      assetDeposited: true,
      hasSettledBidder: params.phase === "completed",
      settledBidder: params.phase === "completed" ? PRIMARY_WALLET : ZERO_PUBKEY,
      depositAmount: 25_000_000n,
      reservePrice: 100_000_000n,
      assetAmount: 1_000_000n,
      totalDepositsHeld: 50_000_000n,
      totalSlashed: 0n,
      totalProceeds: 100_000_000n,
      totalWithdrawn: 0n,
      biddingEndAt: 100n,
      revealEndAt: 200n,
      settlementWindow: 300n,
      activeSettlementStartedAt: 250n,
      maxBidders: 10,
      registeredBidders: 2,
      currentSettlementIndex: params.currentSettlementIndex ?? 0,
      rankedBidders:
        params.rankedBidders?.map((bid) => ({
          bidder: bid.bidder,
          amount: bid.amount,
          revealTimestamp: 10n,
          disqualified: bid.disqualified ?? false,
          settled: bid.settled ?? false,
        })) ?? [],
    },
    bidderStates,
    complianceRecords,
    minIncrement: 0n,
    paymentSymbol: "USDC",
    assetSymbol: "RWA",
  };
}

describe("protocol view models", () => {
  const walletAddress = PRIMARY_WALLET.toBase58();
  const settlementState = buildAuctionState({
    catalogIndex: 2,
    phase: "settlement",
    rankedBidders: [
      { bidder: PRIMARY_WALLET, amount: 155_000_000n },
      { bidder: SECONDARY_WALLET, amount: 142_000_000n },
    ],
    bidderState: {
      wallet: PRIMARY_WALLET,
      bidAmount: 155_000_000n,
      rank: 1,
      revealed: true,
      settlementEligible: true,
      complianceApproved: false,
    },
    complianceStatus: "pending",
  });
  const refundState = buildAuctionState({
    catalogIndex: 1,
    phase: "completed",
    rankedBidders: [{ bidder: SECONDARY_WALLET, amount: 120_000_000n, settled: true }],
    bidderState: {
      wallet: PRIMARY_WALLET,
      bidAmount: 110_000_000n,
      rank: 2,
      revealed: true,
      settlementEligible: false,
      complianceApproved: false,
    },
    complianceStatus: null,
  });
  const biddingState = buildAuctionState({
    catalogIndex: 0,
    phase: "bidding",
    rankedBidders: [],
    bidderState: null,
    complianceStatus: null,
  });
  const closedStateWithoutBidder = buildAuctionState({
    catalogIndex: 4,
    phase: "reveal",
    rankedBidders: [{ bidder: SECONDARY_WALLET, amount: 120_000_000n }],
    bidderState: null,
    complianceStatus: null,
  });
  const auctions = [biddingState, refundState, settlementState];

  it("maps catalog entries into marketplace cards with live metrics", () => {
    const lots = buildMarketplaceLots(auctions, walletAddress);

    expect(lots).toHaveLength(3);
    expect(lots[0]?.marketMetrics).toHaveLength(4);
    expect(lots.some((lot) => lot.status === "Settlement")).toBe(true);
  });

  it("builds dashboard rows only for wallet-specific bidder states", () => {
    const rows = buildDashboardRows(auctions, walletAddress);

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.walletState.bidderState)).toBe(true);
  });

  it("gates wallet actions by phase and bidder status", () => {
    expect(getWalletAuctionState(settlementState, walletAddress).actions).toContain(
      "awaitCompliance",
    );
    expect(getWalletAuctionState(refundState, walletAddress).actions).toContain(
      "claimRefund",
    );
    expect(getWalletAuctionState(biddingState, walletAddress).actions).toContain(
      "submitCommitment",
    );
    expect(getWalletAuctionState(closedStateWithoutBidder, walletAddress).actions).toContain(
      "wait",
    );
  });
});
