import { describe, expect, it } from "vitest";
import { DEMO_WALLET_ADDRESS, createInitialMockProtocolState } from "./mock-state";
import { getWalletAuctionState } from "./mock-transitions";
import { buildDashboardRows, buildMarketplaceLots } from "./view-models";

describe("protocol view models", () => {
  it("maps catalog entries into marketplace cards with live metrics", () => {
    const state = createInitialMockProtocolState();
    const lots = buildMarketplaceLots(Object.values(state), DEMO_WALLET_ADDRESS);

    expect(lots).toHaveLength(6);
    expect(lots[0]?.marketMetrics).toHaveLength(4);
    expect(lots.some((lot) => lot.status === "Settlement")).toBe(true);
  });

  it("builds dashboard rows only for wallet-specific bidder states", () => {
    const state = createInitialMockProtocolState();
    const rows = buildDashboardRows(Object.values(state), DEMO_WALLET_ADDRESS);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.walletState.bidderState)).toBe(true);
  });

  it("gates wallet actions by phase and bidder status", () => {
    const state = createInitialMockProtocolState();

    const settlementState = getWalletAuctionState(
      state["prime-manhattan-equity-token-42"],
      DEMO_WALLET_ADDRESS,
    );
    const refundState = getWalletAuctionState(
      state["jade-vault-portrait-series"],
      DEMO_WALLET_ADDRESS,
    );
    const biddingState = getWalletAuctionState(
      state["metropolitan-core-office-complex"],
      DEMO_WALLET_ADDRESS,
    );

    expect(settlementState.actions).toContain("awaitCompliance");
    expect(refundState.actions).toContain("claimRefund");
    expect(biddingState.actions).toContain("submitCommitment");
  });
});
