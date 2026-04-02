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
  issuerFlaggedItems,
  issuerProgramMetrics,
  issuerTableRows,
  issuerWorkflowMetrics,
} from "@/lib/site-data";

export function IssuerTerminalView() {
  const columns = [
    { key: "program", label: "Program" },
    { key: "sector", label: "Sector" },
    { key: "notional", label: "Notional", align: "right" as const },
    { key: "stage", label: "Stage", align: "right" as const },
  ];

  const rows = issuerTableRows.map((row) => ({
    id: row.program,
    program: (
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">
          {row.program}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          {row.issuer}
        </p>
      </div>
    ),
    sector: row.sector,
    notional: row.notional,
    stage: <Tag tone={row.tone}>{row.stage}</Tag>,
  }));

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Issuer Terminal"
        title="Issuer terminal"
        description="Valorem’s issuer workspace keeps the composition intentionally sparse: underwriting data, launch controls, and compliance blockers appear as hard-edged modules instead of product-heavy dashboards."
        aside={
          <Panel className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <Tag tone="dark">Primary desk</Tag>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                Issuer / 12
              </p>
            </div>
            <MetricGrid columns={2} items={issuerWorkflowMetrics} />
          </Panel>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel className="space-y-5">
            <SectionHeading
              eyebrow="Program workflow"
              title="Launch controls"
              description="A narrow left rail keeps the operational actions close without competing with the main issuance canvas."
            />
            <MetricGrid columns={2} items={issuerProgramMetrics} />
            <ActionLink href="/auctions/metropolitan-core-office-complex">
              Publish Preview
            </ActionLink>
          </Panel>

          <Panel className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
              Underwriter memo
            </p>
            <p className="text-sm leading-6 text-ink">
              Sequence the launch window after compliance release, maintain the
              restrained editorial surface, and keep all commercial figures
              presented as fixed mock values.
            </p>
          </Panel>

          <Panel tone="dark" className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
              Gross proceeds
            </p>
            <p className="text-4xl font-semibold uppercase tracking-[-0.05em] text-copper-soft">
              155,000
            </p>
            <p className="text-sm leading-6 text-white/80">
              This black-panel highlight directly echoes the emphasized monetary
              block in the Figma terminal.
            </p>
          </Panel>
        </div>

        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel className="space-y-4">
              <SectionHeading
                eyebrow="Offering setup"
                title="Current mandate"
                description="Core issuance inputs shown as a concise briefing module."
              />
              <MetricGrid
                columns={2}
                items={[
                  { label: "Asset class", value: "Core office" },
                  { label: "Token supply", value: "5,000" },
                  { label: "Opening reserve", value: "$45.0M", accent: true },
                  { label: "Settlement mode", value: "Escrow" },
                ]}
              />
            </Panel>

            <Panel className="space-y-4">
              <SectionHeading
                eyebrow="Funding summary"
                title="Structure"
                description="The second tile balances the composition with similarly weighted data and no excess ornament."
              />
              <MetricGrid
                columns={2}
                items={[
                  { label: "Issuer", value: "Helix Advisory" },
                  { label: "Jurisdiction", value: "Delaware" },
                  { label: "Coupon profile", value: "None" },
                  { label: "Preview status", value: "Ready", accent: true },
                ]}
              />
            </Panel>
          </div>

          <Panel tone="dark" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
                Launch action
              </p>
              <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[-0.04em] text-white">
                Send auction preview to the desk.
              </h2>
            </div>
            <ActionLink href="/marketplace" tone="copper">
              Launch Preview
            </ActionLink>
          </Panel>

          <Panel className="space-y-4">
            <SectionHeading
              eyebrow="Compliance blockers"
              title="Flagged items"
              description="Soft red warning treatment remains restrained and serious rather than alarmist."
            />
            <div className="space-y-3">
              {issuerFlaggedItems.map((item) => (
                <div
                  key={item.title}
                  className="border border-alert/20 bg-alert/8 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-alert">
                      {item.title}
                    </p>
                    <Tag tone="alert">{item.status}</Tag>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink">{item.copy}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="space-y-5">
            <SectionHeading
              eyebrow="Active programs"
              title="Issuer pipeline"
              description="A calm data table finishes the page with the same white-space discipline shown in the source design."
            />
            <DataTable columns={columns} rows={rows} />
          </Panel>
        </div>
      </section>
    </div>
  );
}
