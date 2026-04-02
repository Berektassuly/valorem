"use client";

import { useState } from "react";
import { useValoremApp } from "@/components/providers/valorem-app-provider";
import {
  ActionButton,
  DataTable,
  MetricGrid,
  PageIntro,
  Panel,
  SectionHeading,
  Tag,
} from "@/components/ui";
import { formatPhaseLabel, formatShortUsd, formatUsd } from "@/lib/protocol/format";
import { buildIssuerRows } from "@/lib/protocol/view-models";

export function IssuerTerminalView() {
  const {
    advanceToReveal,
    auctions,
    closeReveal,
    recordCompliance,
    slashCandidate,
    slashUnrevealed,
    withdrawProceeds,
  } = useValoremApp();
  const [selectedSlug, setSelectedSlug] = useState(auctions[0]?.catalog.slug ?? "");
  const issuerRows = buildIssuerRows(auctions);
  const activeAuction =
    auctions.find((auction) => auction.catalog.slug === selectedSlug) ?? auctions[0];
  const activeCandidate =
    activeAuction.auction.rankedBidders[activeAuction.auction.currentSettlementIndex];

  const columns = [
    { key: "program", label: "Program" },
    { key: "sector", label: "Sector" },
    { key: "notional", label: "Notional", align: "right" as const },
    { key: "stage", label: "Stage", align: "right" as const },
  ];

  const rows = issuerRows.map((row) => ({
    id: row.slug,
    program: (
      <button
        type="button"
        onClick={() => setSelectedSlug(row.slug)}
        className="space-y-1 text-left"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">
          {row.program}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          {row.issuer}
        </p>
      </button>
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
        description="Underwriting, phase control, compliance review, slashing, and proceeds withdrawal now sit on top of the protocol model instead of fixed mock values. The interface stays sparse and editorial while still exposing the key issuer workflows."
        aside={
          <Panel className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <Tag tone="dark">Primary desk</Tag>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                Issuer / {issuerRows.length}
              </p>
            </div>
            <MetricGrid
              columns={2}
              items={[
                { label: "Programs live", value: String(auctions.length) },
                {
                  label: "Settlement queue",
                  value: String(
                    auctions.filter((auction) => auction.auction.phase === "settlement").length,
                  ),
                },
                {
                  label: "Gross visible",
                  value: formatShortUsd(
                    auctions.reduce(
                      (sum, auction) =>
                        sum + (auction.auction.rankedBidders[0]?.amount ?? auction.auction.reservePrice),
                      0n,
                    ),
                  ),
                  accent: true,
                },
                { label: "Mode", value: "Issuer controls" },
              ]}
            />
          </Panel>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel className="space-y-5">
            <SectionHeading
              eyebrow="Program workflow"
              title="Launch controls"
              description="Select an auction from the pipeline and drive its next protocol transition from the compact issuer rail."
            />
            <MetricGrid
              columns={2}
              items={[
                { label: "Selected lot", value: activeAuction.catalog.lot },
                { label: "Current phase", value: formatPhaseLabel(activeAuction.auction.phase) },
                {
                  label: "Deposits held",
                  value: formatShortUsd(activeAuction.auction.totalDepositsHeld),
                },
                {
                  label: "Slashed",
                  value: formatShortUsd(activeAuction.auction.totalSlashed),
                  accent: true,
                },
              ]}
            />
            <div className="grid gap-3">
              <ActionButton
                onClick={() => {
                  void advanceToReveal(activeAuction.catalog.slug);
                }}
                className="w-full justify-between"
              >
                <span>Advance to reveal</span>
                <span>Bidding close</span>
              </ActionButton>
              <ActionButton
                tone="ink"
                onClick={() => {
                  void closeReveal(activeAuction.catalog.slug);
                }}
                className="w-full justify-between"
              >
                <span>Close reveal</span>
                <span>Rank bids</span>
              </ActionButton>
              <ActionButton
                tone="ghost"
                onClick={() => {
                  void withdrawProceeds(activeAuction.catalog.slug, 0n);
                }}
                className="w-full justify-between"
              >
                <span>Withdraw proceeds</span>
                <span>All available</span>
              </ActionButton>
            </div>
          </Panel>

          <Panel className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
              Underwriter memo
            </p>
            <p className="text-sm leading-6 text-ink">
              The issuer rail now manages actual phase transitions, approval
              records, and bidder reassignment paths instead of presentation-only
              placeholders.
            </p>
          </Panel>

          <Panel tone="dark" className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
              Available proceeds
            </p>
            <p className="text-4xl font-semibold uppercase tracking-[-0.05em] text-copper-soft">
              {formatShortUsd(
                activeAuction.auction.totalProceeds +
                  activeAuction.auction.totalSlashed -
                  activeAuction.auction.totalWithdrawn,
              )}
            </p>
            <p className="text-sm leading-6 text-white/80">
              Gross visible proceeds combine settled payment with any slashed
              deposits that are still withdrawable by the issuer.
            </p>
          </Panel>
        </div>

        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel className="space-y-4">
              <SectionHeading
                eyebrow="Offering setup"
                title="Current mandate"
                description="The selected lot carries live reserve, deposit, and participant metrics."
              />
              <MetricGrid
                columns={2}
                items={[
                  { label: "Asset class", value: activeAuction.catalog.category },
                  { label: "Asset units", value: activeAuction.auction.assetAmount.toString() },
                  {
                    label: "Reserve",
                    value: formatUsd(activeAuction.auction.reservePrice),
                    accent: true,
                  },
                  {
                    label: "Deposit",
                    value: formatUsd(activeAuction.auction.depositAmount),
                  },
                ]}
              />
            </Panel>

            <Panel className="space-y-4">
              <SectionHeading
                eyebrow="Funding summary"
                title="Structure"
                description="The second tile keeps the selected program’s current settlement metrics visible."
              />
              <MetricGrid
                columns={2}
                items={[
                  { label: "Issuer", value: activeAuction.catalog.issuerName },
                  { label: "Jurisdiction", value: activeAuction.catalog.location },
                  {
                    label: "Deposits held",
                    value: formatShortUsd(activeAuction.auction.totalDepositsHeld),
                  },
                  {
                    label: "Current bid",
                    value: formatShortUsd(
                      activeAuction.auction.rankedBidders[0]?.amount ??
                        activeAuction.auction.reservePrice,
                    ),
                    accent: true,
                  },
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
                Promote the selected book through its next protocol gate.
              </h2>
            </div>
            <Tag tone="copper">{formatPhaseLabel(activeAuction.auction.phase)}</Tag>
          </Panel>

          <Panel className="space-y-4">
            <SectionHeading
              eyebrow="Compliance blockers"
              title="Active candidate"
              description="Approval and reassignment stay local to the selected auction, with a direct path to slash and promote the next candidate when needed."
            />
            <div className="space-y-3">
              <div className="border border-line bg-surface p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">
                    {activeCandidate ? activeCandidate.bidder.toBase58() : "No candidate"}
                  </p>
                  <Tag tone={activeCandidate ? "copper" : "default"}>
                    {activeCandidate ? "Current candidate" : "Awaiting ranking"}
                  </Tag>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  The issuer can record approval, reject the candidate, or slash
                  and advance the settlement right to the next ranked bidder.
                </p>
              </div>

              {activeCandidate ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <ActionButton
                    onClick={() => {
                      void recordCompliance(
                        activeAuction.catalog.slug,
                        activeCandidate.bidder.toBase58(),
                        true,
                      );
                    }}
                    className="justify-between"
                  >
                    <span>Approve</span>
                    <span>KYC/AML</span>
                  </ActionButton>
                  <ActionButton
                    tone="ghost"
                    onClick={() => {
                      void recordCompliance(
                        activeAuction.catalog.slug,
                        activeCandidate.bidder.toBase58(),
                        false,
                      );
                    }}
                    className="justify-between"
                  >
                    <span>Reject</span>
                    <span>Fail review</span>
                  </ActionButton>
                  <ActionButton
                    tone="ink"
                    onClick={() => {
                      void slashCandidate(
                        activeAuction.catalog.slug,
                        activeCandidate.bidder.toBase58(),
                      );
                    }}
                    className="justify-between"
                  >
                    <span>Slash + advance</span>
                    <span>Fallback</span>
                  </ActionButton>
                </div>
              ) : null}

              <div className="space-y-3 border border-alert/20 bg-alert/8 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-alert">
                    Unrevealed bidder enforcement
                  </p>
                  <Tag tone="alert">Admin action</Tag>
                </div>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(activeAuction.bidderStates)
                    .filter(([, bidderState]) => !bidderState.revealed && !bidderState.depositSlashed)
                    .map(([walletAddress]) => (
                      <ActionButton
                        key={walletAddress}
                        tone="ghost"
                        onClick={() => {
                          void slashUnrevealed(activeAuction.catalog.slug, walletAddress);
                        }}
                      >
                        Slash {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                      </ActionButton>
                    ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="space-y-5">
            <SectionHeading
              eyebrow="Active programs"
              title="Issuer pipeline"
              description="The table remains visually disciplined, but selecting a row now updates the live control surfaces above."
            />
            <DataTable columns={columns} rows={rows} />
          </Panel>
        </div>
      </section>
    </div>
  );
}
