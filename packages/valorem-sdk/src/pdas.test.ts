import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  deriveAuctionPda,
  deriveBidderStatePda,
  deriveTransferHookValidationPda,
} from "./pdas.js";

describe("PDA derivation", () => {
  it("derives stable auction and bidder addresses", () => {
    const issuer = new PublicKey(new Uint8Array(32).fill(13));
    const bidder = new PublicKey(new Uint8Array(32).fill(14));
    const seed = new Uint8Array(32).fill(15);
    const [auction] = deriveAuctionPda(issuer, seed);
    const [bidderState] = deriveBidderStatePda(auction, bidder);
    const [validation] = deriveTransferHookValidationPda(
      new PublicKey(new Uint8Array(32).fill(16)),
    );

    expect(auction.toBase58()).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
    expect(bidderState.toBase58()).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
    expect(validation.toBase58()).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
  });
});
