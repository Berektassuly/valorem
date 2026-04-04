import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  __testUtils,
  decodeAuctionAccount,
  decodeBidderStateAccount,
} from "./accounts.js";
import type { AuctionAccount, BidderStateAccount } from "./types.js";

function makeTestAuction(): AuctionAccount {
  return {
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
}

describe("decodeAuctionAccount", () => {
  it("round-trips auction account data", () => {
    const account = makeTestAuction();
    const encoded = __testUtils.encodeAuctionAccount(account);
    const decoded = decodeAuctionAccount(encoded);

    expect(decoded.phase).toBe("settlement");
    expect(decoded.rankedBidders).toHaveLength(1);
    expect(decoded.rankedBidders[0]?.amount).toBe(900_000_000n);
    expect(decoded.assetDeposited).toBe(true);
    expect(decoded.registeredBidders).toBe(3);
  });

  it("decodes correctly when data is embedded at a non-zero offset (Buffer pool regression)", () => {
    const account = makeTestAuction();
    const encoded = __testUtils.encodeAuctionAccount(account);

    // Simulate Node.js Buffer pool: encoded data sits at a non-zero offset
    // inside a much larger ArrayBuffer, exactly like real RPC responses.
    const poolSize = 8192;
    const offset = 1024;
    const pool = new ArrayBuffer(poolSize);

    // Fill the pool with 0xFF so any incorrect read is maximally wrong
    new Uint8Array(pool).fill(0xff);

    // Place the encoded data at the non-zero offset
    new Uint8Array(pool, offset, encoded.length).set(encoded);

    // Create a Buffer-like subarray sharing the pool ArrayBuffer
    const bufferSlice = Buffer.from(pool, offset, encoded.length);

    const decoded = decodeAuctionAccount(bufferSlice);

    expect(decoded.phase).toBe("settlement");
    expect(decoded.bump).toBe(255);
    expect(decoded.maxBidders).toBe(12);
    expect(decoded.registeredBidders).toBe(3);
    expect(decoded.currentSettlementIndex).toBe(1);
    expect(decoded.depositAmount).toBe(100_000_000n);
    expect(decoded.reservePrice).toBe(800_000_000n);
    expect(decoded.assetAmount).toBe(1n);
    expect(decoded.biddingEndAt).toBe(10n);
    expect(decoded.revealEndAt).toBe(20n);
    expect(decoded.settlementWindow).toBe(30n);
    expect(decoded.activeSettlementStartedAt).toBe(21n);
    expect(decoded.rankedBidders).toHaveLength(1);
    expect(decoded.rankedBidders[0]?.amount).toBe(900_000_000n);
    expect(decoded.rankedBidders[0]?.revealTimestamp).toBe(25n);
  });
});

describe("decodeBidderStateAccount", () => {
  it("decodes correctly when data is embedded at a non-zero offset (Buffer pool regression)", () => {
    const account: BidderStateAccount = {
      auction: new PublicKey(new Uint8Array(32).fill(1)),
      bidder: new PublicKey(new Uint8Array(32).fill(2)),
      commitment: new Uint8Array(32).fill(3),
      commitmentSubmittedAt: 1000n,
      bidAmount: 500_000_000n,
      revealTimestamp: 2000n,
      depositAmount: 100_000_000n,
      rank: 1,
      bump: 254,
      depositPaid: true,
      revealed: true,
      settlementEligible: true,
      complianceApproved: false,
      settled: false,
      depositRefunded: false,
      depositSlashed: false,
    };

    const encoded = __testUtils.encodeBidderStateAccount(account);

    const poolSize = 8192;
    const offset = 2048;
    const pool = new ArrayBuffer(poolSize);
    new Uint8Array(pool).fill(0xff);
    new Uint8Array(pool, offset, encoded.length).set(encoded);

    const bufferSlice = Buffer.from(pool, offset, encoded.length);
    const decoded = decodeBidderStateAccount(bufferSlice);

    expect(decoded.commitmentSubmittedAt).toBe(1000n);
    expect(decoded.bidAmount).toBe(500_000_000n);
    expect(decoded.revealTimestamp).toBe(2000n);
    expect(decoded.depositAmount).toBe(100_000_000n);
    expect(decoded.rank).toBe(1);
    expect(decoded.bump).toBe(254);
    expect(decoded.depositPaid).toBe(true);
    expect(decoded.revealed).toBe(true);
    expect(decoded.settlementEligible).toBe(true);
    expect(decoded.complianceApproved).toBe(false);
  });
});
