import { catalogAuctions } from "@/lib/catalog";

const fallbackProtocol = catalogAuctions[0]?.protocol;

function readBigInt(name: string, fallback: bigint) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
}

function readNumber(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const marketplaceProtocolDefaults = {
  reviewerAddress:
    process.env.NEXT_PUBLIC_VALOREM_DEFAULT_REVIEWER ??
    fallbackProtocol?.reviewer ??
    "",
  assetMint:
    process.env.NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_MINT ??
    fallbackProtocol?.assetMint ??
    "",
  paymentMint:
    process.env.NEXT_PUBLIC_VALOREM_DEFAULT_PAYMENT_MINT ??
    fallbackProtocol?.paymentMint ??
    "",
  depositAmount: readBigInt(
    "NEXT_PUBLIC_VALOREM_DEFAULT_DEPOSIT_AMOUNT",
    250_000_000n,
  ),
  reservePrice: readBigInt(
    "NEXT_PUBLIC_VALOREM_DEFAULT_RESERVE_PRICE",
    2_500_000_000n,
  ),
  assetAmount: readBigInt("NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_AMOUNT", 1n),
  biddingWindowSeconds: readNumber(
    "NEXT_PUBLIC_VALOREM_DEFAULT_BIDDING_WINDOW_SECONDS",
    24 * 60 * 60,
  ),
  revealWindowSeconds: readNumber(
    "NEXT_PUBLIC_VALOREM_DEFAULT_REVEAL_WINDOW_SECONDS",
    12 * 60 * 60,
  ),
  settlementWindowSeconds: readNumber(
    "NEXT_PUBLIC_VALOREM_DEFAULT_SETTLEMENT_WINDOW_SECONDS",
    24 * 60 * 60,
  ),
  maxBidders: readNumber("NEXT_PUBLIC_VALOREM_DEFAULT_MAX_BIDDERS", 16),
};

export function hasMarketplaceProtocolDefaults() {
  return Boolean(
    marketplaceProtocolDefaults.reviewerAddress &&
      marketplaceProtocolDefaults.assetMint &&
      marketplaceProtocolDefaults.paymentMint,
  );
}

