// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { loadRevealSecret, removeRevealSecret, saveRevealSecret } from "./secrets";

describe("reveal secret storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores and reloads wallet-scoped reveal secrets", () => {
    saveRevealSecret({
      cluster: "localnet",
      programId: "program-1",
      auctionAddress: "auction-1",
      walletAddress: "wallet-1",
      bidAmount: "125000000",
      salt: new Uint8Array(32).fill(9),
      createdAt: 1,
    });

    const secret = loadRevealSecret({
      cluster: "localnet",
      programId: "program-1",
      auctionAddress: "auction-1",
      walletAddress: "wallet-1",
    });

    expect(secret?.bidAmount).toBe(125000000n);
    expect(secret?.salt).toEqual(new Uint8Array(32).fill(9));
  });

  it("removes secrets by exact wallet and auction scope", () => {
    saveRevealSecret({
      cluster: "localnet",
      programId: "program-1",
      auctionAddress: "auction-1",
      walletAddress: "wallet-1",
      bidAmount: "125000000",
      salt: new Uint8Array(32).fill(9),
      createdAt: 1,
    });

    removeRevealSecret({
      cluster: "localnet",
      programId: "program-1",
      auctionAddress: "auction-1",
      walletAddress: "wallet-1",
    });

    expect(
      loadRevealSecret({
        cluster: "localnet",
        programId: "program-1",
        auctionAddress: "auction-1",
        walletAddress: "wallet-1",
      }),
    ).toBeNull();
  });
});
