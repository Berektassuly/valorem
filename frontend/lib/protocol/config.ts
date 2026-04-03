import { VALOREM_AUCTION_PROGRAM_ID } from "@valorem/sdk";
import { publicEnv } from "@/lib/env";

const rpcUrl = publicEnv.NEXT_PUBLIC_SOLANA_RPC_URL;
const cluster = publicEnv.NEXT_PUBLIC_SOLANA_CLUSTER;

export const protocolCluster = cluster;
export const protocolRpcUrl = rpcUrl;
export const protocolMode = "rpc";

export const protocolChain =
  cluster === "mainnet-beta" ? "solana:mainnet" : "solana:devnet";

export const auctionProgramId = VALOREM_AUCTION_PROGRAM_ID.toBase58();
