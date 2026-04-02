import {
  ActionLink,
  MetricGrid,
  PageIntro,
  Panel,
  SectionHeading,
  Tag,
  MarketplaceCard,
} from "@/components/ui";
import { marketPulse, marketplaceLots } from "@/lib/site-data";

const filterPills = [
  "All sectors",
  "Open books",
  "Closing soon",
  "Primary issuers",
  "Settlement ready",
];

export function MarketplaceView() {
  return (
    <div className="space-y-10">
      <PageIntro
        eyebrow="Marketplace / Explorer"
        title="Real world asset auction terminal."
        description="Browse live institutional books across core real estate, infrastructure, cultural inventory, and specialty issuances. Every surface is rendered as a high-fidelity presentation state only, preserving the severe editorial tone of the Valorem desk."
        aside={
          <Panel className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <Tag tone="dark">Live window</Tag>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                Session / 04
              </p>
            </div>
            <MetricGrid
              columns={2}
              items={[
                { label: "Open auctions", value: "06" },
                { label: "Volume shown", value: "$182M", accent: true },
                { label: "Settlement mode", value: "T+2" },
                { label: "Verified issuers", value: "18" },
              ]}
            />
            <p className="text-sm leading-6 text-muted">
              Premium listings are surfaced with conservative chrome, strong data
              hierarchy, and restrained copper signals for decisive actions.
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
            <Tag tone="copper">Closing soon</Tag>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {marketplaceLots.map((lot) => (
            <MarketplaceCard key={lot.slug} lot={lot} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <Panel className="space-y-5">
          <SectionHeading
            eyebrow="Market pulse"
            title="Current desk activity"
            description="A restrained secondary section preserves the negative space of the layout while carrying enough information density to feel like a premium trading interface."
            action={<ActionLink href="/dashboard" tone="ghost">View Dashboard</ActionLink>}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {marketPulse.map((pulse) => (
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
            description="Compact operational copy mirrors the small typographic fragments visible in the Figma compositions."
          />
          <div className="space-y-4">
            {[
              "Metropolitan Core Office Complex received two additional institutional indications above reserve.",
              "Prime Manhattan Equity Token #42 remains in supervised settlement with payment window held open.",
              "Logistics Hub Rotterdam April opened a secondary tranche preview for strategic accounts.",
            ].map((item) => (
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
