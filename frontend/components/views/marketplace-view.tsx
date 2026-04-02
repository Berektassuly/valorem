"use client";

import {
  ActionLink,
  MetricGrid,
  PageIntro,
  Panel,
  SectionHeading,
  Tag,
  MarketplaceCard,
} from "@/components/ui";
import { useValoremApp } from "@/components/providers/valorem-app-provider";
import { marketplaceDeskNotes } from "@/lib/catalog";
import { buildMarketplaceLots } from "@/lib/protocol/view-models";

const filterPills = [
  "All sectors",
  "Open books",
  "Closing soon",
  "Settlement queue",
  "Refund eligible",
];

export function MarketplaceView() {
  const { activeAddress, auctions } = useValoremApp();
  const lots = buildMarketplaceLots(auctions, activeAddress);
  const settlementCount = auctions.filter((auction) => auction.auction.phase === "settlement").length;
  const closingSoonCount = auctions.filter((auction) => auction.auction.phase === "bidding").length;
  const totalVisibleVolume = auctions.reduce(
    (sum, auction) => sum + (auction.auction.rankedBidders[0]?.amount ?? auction.auction.reservePrice),
    0n,
  );

  return (
    <div className="space-y-10">
      <PageIntro
        eyebrow="Marketplace / Explorer"
        title="Real world asset auction terminal."
        description="Browse live commit-reveal books across core real estate, infrastructure, culture-linked inventory, and specialty rights. The editorial shell stays intact, but the cards, rails, and wallet prompts now read from protocol state rather than static mock copy."
        aside={
          <Panel className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <Tag tone="dark">Live protocol</Tag>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                Session / 06
              </p>
            </div>
            <MetricGrid
              columns={2}
              items={[
                { label: "Open auctions", value: String(auctions.length) },
                { label: "Visible volume", value: `$${(Number(totalVisibleVolume) / 1_000_000_000_000).toFixed(1)}M`, accent: true },
                { label: "Settlement queue", value: String(settlementCount) },
                { label: "Closing books", value: String(closingSoonCount) },
              ]}
            />
            <p className="text-sm leading-6 text-muted">
              Wallet actions are phase-aware, reveal secrets are stored locally per auction,
              and settlement paths remain gated by issuer-side compliance approval.
            </p>
          </Panel>
        }
      />

      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 border-y border-line/70 py-4">
          {filterPills.map((pill) => (
            <Tag key={pill}>{pill}</Tag>
          ))}
          <div className="ml-auto flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-muted">
            <span>Sort</span>
            <Tag tone="copper">Protocol priority</Tag>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {lots.map((lot) => (
            <MarketplaceCard key={lot.slug} lot={lot} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <Panel className="space-y-5">
          <SectionHeading
            eyebrow="Market pulse"
            title="Current desk activity"
            description="The secondary section is still sparse and editorial, but the metrics now track actual auction phases, deposits held, and settlement queues."
            action={
              <ActionLink href="/dashboard" tone="ghost">
                View Dashboard
              </ActionLink>
            }
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: "Closing windows",
                badge: `${closingSoonCount} active`,
                copy: "Bidding books remain open until the reveal transition is advanced, with deposits already escrowed for committed participants.",
                tone: "copper" as const,
              },
              {
                title: "Issuer review",
                badge: `${settlementCount} in queue`,
                copy: "Settlement candidates are visible, but ownership is still blocked until the issuer records compliance approval.",
                tone: "dark" as const,
              },
              {
                title: "Refund gating",
                badge: "Fallback aware",
                copy: "Revealed non-winning bidders only recover deposits after they are no longer viable fallback candidates.",
                tone: "default" as const,
              },
              {
                title: "Wallet mode",
                badge: activeAddress ? "Connected" : "Standby",
                copy: "Users can connect a wallet or use the built-in demo wallet to exercise the full commit, reveal, settlement, and refund flow locally.",
                tone: "copper" as const,
              },
            ].map((pulse) => (
              <div key={pulse.title} className="border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                    {pulse.title}
                  </p>
                  <Tag tone={pulse.tone}>{pulse.badge}</Tag>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{pulse.copy}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-5" tone="muted">
          <SectionHeading
            eyebrow="Clearing tape"
            title="Desk notes"
            description="Protocol-aware notes stay close to the original small-format composition without turning into a feed-heavy product surface."
          />
          <div className="space-y-4">
            {marketplaceDeskNotes.map((item) => (
              <div key={item} className="border border-line bg-surface px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                  Desk memo
                </p>
                <p className="mt-2 text-sm leading-6 text-ink">{item}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}
