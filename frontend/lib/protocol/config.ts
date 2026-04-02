import { VALOREM_AUCTION_PROGRAM_ID } from "@valorem/sdk";

const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
const requestedMode = process.env.NEXT_PUBLIC_VALOREM_PROTOCOL_MODE;
const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "localnet";

export const protocolCluster = cluster;
export const protocolRpcUrl = rpcUrl;
export const protocolMode =
  requestedMode === "rpc" || requestedMode === "mock"
    ? requestedMode
    : process.env.NEXT_PUBLIC_SOLANA_RPC_URL
      ? "rpc"
      : "mock";

export const protocolChain =
  cluster === "devnet"
    ? "solana:devnet"
    : cluster === "mainnet-beta"
      ? "solana:mainnet"
      : "solana:localnet";

export const auctionProgramId = VALOREM_AUCTION_PROGRAM_ID.toBase58();
