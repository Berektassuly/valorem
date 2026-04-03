import { SellerStudioView } from "@/components/views/seller-studio-view";
import { getAuthSession } from "@/lib/marketplace/auth";
import { ensureMarketplaceSchema } from "@/lib/marketplace/db";
import { hasMarketplaceProtocolDefaults } from "@/lib/marketplace/config";

export default async function IssuerPage() {
  const session = await getAuthSession();

  try {
    await ensureMarketplaceSchema();
    return (
      <SellerStudioView
        hasSession={Boolean(session)}
        hasProtocolDefaults={hasMarketplaceProtocolDefaults()}
      />
    );
  } catch {
    return (
      <SellerStudioView
        hasSession={Boolean(session)}
        hasDatabaseError
        hasProtocolDefaults={hasMarketplaceProtocolDefaults()}
      />
    );
  }
}

