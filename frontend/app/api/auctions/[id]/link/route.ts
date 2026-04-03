import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { linkAuctionContract } from "@/lib/marketplace/auction-store";
import { requireAuthSession } from "@/lib/marketplace/auth";
import { linkAuctionContractInputSchema } from "@/lib/marketplace/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuthSession();
    const payload = linkAuctionContractInputSchema.parse(await request.json());
    new PublicKey(payload.contractAddress);

    const { id } = await context.params;
    const lot = await linkAuctionContract(id, session.walletAddress, payload);

    if (!lot) {
      return NextResponse.json(
        { error: "Auction draft not found for the authenticated wallet." },
        { status: 404 },
      );
    }

    return NextResponse.json({ lot });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to link the on-chain auction.",
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

