import type { MetricItem } from "@/lib/catalog";
import { formatCountDown, formatPhaseLabel, formatRank, formatShortUsd, formatUsd } from "./format";
import { getCurrentBid, getWalletAuctionState } from "./runtime-state";
import type { AuctionRuntimeState } from "./types";

export function buildMarketplaceLots(auctions: AuctionRuntimeState[], activeAddress: string | null) {
  return auctions.map((state) => {
    const walletState = getWalletAuctionState(state, activeAddress);
    const currentBid = getCurrentBid(state);

    return {
      ...state.catalog,
      status: formatPhaseLabel(state.auction.phase),
      marketMetrics: [
        {
          label: currentBid ? "Current bid" : "Reserve",
          value: currentBid ? formatShortUsd(currentBid) : formatShortUsd(state.auction.reservePrice),
          accent: true,
        },
        { label: "Reserve", value: formatShortUsd(state.auction.reservePrice) },
        { label: "Deposit", value: formatShortUsd(state.auction.depositAmount) },
        {
          label: state.auction.phase === "settlement" ? "Window" : "Closes",
          value:
            state.auction.phase === "settlement"
              ? formatCountDown(
                  state.auction.activeSettlementStartedAt + state.auction.settlementWindow,
                )
              : formatCountDown(state.auction.biddingEndAt),
        },
      ] satisfies MetricItem[],
      walletSummary: walletState.bidderState
        ? walletState.isLeadingCandidate
          ? "Active settlement candidate"
          : `Wallet position / ${formatRank(walletState.bidderState.rank)}`
        : "No wallet position",
    };
  });
}

export function buildAuctionLedger(state: AuctionRuntimeState) {
  return [
    {
      step: "Commit phase",
      note: `${state.auction.registeredBidders} registered bidders`,
      window: formatCountDown(state.auction.biddingEndAt),
      amount: formatUsd(state.auction.totalDepositsHeld),
      status: formatPhaseLabel(state.auction.phase),
      tone:
        state.auction.phase === "bidding"
          ? ("copper" as const)
          : state.auction.phase === "completed"
            ? ("dark" as const)
            : ("default" as const),
    },
    {
      step: "Reveal ranking",
      note: `${state.auction.rankedBidders.length} valid reveals`,
      window: formatCountDown(state.auction.revealEndAt),
      amount: state.auction.rankedBidders[0]
        ? formatUsd(state.auction.rankedBidders[0].amount)
        : "Pending",
      status: state.auction.rankedBidders[0] ? "Ranked" : "Open",
      tone: "default" as const,
    },
    {
      step: "Settlement",
      note: state.auction.hasSettledBidder
        ? state.auction.settledBidder.toBase58().slice(0, 8)
        : "Active candidate",
      window:
        state.auction.phase === "settlement"
          ? formatCountDown(state.auction.activeSettlementStartedAt + state.auction.settlementWindow)
          : "Resolved",
      amount: formatUsd(state.auction.totalProceeds + state.auction.totalSlashed),
      status: state.auction.hasSettledBidder ? "Released" : formatPhaseLabel(state.auction.phase),
      tone: state.auction.hasSettledBidder ? ("dark" as const) : ("copper" as const),
    },
  ];
}

export function buildDashboardRows(auctions: AuctionRuntimeState[], activeAddress: string | null) {
  return auctions
    .map((auction) => {
      const walletState = getWalletAuctionState(auction, activeAddress);
      return walletState.bidderState
        ? {
            auction,
            walletState,
          }
        : null;
    })
    .filter(
      (
        row,
      ): row is {
        auction: AuctionRuntimeState;
        walletState: ReturnType<typeof getWalletAuctionState>;
      } => row !== null,
    )
    .sort((left, right) => {
      const leftValue = left.walletState.bidderState?.bidAmount ?? 0n;
      const rightValue = right.walletState.bidderState?.bidAmount ?? 0n;
      return leftValue > rightValue ? -1 : 1;
    });
}

export function buildIssuerRows(auctions: AuctionRuntimeState[]) {
  return auctions.map((auction) => ({
    slug: auction.catalog.slug,
    program: auction.catalog.title,
    issuer: auction.catalog.issuerName,
    sector: auction.catalog.category,
    notional: formatShortUsd(getCurrentBid(auction) ?? auction.auction.reservePrice),
    stage: formatPhaseLabel(auction.auction.phase),
    tone:
      auction.auction.phase === "settlement"
        ? ("copper" as const)
        : auction.auction.phase === "completed"
          ? ("dark" as const)
          : ("default" as const),
  }));
}
