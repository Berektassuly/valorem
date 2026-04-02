import { notFound } from "next/navigation";
import { AuctionDetailsView } from "@/components/views/auction-details-view";
import { getAuctionDetail, marketplaceLots } from "@/lib/site-data";

export function generateStaticParams() {
  return marketplaceLots.map((lot) => ({ slug: lot.slug }));
}

export default async function AuctionDetailPage({
  params,
}: PageProps<"/auctions/[slug]">) {
  const { slug } = await params;
  const detail = getAuctionDetail(slug);

  if (!detail) {
    notFound();
  }

  return <AuctionDetailsView detail={detail} />;
}
