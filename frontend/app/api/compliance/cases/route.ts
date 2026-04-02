import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listComplianceCases,
  upsertComplianceCase,
} from "@/lib/protocol/compliance-store";

const createCaseSchema = z.object({
  auctionSlug: z.string(),
  auctionAddress: z.string(),
  bidderAddress: z.string(),
  reviewerAddress: z.string(),
  note: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const records = await listComplianceCases({
    auctionAddress: searchParams.get("auctionAddress") ?? undefined,
    bidderAddress: searchParams.get("bidderAddress") ?? undefined,
  });

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const payload = createCaseSchema.parse(await request.json());
  const record = await upsertComplianceCase({
    ...payload,
    status: "pending",
  });

  return NextResponse.json({ record }, { status: 201 });
}
