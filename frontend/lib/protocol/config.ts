import { VALOREM_AUCTION_PROGRAM_ID } from "@valorem/sdk";

const rpcUrl =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

export const protocolCluster = cluster;
export const protocolRpcUrl = rpcUrl;
export const protocolMode = "rpc";

export const protocolChain =
  cluster === "mainnet-beta" ? "solana:mainnet" : "solana:devnet";

export const auctionProgramId = VALOREM_AUCTION_PROGRAM_ID.toBase58();
