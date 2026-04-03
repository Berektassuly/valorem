"use client";

import { AssetArtwork } from "@/components/asset-artwork";
import { useValoremApp } from "@/components/providers/valorem-app-provider";
import {
  ActionButton,
  ActionLink,
  DataTable,
  MetricGrid,
  PageIntro,
  Panel,
  SectionHeading,
  Tag,
} from "@/components/ui";
import { auctionProgramId, protocolCluster } from "@/lib/protocol/config";
import { formatPhaseLabel, formatRank, formatShortUsd } from "@/lib/protocol/format";
import { listRevealSecrets } from "@/lib/protocol/secrets";
import { buildDashboardRows } from "@/lib/protocol/view-models";

export function UserDashboardView() {
  const {
    activeAddress,
    auctions,
    claimRefund,
    getWalletAuctionState,
    revealBid,
    settleCandidate,
  } = useValoremApp();

  const dashboardRows = buildDashboardRows(auctions, activeAddress);
  const storedSecrets = activeAddress
    ? listRevealSecrets(activeAddress).filter(
        (secret) =>
          secret.cluster === protocolCluster && secret.programId === auctionProgramId,
      )
    : [];
  const highlights = [
    { label: "Tracked bids", value: String(dashboardRows.length) },
    { label: "Stored secrets", value: String(storedSecrets.length) },
    {
      label: "Settlement tasks",
      value: String(
        dashboardRows.filter((row) => row.walletState.actions.includes("settle")).length,
      ),
      accent: true,
    },
    { label: "Wallet status", value: activeAddress ? "Connected" : "Standby" },
  ];

  const bidColumns = [
    { key: "asset", label: "My bids" },
    { key: "position", label: "Position", align: "right" as const },
    { key: "phase", label: "Phase", align: "right" as const },
    { key: "action", label: "Action", align: "right" as const },
  ];

  const bidRows = dashboardRows.map(({ auction, walletState }) => ({
    id: auction.catalog.slug,
    asset: (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden border border-line">
          <AssetArtwork variant={auction.catalog.artwork} className="h-full w-full border-0" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">
            {auction.catalog.title}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            {auction.catalog.lot}
          </p>
        </div>
      </div>
    ),
    position: walletState.bidderState ? formatRank(walletState.bidderState.rank) : "None",
    phase: (
      <Tag tone={walletState.isLeadingCandidate ? "copper" : "default"}>
        {formatPhaseLabel(auction.auction.phase)}
      </Tag>
    ),
    action: walletState.actions.includes("settle") ? (
      <ActionButton
        tone="copper"
        onClick={() => {
          void settleCandidate(auction.catalog.slug);
        }}
      >
        Settle
      </ActionButton>
    ) : walletState.actions.includes("reveal") ? (
      <ActionButton
        tone="ink"
        onClick={() => {
          void revealBid(auction.catalog.slug);
        }}
      >
        Reveal
      </ActionButton>
    ) : walletState.actions.includes("claimRefund") ? (
      <ActionButton
        tone="ghost"
        onClick={() => {
          void claimRefund(auction.catalog.slug);
        }}
      >
        Refund
      </ActionButton>
    ) : (
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        {walletState.actions[0] ?? "Waiting"}
      </span>
    ),
  }));

  const priorityAuction = dashboardRows[0]?.auction ?? auctions[0];
  const priorityState = priorityAuction ? getWalletAuctionState(priorityAuction.catalog.slug) : null;

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="User Dashboard"
        title="Wallet dashboard"
        description="The personal account view now reads directly from wallet-specific bidder state. Reveal secrets stay local, refund rights wait on fallback eligibility, and settlement tasks surface only when the protocol says they are truly actionable."
        aside={
          <Panel className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <Tag tone="dark">Account</Tag>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                {activeAddress ? `${activeAddress.slice(0, 4)}...${activeAddress.slice(-4)}` : "No wallet"}
              </p>
            </div>
            <MetricGrid columns={2} items={highlights} />
          </Panel>
        }
      />

      <Panel className="space-y-5">
        <SectionHeading
          eyebrow="Live activity"
          title="My bids"
          description="Reveal and settlement actions are rendered inline when the connected wallet actually has them available."
        />
        <DataTable columns={bidColumns} rows={bidRows} />
      </Panel>

      {priorityAuction ? (
        <section className="space-y-6">
          <SectionHeading
            eyebrow="Current focus"
            title="Priority position"
            description="The larger compositional field below mirrors the original dashboard rhythm, but its numbers now come from protocol state."
            action={
              <ActionLink href="/marketplace" tone="ghost">
                Explore More
              </ActionLink>
            }
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.14fr)_340px]">
            <Panel className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-copper">
                    Current asset
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold uppercase tracking-[-0.05em] text-ink">
                    {priorityAuction.catalog.title}
                  </h2>
                </div>
                <Tag tone="dark">
                  {priorityState?.isLeadingCandidate ? "Lead candidate" : "Tracked lot"}
                </Tag>
              </div>

              <AssetArtwork
                variant={priorityAuction.catalog.artwork}
                label={priorityAuction.catalog.category}
                className="h-72 sm:h-[340px]"
              />
              <MetricGrid
                columns={3}
                items={[
                  {
                    label: "Wallet bid",
                    value: priorityState?.bidderState?.bidAmount
                      ? formatShortUsd(priorityState.bidderState.bidAmount)
                      : "None",
                    accent: true,
                  },
                  {
                    label: "Phase",
                    value: formatPhaseLabel(priorityAuction.auction.phase),
                  },
                  {
                    label: "Position",
                    value: priorityState?.bidderState
                      ? formatRank(priorityState.bidderState.rank)
                      : "None",
                  },
                ]}
              />
            </Panel>

            <div className="space-y-6">
              <Panel className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                    Stored reveal secrets
                  </p>
                  <Tag tone="copper">{storedSecrets.length}</Tag>
                </div>
                <div className="space-y-3">
                  {storedSecrets.length > 0 ? (
                    storedSecrets.map((secret) => (
                      <div key={`${secret.auctionAddress}:${secret.walletAddress}`} className="border border-line bg-surface p-4">
                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
                          {secret.auctionAddress.slice(0, 6)}...{secret.auctionAddress.slice(-4)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          Local reveal secret stored for {new Date(secret.createdAt).toLocaleString()}.
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="border border-line bg-surface p-4 text-sm leading-6 text-muted">
                      No local reveal secrets are stored for the current wallet yet.
                    </div>
                  )}
                </div>
              </Panel>

              <Panel className="space-y-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                  Wallet activity
                </p>
                <div className="space-y-3">
                  {dashboardRows.length > 0 ? (
                    dashboardRows.slice(0, 3).map(({ auction, walletState }) => (
                      <div key={auction.catalog.slug} className="border border-line bg-surface p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">
                            {auction.catalog.title}
                          </p>
                          <Tag tone={walletState.isLeadingCandidate ? "copper" : "default"}>
                            {walletState.actions[0] ?? "Waiting"}
                          </Tag>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          Phase: {formatPhaseLabel(auction.auction.phase)}. Rank:{" "}
                          {walletState.bidderState ? formatRank(walletState.bidderState.rank) : "none"}.
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="border border-line bg-surface p-4 text-sm leading-6 text-muted">
                      No devnet bidder state is linked to the connected wallet yet.
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        </section>
      ) : (
        <Panel className="space-y-4">
          <SectionHeading
            eyebrow="Current focus"
            title="No devnet positions yet"
            description="Connect a wallet and place or reveal a bid on an active devnet auction to populate the dashboard."
          />
        </Panel>
      )}
    </div>
  );
}
