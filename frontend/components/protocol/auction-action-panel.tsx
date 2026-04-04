"use client";

import { useEffect, useState } from "react";
import { useValoremApp } from "@/components/providers/valorem-app-provider";
import { ActionButton, Panel, SectionHeading, Tag } from "@/components/ui";
import type { AuctionLot } from "@/lib/marketplace/types";
import { auctionProgramId, protocolCluster } from "@/lib/protocol/config";
import { formatPhaseLabel, formatRank, formatShortUsd, formatUsd } from "@/lib/protocol/format";
import { loadRevealSecret } from "@/lib/protocol/secrets";
import type { WalletAuctionState } from "@/lib/protocol/types";

function parseBidInput(value: string): bigint {
  const normalized = value.replace(/[^0-9.]/g, "");
  if (!normalized) {
    return 0n;
  }

  const [whole, fraction = ""] = normalized.split(".");
  const wholePart = BigInt(whole || "0") * 1_000_000n;
  const fractionPart = BigInt((fraction.padEnd(6, "0").slice(0, 6)) || "0");
  return wholePart + fractionPart;
}

function getWalletStatusPresentation(params: {
  hasConnectedWallet: boolean;
  walletState: WalletAuctionState;
  hasStoredSecret: boolean;
}) {
  if (!params.hasConnectedWallet) {
    return {
      badge: "Disconnected",
      title: "Connect a wallet to participate",
      copy: "Use the wallet control in the header, then return here to commit, reveal, settle, or claim a refund for this lot.",
      tone: "default" as const,
    };
  }

  if (params.walletState.actions.includes("submitCommitment")) {
    return {
      badge: "Ready to commit",
      title: "This wallet can enter the auction",
      copy: "Enter a bid amount below to create the commitment hash and fund the required deposit escrow from the connected wallet.",
      tone: "copper" as const,
    };
  }

  if (params.walletState.actions.includes("awaitReveal")) {
    return {
      badge: "Waiting for reveal",
      title: "Commitment recorded",
      copy: "Your deposit is in escrow. Wait until the auction advances into reveal before submitting the locally stored secret.",
      tone: "default" as const,
    };
  }

  if (params.walletState.actions.includes("reveal")) {
    return params.hasStoredSecret
      ? {
          badge: "Ready to reveal",
          title: "Reveal window is open",
          copy: "This browser still has the local reveal secret, so the connected wallet can disclose the bid and join the ranked settlement queue.",
          tone: "copper" as const,
        }
      : {
          badge: "Secret missing",
          title: "Reveal requires the original local secret",
          copy: "The connected wallet has a live commitment, but this browser does not have the reveal secret that was stored when the bid was submitted.",
          tone: "alert" as const,
        };
  }

  if (params.walletState.actions.includes("awaitCompliance")) {
    return {
      badge: "Waiting for compliance",
      title: "Settlement is paused on issuer review",
      copy: "This wallet is the active settlement candidate. The issuer still needs to record the compliance decision before settlement can continue.",
      tone: "dark" as const,
    };
  }

  if (params.walletState.actions.includes("settle")) {
    return {
      badge: "Ready to settle",
      title: "Settlement can be completed now",
      copy: "Compliance is approved and this wallet is the active candidate. Settling will release the asset and transfer the payment leg through the protocol.",
      tone: "copper" as const,
    };
  }

  if (params.walletState.actions.includes("claimRefund")) {
    return {
      badge: "Ready to claim refund",
      title: "Refund is unlocked",
      copy: "This wallet is no longer an active settlement candidate and can recover its deposit from escrow.",
      tone: "copper" as const,
    };
  }

  return {
    badge: "No action",
    title: "No wallet action is available right now",
    copy: "The connected wallet is not expected to do anything on the current auction phase. The panel will update automatically as the protocol state changes.",
    tone: "default" as const,
  };
}

export function AuctionActionPanel({ lot }: { lot: AuctionLot }) {
  const {
    activeAddress,
    claimRefund,
    feedback,
    getAuction,
    getAuctionLoadState,
    getWalletAuctionState,
    revealBid,
    settleCandidate,
    submitCommitment,
    syncAuctionLot,
  } = useValoremApp();
  const [bidInput, setBidInput] = useState("");

  useEffect(() => {
    void syncAuctionLot(lot);
  }, [lot, syncAuctionLot]);

  if (!lot.contractAddress) {
    return (
      <Panel className="space-y-4">
        <SectionHeading
          eyebrow="Participation"
          title="Live auction control"
          description="Participation controls appear here as soon as the seller links an on-chain auction contract to this PostgreSQL lot."
        />
        <div className="border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              Awaiting on-chain initialization
            </p>
            <Tag>Pending link</Tag>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            The lot metadata is live, but bidding cannot begin until a contract address is attached. Once linked, this panel will switch to the live protocol-backed participation flow.
          </p>
        </div>
      </Panel>
    );
  }

  const loadState = getAuctionLoadState(lot.slug);
  const auction = getAuction(lot.slug);

  if (!auction && (loadState.status === "idle" || loadState.status === "loading")) {
    return (
      <Panel className="space-y-4">
        <SectionHeading
          eyebrow="Participation"
          title="Live auction control"
          description="Hydrating the linked contract so the page can show the current phase, wallet position, and next available bidder action."
          action={
            <ActionButton
              tone="ghost"
              onClick={() => {
                void syncAuctionLot(lot);
              }}
            >
              Refresh
            </ActionButton>
          }
        />
        <div className="space-y-3">
          <div className="border border-line bg-surface-muted p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
              Loading live auction state
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Reading the linked contract from Solana so participation controls can be derived from the real protocol phase and bidder records.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Phase", "Deposit", "Wallet position", "Reveal secret"].map((label) => (
              <div key={label} className="border border-line bg-surface p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
                  {label}
                </p>
                <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted">
                  Syncing
                </p>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    );
  }

  if (!auction) {
    return (
      <Panel className="space-y-4">
        <SectionHeading
          eyebrow="Participation"
          title="Live auction control"
          description="The lot is linked to a contract, but the app could not load the live protocol snapshot for this page."
          action={
            <ActionButton
              tone="ghost"
              onClick={() => {
                void syncAuctionLot(lot);
              }}
            >
              Retry
            </ActionButton>
          }
        />
        <div className="border border-alert/20 bg-alert/8 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-alert">
              Live protocol state unavailable
            </p>
            <Tag tone="alert">Error</Tag>
          </div>
          <p className="mt-3 text-sm leading-6 text-alert">
            {loadState.errorMessage ??
              "The linked auction could not be read from Solana right now. Retry the sync once the RPC endpoint is reachable again."}
          </p>
        </div>
      </Panel>
    );
  }

  const walletState = getWalletAuctionState(lot.slug);
  const storedSecret =
    activeAddress &&
    loadRevealSecret({
      cluster: protocolCluster,
      programId: auctionProgramId,
      auctionAddress: auction.auctionAddress,
      walletAddress: activeAddress,
    });
  const parsedBid = parseBidInput(bidInput);
  const hasCommitAction = walletState.actions.includes("submitCommitment");
  const hasRevealAction = walletState.actions.includes("reveal");
  const hasSettleAction = walletState.actions.includes("settle");
  const hasRefundAction = walletState.actions.includes("claimRefund");
  const walletStatus = getWalletStatusPresentation({
    hasConnectedWallet: Boolean(activeAddress),
    walletState,
    hasStoredSecret: Boolean(storedSecret),
  });

  return (
    <Panel className="space-y-5">
      <SectionHeading
        eyebrow="Participation"
        title="Live auction control"
        description="This rail is driven by the linked on-chain contract, the connected wallet, and the bidder-specific runtime state for this lot."
        action={
          <ActionButton
            tone="ghost"
            onClick={() => {
              void syncAuctionLot(lot);
            }}
          >
            Refresh
          </ActionButton>
        }
      />

      {loadState.status === "error" && loadState.errorMessage ? (
        <div className="border border-alert/20 bg-alert/8 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-alert">
              Showing the last confirmed snapshot
            </p>
            <Tag tone="alert">Sync issue</Tag>
          </div>
          <p className="mt-3 text-sm leading-6 text-alert">{loadState.errorMessage}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="border border-line bg-surface-muted p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
            Current phase
          </p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-3xl font-semibold uppercase tracking-[-0.05em] text-copper">
              {formatPhaseLabel(auction.auction.phase)}
            </p>
            <Tag tone={walletState.isLeadingCandidate ? "copper" : "default"}>
              {walletState.bidderState ? formatRank(walletState.bidderState.rank) : "No position"}
            </Tag>
          </div>
        </div>

        <div className="border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
              Wallet status
            </p>
            <Tag tone={walletStatus.tone}>{walletStatus.badge}</Tag>
          </div>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink">
            {walletStatus.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">{walletStatus.copy}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-line bg-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
              Deposit escrow
            </p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              {formatUsd(auction.auction.depositAmount)}
            </p>
          </div>
          <div className="border border-line bg-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
              Leading bid
            </p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              {walletState.currentBid ? formatShortUsd(walletState.currentBid) : "Pending"}
            </p>
          </div>
          <div className="border border-line bg-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
              Wallet bid
            </p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              {walletState.bidderState?.bidAmount
                ? formatUsd(walletState.bidderState.bidAmount)
                : "No commitment"}
            </p>
          </div>
          <div className="border border-line bg-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
              Local reveal secret
            </p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              {storedSecret ? "Stored" : "Missing"}
            </p>
          </div>
        </div>

        {walletState.isLeadingCandidate ? (
          <div className="border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
                Compliance review
              </p>
              <Tag
                tone={
                  walletState.complianceRecord?.status === "approved"
                    ? "copper"
                    : walletState.complianceRecord?.status === "rejected"
                      ? "alert"
                      : "default"
                }
              >
                {walletState.complianceRecord?.status ?? "Pending"}
              </Tag>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              {walletState.complianceRecord?.status === "approved"
                ? "The issuer has recorded a compliant settlement candidate, so this wallet can complete settlement."
                : walletState.complianceRecord?.status === "rejected"
                  ? "The issuer rejected this candidate. Wait for the settlement queue to advance or for refund rights to unlock."
                  : "The issuer still needs to record the compliance decision for the active settlement candidate."}
            </p>
          </div>
        ) : null}

        {hasRevealAction && !storedSecret ? (
          <div className="border border-alert/20 bg-alert/8 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-alert">
                Reveal is blocked on local browser state
              </p>
              <Tag tone="alert">Secret required</Tag>
            </div>
            <p className="mt-3 text-sm leading-6 text-alert">
              The reveal instruction needs the same locally stored secret that was created during commitment. Without it, this wallet cannot reveal from the current browser session.
            </p>
          </div>
        ) : null}
      </div>

      {hasCommitAction ? (
        <div className="space-y-3 border border-line bg-surface p-4">
          <label className="space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
              Commit bid ({auction.paymentSymbol})
            </span>
            <input
              value={bidInput}
              onChange={(event) => setBidInput(event.target.value)}
              placeholder="48.20"
              className="w-full border border-line bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-copper"
            />
          </label>
          <div className="flex items-center justify-between gap-3 border border-line/70 bg-surface-muted px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
              Parsed bid
            </p>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              {parsedBid > 0n ? formatUsd(parsedBid) : "Enter amount"}
            </p>
          </div>
          <ActionButton
            disabled={parsedBid <= 0n}
            onClick={() => {
              void submitCommitment(lot.slug, parsedBid);
            }}
            className="w-full justify-between"
          >
            <span>Submit commitment</span>
            <span>Escrow deposit</span>
          </ActionButton>
        </div>
      ) : null}

      {hasRevealAction ? (
        <ActionButton
          disabled={!storedSecret}
          onClick={() => {
            void revealBid(lot.slug);
          }}
          className="w-full justify-between"
          tone="ink"
        >
          <span>Reveal bid</span>
          <span>Verify commitment</span>
        </ActionButton>
      ) : null}

      {hasSettleAction ? (
        <ActionButton
          onClick={() => {
            void settleCandidate(lot.slug);
          }}
          className="w-full justify-between"
        >
          <span>Settle candidate</span>
          <span>Release asset</span>
        </ActionButton>
      ) : null}

      {hasRefundAction ? (
        <ActionButton
          onClick={() => {
            void claimRefund(lot.slug);
          }}
          className="w-full justify-between"
          tone="ghost"
        >
          <span>Claim refund</span>
          <span>Return deposit</span>
        </ActionButton>
      ) : null}

      {feedback.message ? (
        <p className={`text-sm leading-6 ${feedback.status === "error" ? "text-alert" : "text-muted"}`}>
          {feedback.message}
        </p>
      ) : null}
    </Panel>
  );
}
