"use client";

import { AssetArtwork } from "@/components/asset-artwork";
import { AuctionActionPanel } from "@/components/protocol/auction-action-panel";
import { useValoremApp } from "@/components/providers/valorem-app-provider";
import {
  ActionLink,
  DataTable,
  MetricGrid,
  PageIntro,
  Panel,
  SectionHeading,
  Tag,
} from "@/components/ui";
import { formatCountDown, formatPhaseLabel, formatShortUsd, formatUsd } from "@/lib/protocol/format";
import { buildAuctionLedger } from "@/lib/protocol/view-models";

export function AuctionDetailsView({ slug }: { slug: string }) {
  const { getAuction, getWalletAuctionState } = useValoremApp();
  const auction = getAuction(slug);

  if (!auction) {
    return null;
  }

  const walletState = getWalletAuctionState(slug);
  const currentBid = walletState.currentBid ?? auction.auction.reservePrice;
  const ledgerColumns = [
    { key: "step", label: "Step" },
    { key: "window", label: "Window" },
    { key: "amount", label: "Amount", align: "right" as const },
    { key: "status", label: "Status", align: "right" as const },
  ];
  const ledgerRows = buildAuctionLedger(auction).map((row) => ({
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
        eyebrow={auction.catalog.editorial.eyebrow}
        title={auction.catalog.title}
        description={auction.catalog.editorial.summary}
        aside={
          <Panel className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <Tag tone="dark">{formatPhaseLabel(auction.auction.phase)}</Tag>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                Auction / {auction.catalog.lot}
              </p>
            </div>
            <MetricGrid
              columns={2}
              items={[
                { label: "Current bid", value: formatShortUsd(currentBid), accent: true },
                { label: "Reserve", value: formatShortUsd(auction.auction.reservePrice) },
                { label: "Deposit", value: formatShortUsd(auction.auction.depositAmount) },
                {
                  label: auction.auction.phase === "settlement" ? "Window" : "Closes",
                  value:
                    auction.auction.phase === "settlement"
                      ? formatCountDown(
                          auction.auction.activeSettlementStartedAt +
                            auction.auction.settlementWindow,
                        )
                      : formatCountDown(auction.auction.biddingEndAt),
                },
              ]}
            />
          </Panel>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_380px]">
        <Panel className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="copper">{auction.catalog.category}</Tag>
            <Tag>{auction.catalog.location}</Tag>
            <Tag>{auction.catalog.issuerName}</Tag>
          </div>
          <AssetArtwork
            variant={auction.catalog.artwork}
            label={auction.catalog.editorial.heroLabel}
            className="h-72 sm:h-[430px]"
          />
          <MetricGrid
            items={[
              { label: "Current clearing bid", value: formatUsd(currentBid), accent: true },
              { label: "Reserve", value: formatUsd(auction.auction.reservePrice) },
              { label: "Asset units", value: auction.auction.assetAmount.toString() },
              { label: "Participant cap", value: String(auction.auction.maxBidders) },
            ]}
          />
        </Panel>

        <div className="space-y-6">
          <AuctionActionPanel slug={slug} />

          <Panel tone="dark" className="space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
              Settlement threshold
            </p>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="max-w-xs text-sm leading-6 text-white/80">
                  Ownership remains blocked until compliance approval is recorded
                  and the active settlement candidate completes payment.
                </p>
              </div>
              <p className="text-4xl font-semibold uppercase tracking-[-0.05em] text-copper-soft">
                {formatShortUsd(auction.auction.reservePrice)}
              </p>
            </div>
          </Panel>

          <Panel className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
              Issuer note
            </p>
            <p className="text-sm leading-6 text-ink">
              {auction.catalog.editorial.issuerNote}
            </p>
          </Panel>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
        <Panel className="space-y-5">
          <SectionHeading
            eyebrow="Settlement state"
            title={auction.catalog.editorial.secondaryTitle}
            description={auction.catalog.editorial.secondarySummary}
          />
          <AssetArtwork
            variant={auction.catalog.editorial.secondaryArtwork}
            label="Secondary certificate"
            className="h-64 sm:h-[300px]"
          />
          <MetricGrid
            columns={2}
            items={[
              { label: "Deposits held", value: formatUsd(auction.auction.totalDepositsHeld) },
              { label: "Slashed", value: formatUsd(auction.auction.totalSlashed), accent: true },
              { label: "Proceeds", value: formatUsd(auction.auction.totalProceeds) },
              {
                label: "Candidate",
                value: walletState.isLeadingCandidate ? "This wallet" : "Issuer controlled",
              },
            ]}
          />
          <div className="flex flex-wrap gap-3">
            <ActionLink href="/dashboard" tone="ink">
              Wallet Dashboard
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
              description="Compliance, underwriting, and payment rails are kept readable and controlled rather than turned into widget-heavy product chrome."
            />
            <div className="space-y-3">
              {auction.catalog.editorial.diligence.map((item) => (
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
              description="The ledger remains severe and compact, but it now reflects actual auction phase, ranking, and proceeds state."
            />
            <DataTable columns={ledgerColumns} rows={ledgerRows} />
          </Panel>
        </div>
      </section>
    </div>
  );
}
