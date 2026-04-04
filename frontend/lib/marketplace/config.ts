import { publicEnv } from "@/lib/env";

export const marketplaceProtocolDefaults = {
  reviewerAddress: publicEnv.NEXT_PUBLIC_VALOREM_DEFAULT_REVIEWER,
  paymentMint: publicEnv.NEXT_PUBLIC_VALOREM_DEFAULT_PAYMENT_MINT,
  depositAmount: publicEnv.NEXT_PUBLIC_VALOREM_DEFAULT_DEPOSIT_AMOUNT,
  reservePrice: publicEnv.NEXT_PUBLIC_VALOREM_DEFAULT_RESERVE_PRICE,
  assetAmount: publicEnv.NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_AMOUNT,
  biddingWindowSeconds: publicEnv.NEXT_PUBLIC_VALOREM_DEFAULT_BIDDING_WINDOW_SECONDS,
  revealWindowSeconds: publicEnv.NEXT_PUBLIC_VALOREM_DEFAULT_REVEAL_WINDOW_SECONDS,
  settlementWindowSeconds:
    publicEnv.NEXT_PUBLIC_VALOREM_DEFAULT_SETTLEMENT_WINDOW_SECONDS,
  maxBidders: publicEnv.NEXT_PUBLIC_VALOREM_DEFAULT_MAX_BIDDERS,
};

export function hasMarketplaceProtocolDefaults() {
  return Boolean(
    marketplaceProtocolDefaults.reviewerAddress &&
      marketplaceProtocolDefaults.paymentMint,
  );
}
