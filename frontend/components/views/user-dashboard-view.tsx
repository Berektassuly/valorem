import { AssetArtwork } from "@/components/asset-artwork";
import {
  ActionLink,
  DataTable,
  MetricGrid,
  PageIntro,
  Panel,
  SectionHeading,
  Tag,
} from "@/components/ui";
import {
  dashboardActivity,
  dashboardBidRows,
  dashboardHighlights,
  dashboardPrimaryHolding,
} from "@/lib/site-data";

export function UserDashboardView() {
  const bidColumns = [
    { key: "asset", label: "My bids" },
    { key: "position", label: "Position", align: "right" as const },
    { key: "notional", label: "Notional", align: "right" as const },
    { key: "status", label: "Status", align: "right" as const },
  ];

  const bidRows = dashboardBidRows.map((row) => ({
    id: row.asset,
    asset: (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden border border-line">
          <AssetArtwork variant={row.artwork} className="h-full w-full border-0" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">
            {row.asset}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            {row.reference}
          </p>
        </div>
      </div>
    ),
    position: row.position,
    notional: row.notional,
    status: <Tag tone={row.tone}>{row.status}</Tag>,
  }));

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="User Dashboard"
        title="User dashboard"
        description="The personal account view stays aligned with the marketplace language: white field, strong black typography, narrow copper accents, and composed modular cards for bids, inventory, and watchlist positions."
        aside={
          <Panel className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <Tag tone="dark">Account</Tag>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                ID / VLR-2049
              </p>
            </div>
            <MetricGrid columns={2} items={dashboardHighlights} />
          </Panel>
        }
      />

      <Panel className="space-y-5">
        <SectionHeading
          eyebrow="Live activity"
          title="My bids"
          description="The table remains calm and sparse, with image chips and tiny monospace references doing most of the orientation work."
        />
        <DataTable columns={bidColumns} rows={bidRows} />
      </Panel>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Current assets"
          title="Inventory"
          description="A larger compositional field opens beneath the bid table, matching the stacked asset tiles from the Figma dashboard."
          action={<ActionLink href="/marketplace" tone="ghost">Explore More</ActionLink>}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.14fr)_340px]">
          <Panel className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-copper">
                  Current asset
                </p>
                <h2 className="mt-2 text-3xl font-semibold uppercase tracking-[-0.05em] text-ink">
                  {dashboardPrimaryHolding.title}
                </h2>
              </div>
              <Tag tone="dark">{dashboardPrimaryHolding.badge}</Tag>
            </div>

            <AssetArtwork
              variant={dashboardPrimaryHolding.artwork}
              label={dashboardPrimaryHolding.label}
              className="h-72 sm:h-[340px]"
            />
            <MetricGrid columns={3} items={dashboardPrimaryHolding.metrics} />
          </Panel>

          <div className="space-y-6">
            <Panel className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                  Watchlist asset
                </p>
                <Tag tone="copper">Priority</Tag>
              </div>
              <AssetArtwork variant="statue" className="h-56" label="Edition 03" />
              <div className="space-y-2 text-sm leading-6 text-muted">
                <p>Observational lot kept in review for the next supervised book.</p>
                <p>Access window remains limited to approved counterparties.</p>
              </div>
            </Panel>

            <Panel className="space-y-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                Account activity
              </p>
              <div className="space-y-3">
                {dashboardActivity.map((item) => (
                  <div key={item.title} className="border border-line bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">
                        {item.title}
                      </p>
                      <Tag tone={item.tone}>{item.status}</Tag>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.copy}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Panel className="space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
              Archive lot
            </p>
            <AssetArtwork variant="bear" className="h-56" label="Vaulted" />
            <p className="text-sm leading-6 text-muted">
              A compact monochrome tile keeps the lower grid aligned with the
              visual rhythm of the Figma reference.
            </p>
          </Panel>

          <Panel className="space-y-4 border-dashed bg-transparent">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
              Reserved slot
            </p>
            <div className="flex h-56 items-center justify-center border border-dashed border-line bg-surface/50">
              <div className="space-y-3 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                  Valorem secure storage
                </p>
                <p className="text-sm uppercase tracking-[0.14em] text-ink">
                  Awaiting allocation
                </p>
              </div>
            </div>
          </Panel>

          <Panel className="space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
              Quick actions
            </p>
            <div className="grid gap-3">
              <ActionLink href="/marketplace">Open Marketplace</ActionLink>
              <ActionLink href="/issuer" tone="ghost">
                Review Issuer Desk
              </ActionLink>
              <ActionLink href="/auctions/metropolitan-core-office-complex" tone="ink">
                Return To Live Lot
              </ActionLink>
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}
