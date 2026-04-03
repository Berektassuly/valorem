import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthChallenge } from "@/lib/marketplace/auth";
import { createAuthChallengeRecord } from "@/lib/marketplace/auction-store";

const nonceRequestSchema = z.object({
  walletAddress: z.string().trim().min(32).max(64),
});

export async function POST(request: Request) {
  try {
    const payload = nonceRequestSchema.parse(await request.json());
    new PublicKey(payload.walletAddress);

    const challenge = createAuthChallenge({
      walletAddress: payload.walletAddress,
      origin: new URL(request.url).origin,
    });

    await createAuthChallengeRecord({
      id: challenge.id,
      walletAddress: payload.walletAddress,
      nonce: challenge.nonce,
      message: challenge.message,
      expiresAt: challenge.expiresAt,
    });

    return NextResponse.json({
      challengeId: challenge.id,
      message: challenge.message,
      expiresAt: challenge.expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create an authentication challenge.",
      },
      { status: 400 },
    );
  }
}

