import { MarketplaceView } from "@/components/views/marketplace-view";
import { listMarketplaceAuctions } from "@/lib/marketplace/auction-store";

export default async function HomePage() {
  let lots: Awaited<ReturnType<typeof listMarketplaceAuctions>> = [];
  let hasDatabaseError = false;

  try {
    lots = await listMarketplaceAuctions();
  } catch {
    hasDatabaseError = true;
  }

  return <MarketplaceView lots={lots} hasDatabaseError={hasDatabaseError} />;
}
