import { notFound } from "next/navigation";
import { AuctionDetailsView } from "@/components/views/auction-details-view";
import { getAuthSession } from "@/lib/marketplace/auth";
import { getAuctionBySlug } from "@/lib/marketplace/auction-store";

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getAuthSession();
  let lot = null;

  try {
    lot = await getAuctionBySlug(slug);
  } catch {
    notFound();
  }

  if (!lot) {
    notFound();
  }

  const isCompletedForAnotherWallet =
    lot.status === "completed" &&
    lot.settledBidder !== session?.walletAddress;
  const isDraftForAnotherWallet =
    lot.status === "draft" &&
    lot.issuerWallet !== session?.walletAddress;

  if (isCompletedForAnotherWallet || isDraftForAnotherWallet) {
    notFound();
  }

  return (
    <AuctionDetailsView
      lot={lot}
      isProfileOwner={lot.settledBidder === session?.walletAddress}
    />
  );
}
