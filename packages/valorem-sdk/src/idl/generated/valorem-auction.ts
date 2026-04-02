import {
  anchorAccountDiscriminator,
  anchorInstructionDiscriminator,
} from "../../discriminators.js";
import { VALOREM_AUCTION_PROGRAM_ID } from "../../constants.js";

export const valoremAuctionIdl = {
  address: VALOREM_AUCTION_PROGRAM_ID.toBase58(),
  metadata: {
    name: "valorem_auction",
    version: "0.1.0",
    spec: "manual-sdk-schema",
  },
  instructions: [
    "initialize_auction",
    "deposit_asset",
    "submit_commitment",
    "advance_to_reveal",
    "reveal_bid",
    "close_reveal",
    "record_compliance",
    "settle_candidate",
    "slash_unrevealed",
    "slash_candidate_and_advance",
    "claim_refund",
    "reclaim_unsold_asset",
    "withdraw_proceeds",
  ].map((name) => ({
    name,
    discriminator: Array.from(anchorInstructionDiscriminator(name)),
  })),
  accounts: ["Auction", "BidderState", "ComplianceRecord"].map((name) => ({
    name,
    discriminator: Array.from(anchorAccountDiscriminator(name)),
  })),
} as const;
