import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AuthSession } from "./types";

const SESSION_COOKIE_NAME = "valorem_session";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;
const CHALLENGE_DURATION_MINUTES = 10;

function getAuthSecret() {
  return process.env.VALOREM_AUTH_SECRET ?? "valorem-dev-secret-change-me";
}

function toBase64Url(value: Buffer | string) {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = normalized.length % 4;
  const padded =
    remainder === 0 ? normalized : `${normalized}${"=".repeat(4 - remainder)}`;

  return Buffer.from(padded, "base64");
}

function signValue(value: string) {
  return toBase64Url(createHmac("sha256", getAuthSecret()).update(value).digest());
}

function createSessionToken(session: AuthSession) {
  const payload = toBase64Url(JSON.stringify(session));
  return `${payload}.${signValue(payload)}`;
}

function verifySessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signValue(payload);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payload).toString("utf8")) as AuthSession;
    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function buildCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function createAuthChallenge(options: {
  walletAddress: string;
  origin: string;
}) {
  const nonce = toBase64Url(randomBytes(18));
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + CHALLENGE_DURATION_MINUTES * 60 * 1000,
  ).toISOString();

  return {
    id: randomUUID(),
    nonce,
    issuedAt,
    expiresAt,
    message: [
      "Valorem wants you to sign in with your Solana account:",
      options.walletAddress,
      "",
      "Sign in to create auction lots and view your private profile.",
      "",
      `URI: ${options.origin}`,
      "Version: 1",
      "Chain ID: solana",
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
      `Expiration Time: ${expiresAt}`,
    ].join("\n"),
  };
}

export function decodeBase64Bytes(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

export async function getAuthSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireAuthSession() {
  const session = await getAuthSession();
  if (!session) {
    throw new Error("Authentication required.");
  }
  return session;
}

export function createAuthSession(walletAddress: string): AuthSession {
  return {
    walletAddress,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(
      Date.now() + SESSION_DURATION_SECONDS * 1000,
    ).toISOString(),
  };
}

export function writeAuthSession(response: NextResponse, session: AuthSession) {
  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionToken(session),
    buildCookieOptions(SESSION_DURATION_SECONDS),
  );

  return session;
}

export function clearAuthSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", buildCookieOptions(0));
}
