import { Connection, PublicKey, type Commitment } from "@solana/web3.js";
import {
  decodeAuctionAccount,
  decodeBidderStateAccount,
  decodeComplianceRecordAccount,
} from "./accounts.js";
import { deriveBidderStatePda, deriveComplianceRecordPda } from "./pdas.js";
import type {
  AuctionAccount,
  AuctionSnapshot,
  BidderStateAccount,
  ComplianceRecordAccount,
} from "./types.js";

async function getDecodedAccount<T>(
  connection: Connection,
  address: PublicKey,
  decoder: (data: Uint8Array) => T,
  commitment?: Commitment,
): Promise<T | null> {
  const accountInfo = await connection.getAccountInfo(address, commitment);
  if (!accountInfo) {
    return null;
  }

  return decoder(accountInfo.data);
}

export class ValoremProtocolClient {
  constructor(
    readonly connection: Connection,
    readonly commitment?: Commitment,
  ) {}

  fetchAuction(address: PublicKey): Promise<AuctionAccount | null> {
    return getDecodedAccount(this.connection, address, decodeAuctionAccount, this.commitment);
  }

  fetchBidderState(
    auction: PublicKey,
    bidder: PublicKey,
  ): Promise<BidderStateAccount | null> {
    return getDecodedAccount(
      this.connection,
      deriveBidderStatePda(auction, bidder)[0],
      decodeBidderStateAccount,
      this.commitment,
    );
  }

  fetchComplianceRecord(
    auction: PublicKey,
    bidder: PublicKey,
  ): Promise<ComplianceRecordAccount | null> {
    return getDecodedAccount(
      this.connection,
      deriveComplianceRecordPda(auction, bidder)[0],
      decodeComplianceRecordAccount,
      this.commitment,
    );
  }

  async fetchAuctionSnapshot(
    auctionAddress: PublicKey,
    bidder?: PublicKey,
  ): Promise<AuctionSnapshot | null> {
    const auction = await this.fetchAuction(auctionAddress);
    if (!auction) {
      return null;
    }

    if (!bidder) {
      return {
        address: auctionAddress,
        auction,
      };
    }

    const [bidderState, complianceRecord] = await Promise.all([
      this.fetchBidderState(auctionAddress, bidder),
      this.fetchComplianceRecord(auctionAddress, bidder),
    ]);

    return {
      address: auctionAddress,
      auction,
      bidderState,
      complianceRecord,
    };
  }
}
