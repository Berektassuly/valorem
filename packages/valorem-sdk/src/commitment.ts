import { sha256 } from "@noble/hashes/sha2.js";
import { PublicKey } from "@solana/web3.js";
import { bytesToHex, concatBytes, normalizePublicKey, u64ToLeBytes } from "./bytes.js";
import { COMMITMENT_DOMAIN } from "./constants.js";

const encoder = new TextEncoder();

export function generateSalt(): Uint8Array {
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  return salt;
}

export function buildBidCommitment(params: {
  auction: PublicKey | string | Uint8Array;
  bidder: PublicKey | string | Uint8Array;
  bidAmount: bigint;
  salt: Uint8Array;
}): Uint8Array {
  const auction = normalizePublicKey(params.auction);
  const bidder = normalizePublicKey(params.bidder);

  return sha256(
    concatBytes([
      encoder.encode(COMMITMENT_DOMAIN),
      auction.toBytes(),
      bidder.toBytes(),
      u64ToLeBytes(params.bidAmount),
      params.salt,
    ]),
  );
}

export function createRevealSecret(bidAmount: bigint): {
  bidAmount: bigint;
  salt: Uint8Array;
  saltHex: string;
} {
  const salt = generateSalt();
  return {
    bidAmount,
    salt,
    saltHex: bytesToHex(salt),
  };
}
