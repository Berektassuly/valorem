import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const complianceCaseSchema = z.object({
  id: z.string(),
  auctionSlug: z.string(),
  auctionAddress: z.string(),
  bidderAddress: z.string(),
  reviewerAddress: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  note: z.string().default(""),
  attestationDigest: z.string().optional(),
  expiresAt: z.number().nullable().default(null),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ComplianceCaseRecord = z.infer<typeof complianceCaseSchema>;

const complianceCollectionSchema = z.array(complianceCaseSchema);

function getStorePath() {
  return path.join(process.cwd(), ".data", "compliance-cases.json");
}

async function ensureStore() {
  const filePath = getStorePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }
  return filePath;
}

export async function listComplianceCases(filters?: {
  auctionAddress?: string;
  bidderAddress?: string;
}) {
  const filePath = await ensureStore();
  const raw = await readFile(filePath, "utf8");
  const records = complianceCollectionSchema.parse(JSON.parse(raw));
  return records.filter((record) => {
    if (filters?.auctionAddress && record.auctionAddress !== filters.auctionAddress) {
      return false;
    }
    if (filters?.bidderAddress && record.bidderAddress !== filters.bidderAddress) {
      return false;
    }
    return true;
  });
}

async function writeComplianceCases(records: ComplianceCaseRecord[]) {
  const filePath = await ensureStore();
  await writeFile(filePath, JSON.stringify(records, null, 2), "utf8");
}

export async function upsertComplianceCase(
  input: Pick<
    ComplianceCaseRecord,
    "auctionSlug" | "auctionAddress" | "bidderAddress" | "reviewerAddress"
  > &
    Partial<
      Pick<
        ComplianceCaseRecord,
        "status" | "note" | "attestationDigest" | "expiresAt"
      >
    >,
) {
  const records = await listComplianceCases();
  const existing = records.find(
    (record) =>
      record.auctionAddress === input.auctionAddress &&
      record.bidderAddress === input.bidderAddress,
  );
  const now = Date.now();

  const nextRecord: ComplianceCaseRecord = existing
    ? {
        ...existing,
        ...input,
        status: input.status ?? existing.status,
        note: input.note ?? existing.note,
        attestationDigest: input.attestationDigest ?? existing.attestationDigest,
        expiresAt: input.expiresAt ?? existing.expiresAt ?? null,
        updatedAt: now,
      }
    : {
        id: `${input.auctionSlug}:${input.bidderAddress}`,
        auctionSlug: input.auctionSlug,
        auctionAddress: input.auctionAddress,
        bidderAddress: input.bidderAddress,
        reviewerAddress: input.reviewerAddress,
        status: input.status ?? "pending",
        note: input.note ?? "",
        attestationDigest: input.attestationDigest,
        expiresAt: input.expiresAt ?? null,
        createdAt: now,
        updatedAt: now,
      };

  const nextRecords = [
    ...records.filter((record) => record.id !== nextRecord.id),
    nextRecord,
  ].sort((left, right) => right.updatedAt - left.updatedAt);

  await writeComplianceCases(nextRecords);
  return nextRecord;
}
