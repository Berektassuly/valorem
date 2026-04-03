import { MarketplaceView } from "@/components/views/marketplace-view";
import { listMarketplaceAuctions } from "@/lib/marketplace/auction-store";

export default async function MarketplacePage() {
  try {
    const lots = await listMarketplaceAuctions();
    return <MarketplaceView lots={lots} />;
  } catch {
    return <MarketplaceView lots={[]} hasDatabaseError />;
  }
}

