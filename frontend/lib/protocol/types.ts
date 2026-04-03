import type {
  AuctionAccount,
  BidderStateAccount,
  ComplianceRecordAccount,
} from "@valorem/sdk";
import type { CatalogAuctionEntry } from "@/lib/catalog";

export type ProtocolMode = "rpc";
export type WalletMode = "disconnected" | "wallet-standard";

export type AuctionRuntimeState = {
  catalog: CatalogAuctionEntry;
  auctionAddress: string;
  auction: AuctionAccount;
  bidderStates: Record<string, BidderStateAccount>;
  complianceRecords: Record<string, ComplianceRecordAccount>;
  minIncrement: bigint;
  paymentSymbol: string;
  assetSymbol: string;
};

export type WalletActionKey =
  | "connect"
  | "submitCommitment"
  | "reveal"
  | "awaitReveal"
  | "awaitCompliance"
  | "settle"
  | "claimRefund"
  | "wait"
  | "advanceToReveal"
  | "closeReveal"
  | "recordCompliance"
  | "slashCandidate"
  | "slashUnrevealed"
  | "withdrawProceeds";

export type WalletAuctionState = {
  bidderState: BidderStateAccount | null;
  complianceRecord: ComplianceRecordAccount | null;
  actions: WalletActionKey[];
  isLeadingCandidate: boolean;
  isRefundEligible: boolean;
  currentBid: bigint | null;
};

export type TransactionFeedback = {
  status: "idle" | "success" | "error";
  message?: string;
  signature?: string;
};
