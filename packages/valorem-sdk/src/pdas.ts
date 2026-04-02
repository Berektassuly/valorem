import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import {
  AUCTION_SEED,
  BIDDER_SEED,
  COMPLIANCE_SEED,
  HOOK_CONFIG_SEED,
  HOOK_PERMIT_SEED,
  TRANSFER_HOOK_VALIDATION_SEED,
  VALOREM_AUCTION_PROGRAM_ID,
  VALOREM_TRANSFER_HOOK_PROGRAM_ID,
} from "./constants.js";

export function deriveAuctionPda(
  issuer: PublicKey,
  auctionSeed: Uint8Array,
  programId = VALOREM_AUCTION_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(AUCTION_SEED), issuer.toBuffer(), Buffer.from(auctionSeed)],
    programId,
  );
}

export function deriveBidderStatePda(
  auction: PublicKey,
  bidder: PublicKey,
  programId = VALOREM_AUCTION_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(BIDDER_SEED), auction.toBuffer(), bidder.toBuffer()],
    programId,
  );
}

export function deriveComplianceRecordPda(
  auction: PublicKey,
  bidder: PublicKey,
  programId = VALOREM_AUCTION_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(COMPLIANCE_SEED), auction.toBuffer(), bidder.toBuffer()],
    programId,
  );
}

export function deriveHookConfigPda(
  mint: PublicKey,
  programId = VALOREM_TRANSFER_HOOK_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(HOOK_CONFIG_SEED), mint.toBuffer()],
    programId,
  );
}

export function deriveTransferHookValidationPda(
  mint: PublicKey,
  programId = VALOREM_TRANSFER_HOOK_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(TRANSFER_HOOK_VALIDATION_SEED), mint.toBuffer()],
    programId,
  );
}

export function deriveTransferPermitPda(
  mint: PublicKey,
  sourceToken: PublicKey,
  destinationToken: PublicKey,
  programId = VALOREM_TRANSFER_HOOK_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(HOOK_PERMIT_SEED),
      mint.toBuffer(),
      sourceToken.toBuffer(),
      destinationToken.toBuffer(),
    ],
    programId,
  );
}

export function deriveAuctionVaultAddress(
  mint: PublicKey,
  auction: PublicKey,
  tokenProgram = TOKEN_2022_PROGRAM_ID,
): PublicKey {
  return getAssociatedTokenAddressSync(
    mint,
    auction,
    true,
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

export function deriveBidderAssetAddress(
  mint: PublicKey,
  bidder: PublicKey,
  tokenProgram = TOKEN_2022_PROGRAM_ID,
): PublicKey {
  return getAssociatedTokenAddressSync(
    mint,
    bidder,
    false,
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}
