import type { PublicKey } from "@solana/web3.js";

export type AuctionPhase =
  | "bidding"
  | "reveal"
  | "settlement"
  | "completed";

export type ComplianceStatus = "pending" | "approved" | "rejected";

export type SlashReason =
  | "missedSettlementWindow"
  | "rejectedCompliance"
  | "expiredCompliance";

export type RankedBid = {
  bidder: PublicKey;
  amount: bigint;
  revealTimestamp: bigint;
  disqualified: boolean;
  settled: boolean;
};

export type AuctionAccount = {
  issuer: PublicKey;
  reviewerAuthority: PublicKey;
  assetMint: PublicKey;
  paymentMint: PublicKey;
  assetVault: PublicKey;
  paymentVault: PublicKey;
  issuerPaymentDestination: PublicKey;
  transferHookConfig: PublicKey;
  transferHookValidation: PublicKey;
  auctionSeed: Uint8Array;
  phase: AuctionPhase;
  bump: number;
  assetDeposited: boolean;
  hasSettledBidder: boolean;
  settledBidder: PublicKey;
  depositAmount: bigint;
  reservePrice: bigint;
  assetAmount: bigint;
  totalDepositsHeld: bigint;
  totalSlashed: bigint;
  totalProceeds: bigint;
  totalWithdrawn: bigint;
  biddingEndAt: bigint;
  revealEndAt: bigint;
  settlementWindow: bigint;
  activeSettlementStartedAt: bigint;
  maxBidders: number;
  registeredBidders: number;
  currentSettlementIndex: number;
  rankedBidders: RankedBid[];
};

export type BidderStateAccount = {
  auction: PublicKey;
  bidder: PublicKey;
  commitment: Uint8Array;
  commitmentSubmittedAt: bigint;
  bidAmount: bigint;
  revealTimestamp: bigint;
  depositAmount: bigint;
  rank: number;
  bump: number;
  depositPaid: boolean;
  revealed: boolean;
  settlementEligible: boolean;
  complianceApproved: boolean;
  settled: boolean;
  depositRefunded: boolean;
  depositSlashed: boolean;
};

export type ComplianceRecordAccount = {
  auction: PublicKey;
  bidder: PublicKey;
  reviewer: PublicKey;
  status: ComplianceStatus;
  attestationDigest: Uint8Array;
  reviewedAt: bigint;
  expiresAt: bigint;
  bump: number;
};

export type HookConfigAccount = {
  authority: PublicKey;
  controller: PublicKey;
  mint: PublicKey;
  bump: number;
};

export type TransferPermitAccount = {
  mint: PublicKey;
  sourceToken: PublicKey;
  destinationToken: PublicKey;
  authority: PublicKey;
  allowedAmount: bigint;
  remainingAmount: bigint;
  issuedAt: bigint;
  expiresAt: bigint;
  consumed: boolean;
  bump: number;
};

export type InitializeAuctionArgs = {
  auctionSeed: Uint8Array;
  depositAmount: bigint;
  reservePrice: bigint;
  assetAmount: bigint;
  biddingEndAt: bigint;
  revealEndAt: bigint;
  settlementWindow: bigint;
  maxBidders: number;
};

export type AuctionSnapshot = {
  address: PublicKey;
  auction: AuctionAccount;
  bidderState?: BidderStateAccount | null;
  complianceRecord?: ComplianceRecordAccount | null;
};
