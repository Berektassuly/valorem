import { NextResponse } from "next/server";
import { createAuctionDraft } from "@/lib/marketplace/auction-store";
import {
  requireAuthSession,
} from "@/lib/marketplace/auth";
import { createAuctionDraftInputSchema } from "@/lib/marketplace/types";

export async function POST(request: Request) {
  try {
    const session = await requireAuthSession();
    const payload = createAuctionDraftInputSchema.parse(await request.json());
    const lot = await createAuctionDraft(session.walletAddress, payload);

    return NextResponse.json({ lot }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create the lot.",
      },
      {
        status:
          error instanceof Error && error.message === "Authentication required."
            ? 401
            : 400,
      },
    );
  }
}

