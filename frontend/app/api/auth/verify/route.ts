import { ed25519 } from "@noble/curves/ed25519";
import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAuthSession,
  decodeBase64Bytes,
  writeAuthSession,
} from "@/lib/marketplace/auth";
import {
  consumeAuthChallengeRecord,
  getAuthChallengeRecord,
} from "@/lib/marketplace/auction-store";

const verifyRequestSchema = z.object({
  challengeId: z.string().uuid(),
  walletAddress: z.string().trim().min(32).max(64),
  signedMessageBase64: z.string().min(16),
  signatureBase64: z.string().min(16),
});

export async function POST(request: Request) {
  try {
    const payload = verifyRequestSchema.parse(await request.json());
    const publicKey = new PublicKey(payload.walletAddress);
    const challenge = await getAuthChallengeRecord(
      payload.challengeId,
      payload.walletAddress,
    );

    if (!challenge) {
      return NextResponse.json(
        { error: "The sign-in challenge is invalid or has expired." },
        { status: 401 },
      );
    }

    const signedMessage = decodeBase64Bytes(payload.signedMessageBase64);
    const signature = decodeBase64Bytes(payload.signatureBase64);
    const messageText = Buffer.from(signedMessage).toString("utf8");

    if (messageText !== challenge.message) {
      return NextResponse.json(
        { error: "The signed message does not match the issued challenge." },
        { status: 400 },
      );
    }

    const isValidSignature = ed25519.verify(
      signature,
      signedMessage,
      publicKey.toBytes(),
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Wallet signature verification failed." },
        { status: 401 },
      );
    }

    const consumed = await consumeAuthChallengeRecord(
      payload.challengeId,
      payload.walletAddress,
    );

    if (!consumed) {
      return NextResponse.json(
        { error: "The sign-in challenge has already been used." },
        { status: 409 },
      );
    }

    const session = createAuthSession(payload.walletAddress);
    const response = NextResponse.json({ session });
    writeAuthSession(response, session);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify the wallet signature.",
      },
      { status: 400 },
    );
  }
}
