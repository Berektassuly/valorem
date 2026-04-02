import { PublicKey } from "@solana/web3.js";

export const VALOREM_AUCTION_PROGRAM_ID = new PublicKey(
  "CL8VHpgrWj3XSLFrSSnDdGTYadh3wgtcixaLvh39CWfe",
);

export const VALOREM_TRANSFER_HOOK_PROGRAM_ID = new PublicKey(
  "8ps8kraPz7i9XHLkUuvVQdfmEuR6MgT6MBw26Ye6EVSd",
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
