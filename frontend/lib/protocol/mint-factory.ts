import {
  createInitializeMint2Instruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from "@solana/web3.js";

/**
 * Per-lot asset mint defaults.
 *
 * Each auction lot gets its own Token-2022 mint created as part of the
 * initialization transaction.  The mint is plain Token-2022 — no transfer-hook
 * extension — because `deposit_asset` does a standard `transfer_checked` that
 * does not pass hook accounts.  The hook config/validation accounts are still
 * created by the auction program's `initialize_hook` CPI checked against the
 * mint key, so the settlement path remains functional.
 */
const ASSET_MINT_DECIMALS = 0;

export type PerLotAssetMintResult = {
  /** The Keypair for the new mint — must partially sign the transaction. */
  mintKeypair: Keypair;
  /** The derived ATA where supply is minted before deposit. */
  issuerAssetAccount: PublicKey;
  /** Instructions to prepend *before* auction initialization. */
  instructions: TransactionInstruction[];
};

/**
 * Builds the instructions that create a fresh Token-2022 asset mint, create
 * the issuer's ATA for that mint, and mint the required supply into that ATA.
 *
 * The caller must include `mintKeypair` in the transaction's partial signers
 * so that `SystemProgram.createAccount` succeeds.
 */
export async function buildPerLotAssetMintInstructions(params: {
  connection: Connection;
  issuer: PublicKey;
  assetAmount: bigint;
}): Promise<PerLotAssetMintResult> {
  const mintKeypair = Keypair.generate();

  // Plain Token-2022 mint — no extensions.
  const mintSpace = getMintLen([]);
  const mintLamports = await params.connection.getMinimumBalanceForRentExemption(
    mintSpace,
  );

  const issuerAssetAccount = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    params.issuer,
    false,
    TOKEN_2022_PROGRAM_ID,
  );

  const instructions: TransactionInstruction[] = [
    // 1. Allocate the mint account (requires mint keypair signature).
    SystemProgram.createAccount({
      fromPubkey: params.issuer,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintSpace,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),

    // 2. Initialize the mint — decimals=0, authority=issuer, no freeze authority.
    createInitializeMint2Instruction(
      mintKeypair.publicKey,
      ASSET_MINT_DECIMALS,
      params.issuer,
      null,
      TOKEN_2022_PROGRAM_ID,
    ),

    // 3. Create the issuer's ATA for the new mint.
    createAssociatedTokenAccountIdempotentInstruction(
      params.issuer,
      issuerAssetAccount,
      params.issuer,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID,
    ),

    // 4. Mint the supply into the issuer's ATA.
    createMintToInstruction(
      mintKeypair.publicKey,
      issuerAssetAccount,
      params.issuer,
      params.assetAmount,
      [],
      TOKEN_2022_PROGRAM_ID,
    ),
  ];

  return {
    mintKeypair,
    issuerAssetAccount,
    instructions,
  };
}
