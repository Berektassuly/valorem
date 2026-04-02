import { notFound } from "next/navigation";
import { AuctionDetailsView } from "@/components/views/auction-details-view";
import { catalogAuctions, getCatalogAuction } from "@/lib/catalog";

export function generateStaticParams() {
  return catalogAuctions.map((lot) => ({ slug: lot.slug }));
}

export default async function AuctionDetailPage({
  params,
}: PageProps<"/auctions/[slug]">) {
  const { slug } = await params;
  const detail = getCatalogAuction(slug);

  if (!detail) {
    notFound();
  }

  return <AuctionDetailsView slug={slug} />;
}
