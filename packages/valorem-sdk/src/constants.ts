import { PublicKey } from "@solana/web3.js";

export const VALOREM_AUCTION_PROGRAM_ID = new PublicKey(
  "FG6nnyfyztJyn1Yzov6xHqfjRMJGTpHd6T5LwPJuruPS",
);

export const VALOREM_TRANSFER_HOOK_PROGRAM_ID = new PublicKey(
  "JCdjqNU5JEfuupjT6EAuBphhALhyiBRJy9E3fstwR1Yd",
);

export const AUCTION_SEED = "auction";
export const BIDDER_SEED = "bidder";
export const COMPLIANCE_SEED = "compliance";
export const HOOK_CONFIG_SEED = "config";
export const HOOK_PERMIT_SEED = "permit";
export const TRANSFER_HOOK_VALIDATION_SEED = "extra-account-metas";
export const COMMITMENT_DOMAIN = "valorem-commitment:v1";

export const AUCTION_ACCOUNT_NAME = "Auction";
export const BIDDER_STATE_ACCOUNT_NAME = "BidderState";
export const COMPLIANCE_RECORD_ACCOUNT_NAME = "ComplianceRecord";
export const HOOK_CONFIG_ACCOUNT_NAME = "HookConfig";
export const TRANSFER_PERMIT_ACCOUNT_NAME = "TransferPermit";
