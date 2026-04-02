import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertComplianceCase } from "@/lib/protocol/compliance-store";

const reviewSchema = z.object({
  auctionSlug: z.string(),
  auctionAddress: z.string(),
  bidderAddress: z.string(),
  reviewerAddress: z.string(),
  status: z.enum(["approved", "rejected", "pending"]),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  const payload = reviewSchema.parse(await request.json());
  const record = await upsertComplianceCase(payload);

  return NextResponse.json({ record });
}
