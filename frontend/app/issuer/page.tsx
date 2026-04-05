import { SellerStudioView } from "@/components/views/seller-studio-view";
import { getAuthSession } from "@/lib/marketplace/auth";
import { ensureMarketplaceSchema } from "@/lib/marketplace/db";
import { hasMarketplaceProtocolDefaults } from "@/lib/marketplace/config";

export default async function IssuerPage() {
  const session = await getAuthSession();
  const hasSession = Boolean(session);
  const hasProtocolDefaults = hasMarketplaceProtocolDefaults();
  let hasDatabaseError = false;

  try {
    await ensureMarketplaceSchema();
  } catch {
    hasDatabaseError = true;
  }

  return (
    <SellerStudioView
      hasSession={hasSession}
      hasDatabaseError={hasDatabaseError}
      hasProtocolDefaults={hasProtocolDefaults}
    />
  );
}
