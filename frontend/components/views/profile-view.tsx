import { AssetArtwork } from "@/components/asset-artwork";
import {
  ActionLink,
  MetricGrid,
  PageIntro,
  Panel,
  SectionHeading,
  Tag,
} from "@/components/ui";
import type { AuctionLot, AuthSession } from "@/lib/marketplace/types";
import {
  formatCalendarDate,
  formatLotStatus,
  formatWalletAddress,
} from "@/lib/marketplace/view-models";

export function ProfileView({
  session,
  lots,
  hasDatabaseError = false,
}: {
  session: AuthSession | null;
  lots: AuctionLot[];
  hasDatabaseError?: boolean;
}) {
  if (!session) {
    return (
      <div className="space-y-8">
        <PageIntro
          eyebrow="Profile / Protected"
          title="Sign in to view private assets."
          description="The profile route is reserved for authenticated wallets. After settlement completes, purchased lots disappear from the public marketplace and render only here for the winning address."
        />
        <Panel className="space-y-4">
          <p className="text-sm leading-6 text-muted">
            Connect your wallet and complete Sign-In With Solana from the header
            to unlock profile inventory.
          </p>
          <ActionLink href="/marketplace" tone="ghost">
            Return To Marketplace
          </ActionLink>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Profile / My assets"
        title="Purchased assets tied to your wallet."
        description="This private profile is filtered by the authenticated wallet address. Only lots with a completed status and a matching settled bidder are visible here."
        aside={
          <Panel className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <Tag tone="dark">Authenticated wallet</Tag>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                {formatWalletAddress(session.walletAddress)}
              </p>
            </div>
            <MetricGrid
              columns={2}
              items={[
                { label: "Owned assets", value: String(lots.length), accent: true },
                { label: "Visibility", value: "Private" },
                { label: "Filter", value: "Completed" },
                { label: "Winner", value: "Session-bound" },
              ]}
            />
          </Panel>
        }
      />

      {hasDatabaseError ? (
        <Panel tone="dark" className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
            Database configuration
          </p>
          <p className="text-sm leading-6 text-white/80">
            PostgreSQL is not configured yet, so the private asset inventory
            cannot be loaded.
          </p>
        </Panel>
      ) : null}

      {lots.length > 0 ? (
        <section className="grid gap-6 lg:grid-cols-2">
          {lots.map((lot) => (
            <Panel key={lot.id} className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-copper">
                    Ownership proof
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[-0.04em] text-ink">
                    {lot.title}
                  </h2>
                </div>
                <Tag tone="dark">{formatLotStatus(lot.status)}</Tag>
              </div>

              <AssetArtwork
                variant="schema"
                label="Owned asset"
                imageSrc={lot.imageBase64}
                imageAlt={lot.title}
                className="h-64 sm:h-72"
              />

              <MetricGrid
                columns={2}
                items={[
                  {
                    label: "Winner wallet",
                    value: formatWalletAddress(lot.settledBidder),
                    accent: true,
                  },
                  {
                    label: "Seller wallet",
                    value: formatWalletAddress(lot.issuerWallet),
                  },
                  {
                    label: "Contract",
                    value: formatWalletAddress(lot.contractAddress),
                  },
                  {
                    label: "Completed",
                    value: formatCalendarDate(lot.updatedAt),
                  },
                ]}
              />

              <p className="text-sm leading-6 text-muted">{lot.description}</p>

              <div className="flex flex-wrap gap-3">
                <ActionLink href={`/auctions/${lot.slug}`} tone="ghost">
                  View Record
                </ActionLink>
                <Tag tone="copper">{session.walletAddress}</Tag>
              </div>
            </Panel>
          ))}
        </section>
      ) : (
        <Panel className="space-y-4">
          <SectionHeading
            eyebrow="Private inventory"
            title="No completed assets yet"
            description="Lots will appear here once the protocol status is completed and the settled bidder matches your authenticated wallet."
          />
          <ActionLink href="/marketplace" tone="ghost">
            Browse Marketplace
          </ActionLink>
        </Panel>
      )}
    </div>
  );
}

