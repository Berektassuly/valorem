import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { buildBidCommitment } from "./commitment.js";

describe("buildBidCommitment", () => {
  it("is deterministic for the same inputs", () => {
    const auction = new PublicKey(new Uint8Array(32).fill(1));
    const bidder = new PublicKey(new Uint8Array(32).fill(2));
    const salt = new Uint8Array(32).fill(9);

    const first = buildBidCommitment({
      auction,
      bidder,
      bidAmount: 125_000_000n,
      salt,
    });
    const second = buildBidCommitment({
      auction,
      bidder,
      bidAmount: 125_000_000n,
      salt,
    });

    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
  });

  it("changes when the bidder changes", () => {
    const auction = new PublicKey(new Uint8Array(32).fill(1));
    const salt = new Uint8Array(32).fill(9);

    const first = buildBidCommitment({
      auction,
      bidder: new PublicKey(new Uint8Array(32).fill(2)),
      bidAmount: 125_000_000n,
      salt,
    });
    const second = buildBidCommitment({
      auction,
      bidder: new PublicKey(new Uint8Array(32).fill(3)),
      bidAmount: 125_000_000n,
      salt,
    });

    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false);
  });
});
