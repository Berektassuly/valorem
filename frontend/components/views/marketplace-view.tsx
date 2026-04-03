import {
  ActionLink,
  MetricGrid,
  PageIntro,
  Panel,
  SectionHeading,
  Tag,
  MarketplaceCard,
} from "@/components/ui";
import type { AuctionLot } from "@/lib/marketplace/types";
import { buildMarketplaceCardLot } from "@/lib/marketplace/view-models";

type MarketplaceViewProps = {
  lots: AuctionLot[];
  hasDatabaseError?: boolean;
};

export function MarketplaceView({
  lots,
  hasDatabaseError = false,
}: MarketplaceViewProps) {
  const settlementCount = lots.filter((lot) => lot.status === "settlement").length;
  const revealCount = lots.filter((lot) => lot.status === "reveal").length;
  const biddingCount = lots.filter((lot) => lot.status === "bidding").length;
  const cards = lots.map(buildMarketplaceCardLot);

  return (
    <div className="space-y-10">
      <PageIntro
        eyebrow="Marketplace / Dynamic lots"
        title="Real world asset auction marketplace."
        description="The public storefront is now sourced from PostgreSQL rather than a hardcoded catalog. Active lots remain visible while completed settlements are filtered out and moved into the winning wallet’s private profile."
        aside={
          <Panel className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <Tag tone="dark">Live marketplace</Tag>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                Lots / {lots.length}
              </p>
            </div>
            <MetricGrid
              columns={2}
              items={[
                { label: "Visible lots", value: String(lots.length), accent: true },
                { label: "Bidding", value: String(biddingCount) },
                { label: "Reveal", value: String(revealCount) },
                { label: "Settlement", value: String(settlementCount) },
              ]}
            />
            <p className="text-sm leading-6 text-muted">
              Sign in with Solana to create lots and unlock the private profile
              route for purchased inventory.
            </p>
          </Panel>
        }
      />

      {hasDatabaseError ? (
        <Panel tone="dark" className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
            Database configuration
          </p>
          <p className="text-sm leading-6 text-white/80">
            The marketplace could not reach PostgreSQL. Add `DATABASE_URL` and
            reload to enable dynamic lots, profile filtering, and authenticated
            creation.
          </p>
        </Panel>
      ) : null}

      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 border-y border-line/70 py-4">
          <Tag>Database first</Tag>
          <Tag>Base64 images</Tag>
          <Tag>SIWS protected</Tag>
          <Tag tone="copper">Completed lots hidden</Tag>
          <div className="ml-auto">
            <ActionLink href="/issuer" tone="ghost">
              Create A Lot
            </ActionLink>
          </div>
        </div>

        {cards.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <MarketplaceCard key={card.slug} lot={card} />
            ))}
          </div>
        ) : (
          <Panel className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
              No active lots
            </p>
            <p className="text-sm leading-6 text-muted">
              No linked auctions are currently visible. Sign in and create the
              first lot to seed the marketplace.
            </p>
          </Panel>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_360px]">
        <Panel className="space-y-5">
          <SectionHeading
            eyebrow="Display logic"
            title="Public by default, private on completion"
            description="The storefront now reflects database-level filtering. Once settlement completes, the lot disappears from this surface and becomes visible only inside the authenticated winner’s profile."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: "Storefront query",
                badge: "status != completed",
                copy: "Marketplace reads only active lots so completed inventory is removed instantly after the cached protocol status updates.",
              },
              {
                title: "Profile query",
                badge: "winner scoped",
                copy: "The profile route loads only lots where status is completed and the settled bidder matches the authenticated wallet.",
              },
              {
                title: "Create flow",
                badge: "DB -> chain -> link",
                copy: "New lots are stored in Postgres first, initialized on Solana second, then linked back to the database record with the auction address.",
              },
              {
                title: "Media storage",
                badge: "Base64 in Postgres",
                copy: "Images remain inside the relational model for MVP speed, avoiding external object storage while keeping the app deployable as a compact full-stack service.",
              },
            ].map((item) => (
              <div key={item.title} className="border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                    {item.title}
                  </p>
                  <Tag tone="copper">{item.badge}</Tag>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{item.copy}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel tone="muted" className="space-y-5">
          <SectionHeading
            eyebrow="Next step"
            title="Seller studio"
            description="Lot creation now lives behind Sign-In With Solana and uses the connected wallet both for the authenticated session and the on-chain initialization transaction."
            action={
              <ActionLink href="/issuer" tone="ink">
                Open Seller Studio
              </ActionLink>
            }
          />
          <div className="space-y-4">
            {[
              "Connect Phantom or another Wallet Standard wallet.",
              "Sign the nonce challenge to mint an authenticated session cookie.",
              "Upload an image, write the title and description, and initialize the auction on chain.",
            ].map((item) => (
              <div key={item} className="border border-line bg-surface px-4 py-3">
                <p className="text-sm leading-6 text-ink">{item}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

