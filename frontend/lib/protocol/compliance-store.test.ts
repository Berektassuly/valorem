import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listComplianceCases, upsertComplianceCase } from "./compliance-store";

let tempDir = "";
let originalCwd = "";

describe("compliance store", () => {
  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await mkdtemp(path.join(os.tmpdir(), "valorem-compliance-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("creates and updates compliance cases in the local json store", async () => {
    const created = await upsertComplianceCase({
      auctionSlug: "prime-manhattan-equity-token-42",
      auctionAddress: "auction-1",
      bidderAddress: "wallet-1",
      reviewerAddress: "reviewer-1",
      status: "pending",
    });

    expect(created.status).toBe("pending");

    await upsertComplianceCase({
      auctionSlug: "prime-manhattan-equity-token-42",
      auctionAddress: "auction-1",
      bidderAddress: "wallet-1",
      reviewerAddress: "reviewer-1",
      status: "approved",
      note: "Manual review completed.",
      attestationDigest: "digest-1",
      expiresAt: Date.now() + 10_000,
    });

    const records = await listComplianceCases({ auctionAddress: "auction-1" });

    expect(records).toHaveLength(1);
    expect(records[0]?.status).toBe("approved");
    expect(records[0]?.attestationDigest).toBe("digest-1");
  });
});
