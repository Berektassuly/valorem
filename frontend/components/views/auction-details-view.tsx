import { AssetArtwork } from "@/components/asset-artwork";
import { AuctionActionPanel } from "@/components/protocol/auction-action-panel";
import {
  ActionLink,
  MetricGrid,
  PageIntro,
  Panel,
  SectionHeading,
  Tag,
} from "@/components/ui";
import type { AuctionLot } from "@/lib/marketplace/types";
import {
  formatCalendarDate,
  formatLotStatus,
  formatWalletAddress,
} from "@/lib/marketplace/view-models";

export function AuctionDetailsView({
  lot,
  isProfileOwner,
}: {
  lot: AuctionLot;
  isProfileOwner: boolean;
}) {
  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow={`Auction dossier / ${formatLotStatus(lot.status)}`}
        title={lot.title}
        description={lot.description}
        aside={
          <Panel className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <Tag tone={lot.status === "completed" ? "dark" : "copper"}>
                {formatLotStatus(lot.status)}
              </Tag>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
                Lot / {lot.id.slice(0, 8)}
              </p>
            </div>
            <MetricGrid
              columns={2}
              items={[
                {
                  label: "Seller",
                  value: formatWalletAddress(lot.issuerWallet),
                },
                {
                  label: "Winner",
                  value: formatWalletAddress(lot.settledBidder),
                  accent: Boolean(lot.settledBidder),
                },
                {
                  label: "Created",
                  value: formatCalendarDate(lot.createdAt),
                },
                {
                  label: "Updated",
                  value: formatCalendarDate(lot.updatedAt),
                },
              ]}
            />
          </Panel>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_380px]">
        <div className="space-y-6">
          <Panel className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone="copper">{formatLotStatus(lot.status)}</Tag>
              <Tag>{formatWalletAddress(lot.issuerWallet)}</Tag>
              {lot.contractAddress ? (
                <Tag>{formatWalletAddress(lot.contractAddress)}</Tag>
              ) : null}
            </div>
            <AssetArtwork
              variant="schema"
              label="Stored asset"
              imageSrc={lot.imageBase64}
              imageAlt={lot.title}
              className="h-72 sm:h-[430px]"
            />
            <MetricGrid
              items={[
                {
                  label: "Contract",
                  value: formatWalletAddress(lot.contractAddress),
                  accent: Boolean(lot.contractAddress),
                },
                {
                  label: "Seller wallet",
                  value: formatWalletAddress(lot.issuerWallet),
                },
                {
                  label: "Settled bidder",
                  value: formatWalletAddress(lot.settledBidder),
                },
                {
                  label: "Profile visibility",
                  value: lot.status === "completed" ? "Private" : "Public",
                  accent: lot.status === "completed",
                },
              ]}
            />
          </Panel>

          <Panel className="space-y-5">
            <SectionHeading
              eyebrow="Stored media"
              title="Base64-backed lot record"
              description="This MVP keeps images and narrative metadata inside PostgreSQL so the full lot can be recovered directly from the relational record without external object storage."
            />
            <div className="space-y-3">
              {[
                {
                  label: "Title",
                  value: lot.title,
                },
                {
                  label: "Description",
                  value: lot.description,
                },
                {
                  label: "Contract address",
                  value: lot.contractAddress ?? "Pending link",
                },
                {
                  label: "Winner proof",
                  value: lot.settledBidder ?? "Pending settlement",
                },
              ].map((item) => (
                <div key={item.label} className="border border-line bg-surface p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
                    {item.label}
                  </p>
                  <p className="mt-2 break-words text-sm leading-6 text-ink">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="space-y-5">
            <SectionHeading
              eyebrow="Visibility rules"
              title="How this lot is filtered"
              description="The routing and query behavior now follow the product rules described for the dynamic MVP."
            />
            <div className="space-y-3">
              {[
                {
                  title: "Marketplace",
                  copy: "Shown only while the cached status is not completed.",
                },
                {
                  title: "Profile",
                  copy: "Shown only when status is completed and the settled bidder matches the authenticated wallet.",
                },
                {
                  title: "Direct access",
                  copy: "Completed lots are hidden from non-owners even if they know the URL.",
                },
              ].map((item) => (
                <div key={item.title} className="border border-line bg-surface p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.copy}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <AuctionActionPanel lot={lot} />

          <Panel tone="dark" className="space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
              Ownership state
            </p>
            <p className="text-sm leading-6 text-white/80">
              Public lots remain visible until the cached protocol status moves
              to completed. At that moment, the record is removed from the
              storefront and is only rendered in the winner’s private profile.
            </p>
            <div className="flex flex-wrap gap-3">
              <ActionLink href="/marketplace" tone="ghost">
                Back To Marketplace
              </ActionLink>
              {isProfileOwner ? (
                <ActionLink href="/profile" tone="copper">
                  View My Asset
                </ActionLink>
              ) : null}
            </div>
          </Panel>

          <Panel className="space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
              Audit trail
            </p>
            <div className="space-y-3">
              {[
                `Database record created at ${formatCalendarDate(lot.createdAt)}.`,
                lot.contractAddress
                  ? `Linked to on-chain auction ${lot.contractAddress}.`
                  : "Awaiting on-chain initialization.",
                lot.settledBidder
                  ? `Ownership cached for wallet ${lot.settledBidder}.`
                  : "No settled bidder cached yet.",
              ].map((item) => (
                <div key={item} className="border border-line bg-surface p-4">
                  <p className="text-sm leading-6 text-ink">{item}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}
