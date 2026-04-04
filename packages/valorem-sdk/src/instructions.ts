import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  type AccountMeta,
} from "@solana/web3.js";
import { ByteWriter } from "./bytes.js";
import { anchorInstructionDiscriminator, withDiscriminator } from "./discriminators.js";
import {
  VALOREM_AUCTION_PROGRAM_ID,
  VALOREM_TRANSFER_HOOK_PROGRAM_ID,
} from "./constants.js";
import {
  deriveAuctionPda,
  deriveAuctionVaultAddress,
  deriveBidderAssetAddress,
  deriveBidderStatePda,
  deriveComplianceRecordPda,
  deriveHookConfigPda,
  deriveTransferHookValidationPda,
  deriveTransferPermitPda,
} from "./pdas.js";
import type { ComplianceStatus, InitializeAuctionArgs, SlashReason } from "./types.js";

const AUCTION_DISCRIMINATORS = {
  initializeAuction: anchorInstructionDiscriminator("initialize_auction"),
  depositAsset: anchorInstructionDiscriminator("deposit_asset"),
  submitCommitment: anchorInstructionDiscriminator("submit_commitment"),
  advanceToReveal: anchorInstructionDiscriminator("advance_to_reveal"),
  revealBid: anchorInstructionDiscriminator("reveal_bid"),
  closeReveal: anchorInstructionDiscriminator("close_reveal"),
  recordCompliance: anchorInstructionDiscriminator("record_compliance"),
  settleCandidate: anchorInstructionDiscriminator("settle_candidate"),
  slashUnrevealed: anchorInstructionDiscriminator("slash_unrevealed"),
  slashCandidateAndAdvance: anchorInstructionDiscriminator("slash_candidate_and_advance"),
  claimRefund: anchorInstructionDiscriminator("claim_refund"),
  reclaimUnsoldAsset: anchorInstructionDiscriminator("reclaim_unsold_asset"),
  withdrawProceeds: anchorInstructionDiscriminator("withdraw_proceeds"),
} as const;

const COMPLIANCE_STATUS_INDEX: Record<ComplianceStatus, number> = {
  pending: 0,
  approved: 1,
  rejected: 2,
};

const SLASH_REASON_INDEX: Record<SlashReason, number> = {
  missedSettlementWindow: 0,
  rejectedCompliance: 1,
  expiredCompliance: 2,
};

function createInstruction(
  data: Uint8Array,
  keys: AccountMeta[],
  programId = VALOREM_AUCTION_PROGRAM_ID,
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(data),
  });
}

function encodeInitializeAuctionArgs(args: InitializeAuctionArgs): Uint8Array {
  return new ByteWriter()
    .writeBytes(args.auctionSeed)
    .writeU64(args.depositAmount)
    .writeU64(args.reservePrice)
    .writeU64(args.assetAmount)
    .writeI64(args.biddingEndAt)
    .writeI64(args.revealEndAt)
    .writeI64(args.settlementWindow)
    .writeU16(args.maxBidders)
    .toUint8Array();
}

export type InitializeAuctionInstructionParams = {
  issuer: PublicKey;
  reviewer: PublicKey;
  assetMint: PublicKey;
  paymentMint: PublicKey;
  issuerPaymentDestination: PublicKey;
  args: InitializeAuctionArgs;
  auction?: PublicKey;
  assetVault?: PublicKey;
  paymentVault?: PublicKey;
  hookConfig?: PublicKey;
  extraAccountMetaList?: PublicKey;
  transferHookProgram?: PublicKey;
  assetTokenProgram?: PublicKey;
  paymentTokenProgram?: PublicKey;
  tokenProgram?: PublicKey;
  associatedTokenProgram?: PublicKey;
  systemProgram?: PublicKey;
};

export function buildInitializeAuctionInstruction(
  params: InitializeAuctionInstructionParams,
): TransactionInstruction {
  const [auction] = params.auction
    ? [params.auction, 0]
    : deriveAuctionPda(params.issuer, params.args.auctionSeed);
  const assetTokenProgram =
    params.assetTokenProgram ?? params.tokenProgram ?? TOKEN_2022_PROGRAM_ID;
  const paymentTokenProgram =
    params.paymentTokenProgram ?? params.tokenProgram ?? TOKEN_2022_PROGRAM_ID;
  const assetVault =
    params.assetVault ??
    deriveAuctionVaultAddress(params.assetMint, auction, assetTokenProgram);
  const paymentVault =
    params.paymentVault ??
    deriveAuctionVaultAddress(params.paymentMint, auction, paymentTokenProgram);
  const hookConfig = params.hookConfig ?? deriveHookConfigPda(params.assetMint)[0];
  const extraAccountMetaList =
    params.extraAccountMetaList ?? deriveTransferHookValidationPda(params.assetMint)[0];

  return createInstruction(
    withDiscriminator(
      AUCTION_DISCRIMINATORS.initializeAuction,
      encodeInitializeAuctionArgs(params.args),
    ),
    [
      { pubkey: params.issuer, isSigner: true, isWritable: true },
      { pubkey: params.reviewer, isSigner: false, isWritable: false },
      { pubkey: params.assetMint, isSigner: false, isWritable: false },
      { pubkey: params.paymentMint, isSigner: false, isWritable: false },
      { pubkey: auction, isSigner: false, isWritable: true },
      { pubkey: assetVault, isSigner: false, isWritable: true },
      { pubkey: paymentVault, isSigner: false, isWritable: true },
      { pubkey: params.issuerPaymentDestination, isSigner: false, isWritable: false },
      { pubkey: hookConfig, isSigner: false, isWritable: true },
      { pubkey: extraAccountMetaList, isSigner: false, isWritable: true },
      {
        pubkey: params.transferHookProgram ?? VALOREM_TRANSFER_HOOK_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: assetTokenProgram, isSigner: false, isWritable: false },
      { pubkey: paymentTokenProgram, isSigner: false, isWritable: false },
      {
        pubkey: params.associatedTokenProgram ?? ASSOCIATED_TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: params.systemProgram ?? SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
  );
}

export function buildDepositAssetInstruction(params: {
  issuer: PublicKey;
  assetMint: PublicKey;
  auction: PublicKey;
  assetVault: PublicKey;
  issuerAssetAccount: PublicKey;
  assetTokenProgram?: PublicKey;
  tokenProgram?: PublicKey;
}): TransactionInstruction {
  const assetTokenProgram =
    params.assetTokenProgram ?? params.tokenProgram ?? TOKEN_2022_PROGRAM_ID;

  return createInstruction(withDiscriminator(AUCTION_DISCRIMINATORS.depositAsset), [
    { pubkey: params.issuer, isSigner: true, isWritable: true },
    { pubkey: params.assetMint, isSigner: false, isWritable: false },
    { pubkey: params.auction, isSigner: false, isWritable: true },
    { pubkey: params.assetVault, isSigner: false, isWritable: true },
    { pubkey: params.issuerAssetAccount, isSigner: false, isWritable: true },
    { pubkey: assetTokenProgram, isSigner: false, isWritable: false },
  ]);
}

export function buildSubmitCommitmentInstruction(params: {
  bidder: PublicKey;
  paymentMint: PublicKey;
  auction: PublicKey;
  commitment: Uint8Array;
  paymentVault: PublicKey;
  bidderPaymentAccount: PublicKey;
  bidderState?: PublicKey;
  paymentTokenProgram?: PublicKey;
  tokenProgram?: PublicKey;
  systemProgram?: PublicKey;
}): TransactionInstruction {
  const bidderState = params.bidderState ?? deriveBidderStatePda(params.auction, params.bidder)[0];
  const paymentTokenProgram =
    params.paymentTokenProgram ?? params.tokenProgram ?? TOKEN_2022_PROGRAM_ID;

  return createInstruction(
    withDiscriminator(
      AUCTION_DISCRIMINATORS.submitCommitment,
      new ByteWriter().writeBytes(params.commitment).toUint8Array(),
    ),
    [
      { pubkey: params.bidder, isSigner: true, isWritable: true },
      { pubkey: params.paymentMint, isSigner: false, isWritable: false },
      { pubkey: params.auction, isSigner: false, isWritable: true },
      { pubkey: bidderState, isSigner: false, isWritable: true },
      { pubkey: params.paymentVault, isSigner: false, isWritable: true },
      { pubkey: params.bidderPaymentAccount, isSigner: false, isWritable: true },
      { pubkey: paymentTokenProgram, isSigner: false, isWritable: false },
      {
        pubkey: params.systemProgram ?? SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
  );
}

export function buildAdvanceToRevealInstruction(params: {
  admin: PublicKey;
  auction: PublicKey;
}): TransactionInstruction {
  return createInstruction(withDiscriminator(AUCTION_DISCRIMINATORS.advanceToReveal), [
    { pubkey: params.admin, isSigner: true, isWritable: false },
    { pubkey: params.auction, isSigner: false, isWritable: true },
  ]);
}

export function buildRevealBidInstruction(params: {
  bidder: PublicKey;
  auction: PublicKey;
  bidAmount: bigint;
  salt: Uint8Array;
  bidderState?: PublicKey;
}): TransactionInstruction {
  const bidderState = params.bidderState ?? deriveBidderStatePda(params.auction, params.bidder)[0];
  const payload = new ByteWriter()
    .writeU64(params.bidAmount)
    .writeBytes(params.salt)
    .toUint8Array();

  return createInstruction(withDiscriminator(AUCTION_DISCRIMINATORS.revealBid, payload), [
    { pubkey: params.bidder, isSigner: true, isWritable: true },
    { pubkey: params.auction, isSigner: false, isWritable: true },
    { pubkey: bidderState, isSigner: false, isWritable: true },
  ]);
}

export function buildCloseRevealInstruction(params: {
  admin: PublicKey;
  auction: PublicKey;
  currentCandidateState: PublicKey;
}): TransactionInstruction {
  return createInstruction(withDiscriminator(AUCTION_DISCRIMINATORS.closeReveal), [
    { pubkey: params.admin, isSigner: true, isWritable: false },
    { pubkey: params.auction, isSigner: false, isWritable: true },
    { pubkey: params.currentCandidateState, isSigner: false, isWritable: true },
  ]);
}

export function buildRecordComplianceInstruction(params: {
  reviewer: PublicKey;
  bidder: PublicKey;
  auction: PublicKey;
  status: ComplianceStatus;
  attestationDigest: Uint8Array;
  expiresAt: bigint;
  bidderState?: PublicKey;
  complianceRecord?: PublicKey;
  systemProgram?: PublicKey;
}): TransactionInstruction {
  const bidderState = params.bidderState ?? deriveBidderStatePda(params.auction, params.bidder)[0];
  const complianceRecord =
    params.complianceRecord ?? deriveComplianceRecordPda(params.auction, params.bidder)[0];
  const payload = new ByteWriter()
    .writeU8(COMPLIANCE_STATUS_INDEX[params.status])
    .writeBytes(params.attestationDigest)
    .writeI64(params.expiresAt)
    .toUint8Array();

  return createInstruction(withDiscriminator(AUCTION_DISCRIMINATORS.recordCompliance, payload), [
    { pubkey: params.reviewer, isSigner: true, isWritable: true },
    { pubkey: params.bidder, isSigner: false, isWritable: false },
    { pubkey: params.auction, isSigner: false, isWritable: true },
    { pubkey: bidderState, isSigner: false, isWritable: true },
    { pubkey: complianceRecord, isSigner: false, isWritable: true },
    {
      pubkey: params.systemProgram ?? SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
  ]);
}

export function buildSettleCandidateInstruction(params: {
  bidder: PublicKey;
  assetMint: PublicKey;
  paymentMint: PublicKey;
  auction: PublicKey;
  paymentVault: PublicKey;
  bidderPaymentAccount: PublicKey;
  assetVault: PublicKey;
  bidderAssetAccount?: PublicKey;
  bidderState?: PublicKey;
  complianceRecord?: PublicKey;
  hookConfig?: PublicKey;
  extraAccountMetaList?: PublicKey;
  transferPermit?: PublicKey;
  transferHookProgram?: PublicKey;
  assetTokenProgram?: PublicKey;
  paymentTokenProgram?: PublicKey;
  tokenProgram?: PublicKey;
  systemProgram?: PublicKey;
}): TransactionInstruction {
  const bidderState = params.bidderState ?? deriveBidderStatePda(params.auction, params.bidder)[0];
  const complianceRecord =
    params.complianceRecord ?? deriveComplianceRecordPda(params.auction, params.bidder)[0];
  const bidderAssetAccount =
    params.bidderAssetAccount ?? deriveBidderAssetAddress(params.assetMint, params.bidder);
  const hookConfig = params.hookConfig ?? deriveHookConfigPda(params.assetMint)[0];
  const extraAccountMetaList =
    params.extraAccountMetaList ?? deriveTransferHookValidationPda(params.assetMint)[0];
  const transferPermit =
    params.transferPermit ??
    deriveTransferPermitPda(params.assetMint, params.assetVault, bidderAssetAccount)[0];
  const assetTokenProgram =
    params.assetTokenProgram ?? params.tokenProgram ?? TOKEN_2022_PROGRAM_ID;
  const paymentTokenProgram =
    params.paymentTokenProgram ?? params.tokenProgram ?? TOKEN_2022_PROGRAM_ID;

  return createInstruction(withDiscriminator(AUCTION_DISCRIMINATORS.settleCandidate), [
    { pubkey: params.bidder, isSigner: true, isWritable: true },
    { pubkey: params.assetMint, isSigner: false, isWritable: false },
    { pubkey: params.paymentMint, isSigner: false, isWritable: false },
    { pubkey: params.auction, isSigner: false, isWritable: true },
    { pubkey: bidderState, isSigner: false, isWritable: true },
    { pubkey: complianceRecord, isSigner: false, isWritable: false },
    { pubkey: params.paymentVault, isSigner: false, isWritable: true },
    { pubkey: params.bidderPaymentAccount, isSigner: false, isWritable: true },
    { pubkey: params.assetVault, isSigner: false, isWritable: true },
    { pubkey: bidderAssetAccount, isSigner: false, isWritable: true },
    { pubkey: hookConfig, isSigner: false, isWritable: false },
    { pubkey: extraAccountMetaList, isSigner: false, isWritable: true },
    { pubkey: transferPermit, isSigner: false, isWritable: true },
    {
      pubkey: params.transferHookProgram ?? VALOREM_TRANSFER_HOOK_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: assetTokenProgram, isSigner: false, isWritable: false },
    { pubkey: paymentTokenProgram, isSigner: false, isWritable: false },
    {
      pubkey: params.systemProgram ?? SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
  ]);
}

export function buildSlashUnrevealedInstruction(params: {
  admin: PublicKey;
  auction: PublicKey;
  bidderState: PublicKey;
}): TransactionInstruction {
  return createInstruction(withDiscriminator(AUCTION_DISCRIMINATORS.slashUnrevealed), [
    { pubkey: params.admin, isSigner: true, isWritable: false },
    { pubkey: params.auction, isSigner: false, isWritable: true },
    { pubkey: params.bidderState, isSigner: false, isWritable: true },
  ]);
}

export function buildSlashCandidateAndAdvanceInstruction(params: {
  admin: PublicKey;
  auction: PublicKey;
  currentBidderState: PublicKey;
  complianceRecord: PublicKey;
  nextCandidateState: PublicKey;
  reason: SlashReason;
}): TransactionInstruction {
  const payload = new ByteWriter()
    .writeU8(SLASH_REASON_INDEX[params.reason])
    .toUint8Array();

  return createInstruction(
    withDiscriminator(AUCTION_DISCRIMINATORS.slashCandidateAndAdvance, payload),
    [
      { pubkey: params.admin, isSigner: true, isWritable: false },
      { pubkey: params.auction, isSigner: false, isWritable: true },
      { pubkey: params.currentBidderState, isSigner: false, isWritable: true },
      { pubkey: params.complianceRecord, isSigner: false, isWritable: false },
      { pubkey: params.nextCandidateState, isSigner: false, isWritable: true },
    ],
  );
}

export function buildClaimRefundInstruction(params: {
  bidder: PublicKey;
  paymentMint: PublicKey;
  auction: PublicKey;
  paymentVault: PublicKey;
  bidderPaymentAccount: PublicKey;
  bidderState?: PublicKey;
  paymentTokenProgram?: PublicKey;
  tokenProgram?: PublicKey;
}): TransactionInstruction {
  const bidderState = params.bidderState ?? deriveBidderStatePda(params.auction, params.bidder)[0];
  const paymentTokenProgram =
    params.paymentTokenProgram ?? params.tokenProgram ?? TOKEN_2022_PROGRAM_ID;

  return createInstruction(withDiscriminator(AUCTION_DISCRIMINATORS.claimRefund), [
    { pubkey: params.bidder, isSigner: true, isWritable: true },
    { pubkey: params.paymentMint, isSigner: false, isWritable: false },
    { pubkey: params.auction, isSigner: false, isWritable: true },
    { pubkey: bidderState, isSigner: false, isWritable: true },
    { pubkey: params.paymentVault, isSigner: false, isWritable: true },
    { pubkey: params.bidderPaymentAccount, isSigner: false, isWritable: true },
    { pubkey: paymentTokenProgram, isSigner: false, isWritable: false },
  ]);
}

export function buildReclaimUnsoldAssetInstruction(params: {
  admin: PublicKey;
  assetMint: PublicKey;
  auction: PublicKey;
  assetVault: PublicKey;
  issuerAssetAccount: PublicKey;
  assetTokenProgram?: PublicKey;
  tokenProgram?: PublicKey;
}): TransactionInstruction {
  const assetTokenProgram =
    params.assetTokenProgram ?? params.tokenProgram ?? TOKEN_2022_PROGRAM_ID;

  return createInstruction(withDiscriminator(AUCTION_DISCRIMINATORS.reclaimUnsoldAsset), [
    { pubkey: params.admin, isSigner: true, isWritable: false },
    { pubkey: params.assetMint, isSigner: false, isWritable: false },
    { pubkey: params.auction, isSigner: false, isWritable: true },
    { pubkey: params.assetVault, isSigner: false, isWritable: true },
    { pubkey: params.issuerAssetAccount, isSigner: false, isWritable: true },
    { pubkey: assetTokenProgram, isSigner: false, isWritable: false },
  ]);
}

export function buildWithdrawProceedsInstruction(params: {
  issuer: PublicKey;
  paymentMint: PublicKey;
  auction: PublicKey;
  paymentVault: PublicKey;
  issuerPaymentDestination: PublicKey;
  amount: bigint;
  paymentTokenProgram?: PublicKey;
  tokenProgram?: PublicKey;
}): TransactionInstruction {
  const payload = new ByteWriter().writeU64(params.amount).toUint8Array();
  const paymentTokenProgram =
    params.paymentTokenProgram ?? params.tokenProgram ?? TOKEN_2022_PROGRAM_ID;

  return createInstruction(withDiscriminator(AUCTION_DISCRIMINATORS.withdrawProceeds, payload), [
    { pubkey: params.issuer, isSigner: true, isWritable: true },
    { pubkey: params.paymentMint, isSigner: false, isWritable: false },
    { pubkey: params.auction, isSigner: false, isWritable: true },
    { pubkey: params.paymentVault, isSigner: false, isWritable: true },
    { pubkey: params.issuerPaymentDestination, isSigner: false, isWritable: true },
    { pubkey: paymentTokenProgram, isSigner: false, isWritable: false },
  ]);
}
