import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  PublicKey,
  type Connection,
  type ParsedAccountData,
} from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { resolveAuctionInitializationAccounts } from "./auction-init";

const BPF_UPGRADEABLE_LOADER = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111",
);
const ISSUER_ADDRESS = "GXkumK7u3NJbTXGWg1JkAavBxGEdj3NFGFGQjcZk1sys";

function createParsedAccount(params: {
  owner: PublicKey;
  type: string;
  info?: Record<string, unknown>;
}) {
  return {
    owner: params.owner,
    data: {
      program:
        params.type === "program" ? "bpf-upgradeable-loader" : "spl-token",
      parsed: {
        type: params.type,
        info: params.info ?? {},
      },
      space: params.type === "mint" ? 82 : 165,
    } satisfies ParsedAccountData,
    executable: params.type === "program",
    lamports: 1,
    rentEpoch: 0,
    space: params.type === "mint" ? 82 : 165,
  };
}

function createConnectionMock(
  resolver: (address: string) => ReturnType<typeof createParsedAccount> | null,
) {
  return {
    getParsedAccountInfo: vi.fn(async (publicKey: PublicKey) => ({
      context: { slot: 1 },
      value: resolver(publicKey.toBase58()),
    })),
  } as unknown as Connection;
}

describe("resolveAuctionInitializationAccounts", () => {
  it("rejects payment addresses that are not mint accounts", async () => {
    const assetMintAddress = "6y6nyKZKU3Jzeps2sonMSKcwk5Y8ZndKyGKoE9pYNCXS";
    const paymentMintAddress = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const connection = createConnectionMock((address) => {
      if (address === assetMintAddress) {
        return createParsedAccount({
          owner: TOKEN_2022_PROGRAM_ID,
          type: "mint",
          info: { decimals: 6 },
        });
      }

      if (address === paymentMintAddress) {
        return createParsedAccount({
          owner: BPF_UPGRADEABLE_LOADER,
          type: "program",
        });
      }

      return null;
    });

    await expect(
      resolveAuctionInitializationAccounts({
        connection,
        cluster: "devnet",
        issuerAddress: ISSUER_ADDRESS,
        assetMintAddress,
        paymentMintAddress,
        auctionSeed: new Uint8Array(32).fill(7),
      }),
    ).rejects.toThrow("is not a token mint");
  });

  it("rejects asset mints that are not Token-2022", async () => {
    const assetMintAddress = "So11111111111111111111111111111111111111112";
    const paymentMintAddress = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    const connection = createConnectionMock((address) => {
      if (address === assetMintAddress || address === paymentMintAddress) {
        return createParsedAccount({
          owner: TOKEN_PROGRAM_ID,
          type: "mint",
          info: { decimals: 6 },
        });
      }

      return null;
    });

    await expect(
      resolveAuctionInitializationAccounts({
        connection,
        cluster: "devnet",
        issuerAddress: ISSUER_ADDRESS,
        assetMintAddress,
        paymentMintAddress,
        auctionSeed: new Uint8Array(32).fill(9),
      }),
    ).rejects.toThrow("must be Token-2022");
  });

  it("adds an ATA creation pre-instruction when the issuer payment account is missing", async () => {
    const assetMintAddress = "6y6nyKZKU3Jzeps2sonMSKcwk5Y8ZndKyGKoE9pYNCXS";
    const paymentMintAddress = "8BQJRE89EwG4Ew9jMZEvUyMdbC5sma6AsVzTdDEr1xgR";
    const connection = createConnectionMock((address) => {
      if (address === assetMintAddress || address === paymentMintAddress) {
        return createParsedAccount({
          owner: TOKEN_2022_PROGRAM_ID,
          type: "mint",
          info: { decimals: 6 },
        });
      }

      return null;
    });

    const result = await resolveAuctionInitializationAccounts({
      connection,
      cluster: "devnet",
      issuerAddress: ISSUER_ADDRESS,
      assetMintAddress,
      paymentMintAddress,
      auctionSeed: new Uint8Array(32).fill(3),
    });

    expect(result.preInstructions).toHaveLength(1);
  });
});
