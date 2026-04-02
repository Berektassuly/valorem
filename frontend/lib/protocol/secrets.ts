"use client";

import { bytesToHex, hexToBytes } from "@valorem/sdk";

const STORAGE_VERSION = "v1";
const STORAGE_KEY = `valorem:reveal-secrets:${STORAGE_VERSION}`;

export type StoredRevealSecret = {
  cluster: string;
  programId: string;
  auctionAddress: string;
  walletAddress: string;
  bidAmount: string;
  saltHex: string;
  createdAt: number;
};

type SecretMap = Record<string, StoredRevealSecret>;

function buildSecretKey(secret: {
  cluster: string;
  programId: string;
  auctionAddress: string;
  walletAddress: string;
}) {
  return [
    secret.cluster,
    secret.programId,
    secret.auctionAddress,
    secret.walletAddress,
  ].join(":");
}

function readAll(): SecretMap {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as SecretMap;
  } catch {
    return {};
  }
}

function writeAll(secrets: SecretMap) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(secrets));
}

export function saveRevealSecret(secret: Omit<StoredRevealSecret, "saltHex"> & { salt: Uint8Array }) {
  const secrets = readAll();
  const key = buildSecretKey(secret);
  secrets[key] = {
    ...secret,
    saltHex: bytesToHex(secret.salt),
  };
  writeAll(secrets);
}

export function loadRevealSecret(params: {
  cluster: string;
  programId: string;
  auctionAddress: string;
  walletAddress: string;
}) {
  const secret = readAll()[buildSecretKey(params)];
  if (!secret) {
    return null;
  }

  return {
    ...secret,
    bidAmount: BigInt(secret.bidAmount),
    salt: hexToBytes(secret.saltHex),
  };
}

export function listRevealSecrets(walletAddress?: string) {
  return Object.values(readAll())
    .filter((secret) => (walletAddress ? secret.walletAddress === walletAddress : true))
    .sort((left, right) => right.createdAt - left.createdAt);
}

export function removeRevealSecret(params: {
  cluster: string;
  programId: string;
  auctionAddress: string;
  walletAddress: string;
}) {
  const secrets = readAll();
  delete secrets[buildSecretKey(params)];
  writeAll(secrets);
}
