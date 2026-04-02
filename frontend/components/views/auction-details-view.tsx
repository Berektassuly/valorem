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
import type { AuctionDetail } from "@/lib/site-data";

export function AuctionDetailsView({ detail }: { detail: AuctionDetail }) {
  const ledgerColumns = [
    { key: "step", label: "Step" },
    { key: "window", label: "Window" },
    { key: "amount", label: "Amount", align: "right" as const },
    { key: "status", label: "Status", align: "right" as const },
  ];

  const ledgerRows = detail.ledger.map((row) => ({
    id: row.step,
    step: (
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">
          {row.step}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          {row.note}
        </p>
      </div>
    ),
    window: row.window,
    amount: row.amount,
    status: <Tag tone={row.tone}>{row.status}</Tag>,
  }));

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow={detail.eyebrow}
        title={detail.title}
        description={detail.summary}
        aside={
          <Panel className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <Tag tone="dark">{detail.status}</Tag>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                Room / {detail.room}
              </p>
            </div>
            <MetricGrid columns={2} items={detail.bidDeskMetrics} />
          </Panel>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_380px]">
        <Panel className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="copper">{detail.category}</Tag>
            <Tag>{detail.location}</Tag>
            <Tag>{detail.issuer}</Tag>
          </div>
          <AssetArtwork
            variant={detail.artwork}
            label={detail.heroLabel}
            className="h-72 sm:h-[430px]"
          />
          <MetricGrid items={detail.auctionMetrics} />
        </Panel>

        <div className="space-y-6">
          <Panel className="space-y-5">
            <SectionHeading
              eyebrow="Bid desk"
              title="Live auction control"
              description="The right rail stays compact and decisive, using sharp black and copper emphasis for the active book."
            />
            <div className="space-y-3">
              <div className="border border-line bg-surface-muted p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                  Clearing bid
                </p>
                <p className="mt-3 text-3xl font-semibold uppercase tracking-[-0.05em] text-copper">
                  {detail.clearingBid}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {detail.bidNotes.map((note) => (
                  <div key={note.label} className="border border-line bg-surface p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
                      {note.label}
                    </p>
                    <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink">
                      {note.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ActionLink href="/dashboard">Place Bid</ActionLink>
              <ActionLink href="/issuer" tone="ghost">
                Review Issuer
              </ActionLink>
            </div>
          </Panel>

          <Panel tone="dark" className="space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
              Congratulations
            </p>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="max-w-xs text-sm leading-6 text-white/80">
                  Settlement instructions remain intentionally simple and sharply
                  framed, echoing the black banner state from the design.
                </p>
              </div>
              <p className="text-4xl font-semibold uppercase tracking-[-0.05em] text-copper-soft">
                {detail.settlementAmount}
              </p>
            </div>
          </Panel>

          <Panel className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
              Issuer note
            </p>
            <p className="text-sm leading-6 text-ink">{detail.issuerNote}</p>
          </Panel>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
        <Panel className="space-y-5">
          <SectionHeading
            eyebrow="Settlement state"
            title={detail.secondaryTitle}
            description={detail.secondarySummary}
          />
          <AssetArtwork
            variant={detail.secondaryArtwork}
            label="Secondary certificate"
            className="h-64 sm:h-[300px]"
          />
          <MetricGrid columns={2} items={detail.secondaryMetrics} />
          <div className="flex flex-wrap gap-3">
            <ActionLink href="/dashboard" tone="ink">
              Wire Instructions
            </ActionLink>
            <ActionLink href="/marketplace" tone="ghost">
              Return To Desk
            </ActionLink>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel className="space-y-5">
            <SectionHeading
              eyebrow="Due diligence"
              title="Room notes"
              description="Legal, underwriting, and operational checkpoints are presented as controlled text blocks rather than feature-heavy widgets."
            />
            <div className="space-y-3">
              {detail.diligence.map((item) => (
                <div key={item} className="border border-line bg-surface p-4">
                  <p className="text-sm leading-6 text-ink">{item}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="space-y-5">
            <SectionHeading
              eyebrow="Settlement ledger"
              title="Post-auction flow"
              description="A severe table layout keeps the detail view feeling closer to an institutional terminal than a consumer product."
            />
            <DataTable columns={ledgerColumns} rows={ledgerRows} />
          </Panel>
        </div>
      </section>
    </div>
  );
}
