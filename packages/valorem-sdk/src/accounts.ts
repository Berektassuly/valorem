import { ByteReader, ByteWriter } from "./bytes.js";
import { anchorAccountDiscriminator } from "./discriminators.js";
import {
  AUCTION_ACCOUNT_NAME,
  BIDDER_STATE_ACCOUNT_NAME,
  COMPLIANCE_RECORD_ACCOUNT_NAME,
  HOOK_CONFIG_ACCOUNT_NAME,
  TRANSFER_PERMIT_ACCOUNT_NAME,
} from "./constants.js";
import type {
  AuctionAccount,
  AuctionPhase,
  BidderStateAccount,
  ComplianceRecordAccount,
  ComplianceStatus,
  HookConfigAccount,
  RankedBid,
  TransferPermitAccount,
} from "./types.js";

const AUCTION_DISCRIMINATOR = anchorAccountDiscriminator(AUCTION_ACCOUNT_NAME);
const BIDDER_STATE_DISCRIMINATOR = anchorAccountDiscriminator(BIDDER_STATE_ACCOUNT_NAME);
const COMPLIANCE_RECORD_DISCRIMINATOR = anchorAccountDiscriminator(COMPLIANCE_RECORD_ACCOUNT_NAME);
const HOOK_CONFIG_DISCRIMINATOR = anchorAccountDiscriminator(HOOK_CONFIG_ACCOUNT_NAME);
const TRANSFER_PERMIT_DISCRIMINATOR = anchorAccountDiscriminator(TRANSFER_PERMIT_ACCOUNT_NAME);

const AUCTION_PHASES: AuctionPhase[] = ["bidding", "reveal", "settlement", "completed"];
const COMPLIANCE_STATUSES: ComplianceStatus[] = ["pending", "approved", "rejected"];

function assertDiscriminator(
  data: Uint8Array,
  discriminator: Uint8Array,
  label: string,
): ByteReader {
  const reader = new ByteReader(data);
  const seen = reader.readBytes(8);
  if (!Buffer.from(seen).equals(Buffer.from(discriminator))) {
    throw new Error(`Unexpected ${label} discriminator.`);
  }

  return reader;
}

function readAuctionPhase(reader: ByteReader): AuctionPhase {
  const phase = AUCTION_PHASES[reader.readU8()];
  if (!phase) {
    throw new Error("Unknown auction phase.");
  }

  return phase;
}

function readComplianceStatus(reader: ByteReader): ComplianceStatus {
  const status = COMPLIANCE_STATUSES[reader.readU8()];
  if (!status) {
    throw new Error("Unknown compliance status.");
  }

  return status;
}

function writeAuctionPhase(writer: ByteWriter, phase: AuctionPhase): void {
  writer.writeU8(AUCTION_PHASES.indexOf(phase));
}

function writeComplianceStatus(writer: ByteWriter, status: ComplianceStatus): void {
  writer.writeU8(COMPLIANCE_STATUSES.indexOf(status));
}

function readRankedBid(reader: ByteReader): RankedBid {
  return {
    bidder: reader.readPubkey(),
    amount: reader.readU64(),
    revealTimestamp: reader.readI64(),
    disqualified: reader.readBool(),
    settled: reader.readBool(),
  };
}

function writeRankedBid(writer: ByteWriter, rankedBid: RankedBid): void {
  writer
    .writePubkey(rankedBid.bidder)
    .writeU64(rankedBid.amount)
    .writeI64(rankedBid.revealTimestamp)
    .writeBool(rankedBid.disqualified)
    .writeBool(rankedBid.settled);
}

export function decodeAuctionAccount(data: Uint8Array): AuctionAccount {
  const reader = assertDiscriminator(data, AUCTION_DISCRIMINATOR, AUCTION_ACCOUNT_NAME);

  const auction: AuctionAccount = {
    issuer: reader.readPubkey(),
    reviewerAuthority: reader.readPubkey(),
    assetMint: reader.readPubkey(),
    paymentMint: reader.readPubkey(),
    assetVault: reader.readPubkey(),
    paymentVault: reader.readPubkey(),
    issuerPaymentDestination: reader.readPubkey(),
    transferHookConfig: reader.readPubkey(),
    transferHookValidation: reader.readPubkey(),
    auctionSeed: reader.readBytes(32),
    phase: readAuctionPhase(reader),
    bump: reader.readU8(),
    assetDeposited: reader.readBool(),
    hasSettledBidder: reader.readBool(),
    settledBidder: reader.readPubkey(),
    depositAmount: reader.readU64(),
    reservePrice: reader.readU64(),
    assetAmount: reader.readU64(),
    totalDepositsHeld: reader.readU64(),
    totalSlashed: reader.readU64(),
    totalProceeds: reader.readU64(),
    totalWithdrawn: reader.readU64(),
    biddingEndAt: reader.readI64(),
    revealEndAt: reader.readI64(),
    settlementWindow: reader.readI64(),
    activeSettlementStartedAt: reader.readI64(),
    maxBidders: reader.readU16(),
    registeredBidders: reader.readU16(),
    currentSettlementIndex: reader.readU16(),
    rankedBidders: [],
  };

  const rankedBiddersLength = reader.readU32();
  auction.rankedBidders = Array.from({ length: rankedBiddersLength }, () =>
    readRankedBid(reader),
  );

  return auction;
}

export function decodeBidderStateAccount(data: Uint8Array): BidderStateAccount {
  const reader = assertDiscriminator(data, BIDDER_STATE_DISCRIMINATOR, BIDDER_STATE_ACCOUNT_NAME);

  return {
    auction: reader.readPubkey(),
    bidder: reader.readPubkey(),
    commitment: reader.readBytes(32),
    commitmentSubmittedAt: reader.readI64(),
    bidAmount: reader.readU64(),
    revealTimestamp: reader.readI64(),
    depositAmount: reader.readU64(),
    rank: reader.readU16(),
    bump: reader.readU8(),
    depositPaid: reader.readBool(),
    revealed: reader.readBool(),
    settlementEligible: reader.readBool(),
    complianceApproved: reader.readBool(),
    settled: reader.readBool(),
    depositRefunded: reader.readBool(),
    depositSlashed: reader.readBool(),
  };
}

export function decodeComplianceRecordAccount(data: Uint8Array): ComplianceRecordAccount {
  const reader = assertDiscriminator(
    data,
    COMPLIANCE_RECORD_DISCRIMINATOR,
    COMPLIANCE_RECORD_ACCOUNT_NAME,
  );

  return {
    auction: reader.readPubkey(),
    bidder: reader.readPubkey(),
    reviewer: reader.readPubkey(),
    status: readComplianceStatus(reader),
    attestationDigest: reader.readBytes(32),
    reviewedAt: reader.readI64(),
    expiresAt: reader.readI64(),
    bump: reader.readU8(),
  };
}

export function decodeHookConfigAccount(data: Uint8Array): HookConfigAccount {
  const reader = assertDiscriminator(data, HOOK_CONFIG_DISCRIMINATOR, HOOK_CONFIG_ACCOUNT_NAME);

  return {
    authority: reader.readPubkey(),
    controller: reader.readPubkey(),
    mint: reader.readPubkey(),
    bump: reader.readU8(),
  };
}

export function decodeTransferPermitAccount(data: Uint8Array): TransferPermitAccount {
  const reader = assertDiscriminator(
    data,
    TRANSFER_PERMIT_DISCRIMINATOR,
    TRANSFER_PERMIT_ACCOUNT_NAME,
  );

  return {
    mint: reader.readPubkey(),
    sourceToken: reader.readPubkey(),
    destinationToken: reader.readPubkey(),
    authority: reader.readPubkey(),
    allowedAmount: reader.readU64(),
    remainingAmount: reader.readU64(),
    issuedAt: reader.readI64(),
    expiresAt: reader.readI64(),
    consumed: reader.readBool(),
    bump: reader.readU8(),
  };
}

export const __testUtils = {
  encodeAuctionAccount(account: AuctionAccount): Uint8Array {
    const writer = new ByteWriter();
    writer
      .writeBytes(AUCTION_DISCRIMINATOR)
      .writePubkey(account.issuer)
      .writePubkey(account.reviewerAuthority)
      .writePubkey(account.assetMint)
      .writePubkey(account.paymentMint)
      .writePubkey(account.assetVault)
      .writePubkey(account.paymentVault)
      .writePubkey(account.issuerPaymentDestination)
      .writePubkey(account.transferHookConfig)
      .writePubkey(account.transferHookValidation)
      .writeBytes(account.auctionSeed);
    writeAuctionPhase(writer, account.phase);
    writer
      .writeU8(account.bump)
      .writeBool(account.assetDeposited)
      .writeBool(account.hasSettledBidder)
      .writePubkey(account.settledBidder)
      .writeU64(account.depositAmount)
      .writeU64(account.reservePrice)
      .writeU64(account.assetAmount)
      .writeU64(account.totalDepositsHeld)
      .writeU64(account.totalSlashed)
      .writeU64(account.totalProceeds)
      .writeU64(account.totalWithdrawn)
      .writeI64(account.biddingEndAt)
      .writeI64(account.revealEndAt)
      .writeI64(account.settlementWindow)
      .writeI64(account.activeSettlementStartedAt)
      .writeU16(account.maxBidders)
      .writeU16(account.registeredBidders)
      .writeU16(account.currentSettlementIndex)
      .writeU32(account.rankedBidders.length);

    for (const bid of account.rankedBidders) {
      writeRankedBid(writer, bid);
    }

    return writer.toUint8Array();
  },
  encodeBidderStateAccount(account: BidderStateAccount): Uint8Array {
    return new ByteWriter()
      .writeBytes(BIDDER_STATE_DISCRIMINATOR)
      .writePubkey(account.auction)
      .writePubkey(account.bidder)
      .writeBytes(account.commitment)
      .writeI64(account.commitmentSubmittedAt)
      .writeU64(account.bidAmount)
      .writeI64(account.revealTimestamp)
      .writeU64(account.depositAmount)
      .writeU16(account.rank)
      .writeU8(account.bump)
      .writeBool(account.depositPaid)
      .writeBool(account.revealed)
      .writeBool(account.settlementEligible)
      .writeBool(account.complianceApproved)
      .writeBool(account.settled)
      .writeBool(account.depositRefunded)
      .writeBool(account.depositSlashed)
      .toUint8Array();
  },
  encodeComplianceRecordAccount(account: ComplianceRecordAccount): Uint8Array {
    const writer = new ByteWriter();
    writer
      .writeBytes(COMPLIANCE_RECORD_DISCRIMINATOR)
      .writePubkey(account.auction)
      .writePubkey(account.bidder)
      .writePubkey(account.reviewer);
    writeComplianceStatus(writer, account.status);
    writer
      .writeBytes(account.attestationDigest)
      .writeI64(account.reviewedAt)
      .writeI64(account.expiresAt)
      .writeU8(account.bump);
    return writer.toUint8Array();
  },
};
