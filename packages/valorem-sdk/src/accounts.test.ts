import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { __testUtils, decodeAuctionAccount } from "./accounts.js";
import type { AuctionAccount } from "./types.js";

describe("decodeAuctionAccount", () => {
  it("round-trips auction account data", () => {
    const account: AuctionAccount = {
      issuer: new PublicKey(new Uint8Array(32).fill(1)),
      reviewerAuthority: new PublicKey(new Uint8Array(32).fill(2)),
      assetMint: new PublicKey(new Uint8Array(32).fill(3)),
      paymentMint: new PublicKey(new Uint8Array(32).fill(4)),
      assetVault: new PublicKey(new Uint8Array(32).fill(5)),
      paymentVault: new PublicKey(new Uint8Array(32).fill(6)),
      issuerPaymentDestination: new PublicKey(new Uint8Array(32).fill(7)),
      transferHookConfig: new PublicKey(new Uint8Array(32).fill(8)),
      transferHookValidation: new PublicKey(new Uint8Array(32).fill(9)),
      auctionSeed: new Uint8Array(32).fill(10),
      phase: "settlement",
      bump: 255,
      assetDeposited: true,
      hasSettledBidder: false,
      settledBidder: new PublicKey(new Uint8Array(32).fill(11)),
      depositAmount: 100_000_000n,
      reservePrice: 800_000_000n,
      assetAmount: 1n,
      totalDepositsHeld: 200_000_000n,
      totalSlashed: 100_000_000n,
      totalProceeds: 900_000_000n,
      totalWithdrawn: 50_000_000n,
      biddingEndAt: 10n,
      revealEndAt: 20n,
      settlementWindow: 30n,
      activeSettlementStartedAt: 21n,
      maxBidders: 12,
      registeredBidders: 3,
      currentSettlementIndex: 1,
      rankedBidders: [
        {
          bidder: new PublicKey(new Uint8Array(32).fill(12)),
          amount: 900_000_000n,
          revealTimestamp: 25n,
          disqualified: false,
          settled: false,
        },
      ],
    };

    const encoded = __testUtils.encodeAuctionAccount(account);
    const decoded = decodeAuctionAccount(encoded);

    expect(decoded.phase).toBe("settlement");
    expect(decoded.rankedBidders).toHaveLength(1);
    expect(decoded.rankedBidders[0]?.amount).toBe(900_000_000n);
    expect(decoded.assetDeposited).toBe(true);
    expect(decoded.registeredBidders).toBe(3);
  });
});
