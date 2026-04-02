import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertComplianceCase } from "@/lib/protocol/compliance-store";

const attestationSchema = z.object({
  auctionSlug: z.string(),
  auctionAddress: z.string(),
  bidderAddress: z.string(),
  reviewerAddress: z.string(),
  attestationDigest: z.string(),
  expiresAt: z.number(),
});

export async function POST(request: Request) {
  const payload = attestationSchema.parse(await request.json());
  const record = await upsertComplianceCase(payload);

  return NextResponse.json({ record });
}
