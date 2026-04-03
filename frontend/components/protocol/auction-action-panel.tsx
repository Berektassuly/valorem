"use client";

import { useState } from "react";
import { ActionButton, Panel, SectionHeading, Tag } from "@/components/ui";
import { useValoremApp } from "@/components/providers/valorem-app-provider";
import { auctionProgramId, protocolCluster } from "@/lib/protocol/config";
import { formatPhaseLabel, formatRank, formatShortUsd, formatUsd } from "@/lib/protocol/format";
import { loadRevealSecret } from "@/lib/protocol/secrets";

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

export function AuctionActionPanel({ slug }: { slug: string }) {
  const {
    activeAddress,
    getAuction,
    getWalletAuctionState,
    claimRefund,
    feedback,
    revealBid,
    settleCandidate,
    submitCommitment,
  } = useValoremApp();
  const [bidInput, setBidInput] = useState("");

  const auction = getAuction(slug);
  const walletState = getWalletAuctionState(slug);

  if (!auction) {
    return null;
  }

  const storedSecret =
    activeAddress &&
    loadRevealSecret({
      cluster: protocolCluster,
      programId: auctionProgramId,
      auctionAddress: auction.auctionAddress,
      walletAddress: activeAddress,
    });

  const hasCommitAction = walletState.actions.includes("submitCommitment");
  const hasRevealAction = walletState.actions.includes("reveal");
  const hasSettleAction = walletState.actions.includes("settle");
  const hasRefundAction = walletState.actions.includes("claimRefund");

  return (
    <Panel className="space-y-5">
      <SectionHeading
        eyebrow="Bid desk"
        title="Live auction control"
        description="The action rail stays compact and decisive. Every control is driven by auction phase, wallet status, and the bidder-specific protocol state."
      />

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
              Compliance
            </p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              {walletState.complianceRecord?.status ?? "Pending"}
            </p>
          </div>
          <div className="border border-line bg-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
              Local reveal secret
            </p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              {storedSecret ? "Stored" : "None"}
            </p>
          </div>
        </div>
      </div>

      {hasCommitAction ? (
        <div className="space-y-3 border border-line bg-surface p-4">
          <label className="space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
              Commit bid (USDC)
            </span>
            <input
              value={bidInput}
              onChange={(event) => setBidInput(event.target.value)}
              placeholder="48200000"
              className="w-full border border-line bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-copper"
            />
          </label>
          <ActionButton
            onClick={() => {
              void submitCommitment(slug, parseBidInput(bidInput));
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
          onClick={() => {
            void revealBid(slug);
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
            void settleCandidate(slug);
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
            void claimRefund(slug);
          }}
          className="w-full justify-between"
          tone="ghost"
        >
          <span>Claim refund</span>
          <span>Return deposit</span>
        </ActionButton>
      ) : null}

      {!hasCommitAction && !hasRevealAction && !hasSettleAction && !hasRefundAction ? (
        <div className="border border-line bg-surface p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
            Wallet state
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            {walletState.actions.includes("connect")
              ? "Connect a wallet to participate in this devnet auction."
              : walletState.actions.includes("awaitReveal")
                ? "Commitment recorded. Wait for reveal phase before submitting bid details."
                : walletState.actions.includes("awaitCompliance")
                  ? "You are the active settlement candidate. The issuer still needs to record compliance approval."
                  : walletState.actions.includes("wait")
                    ? "No immediate wallet action is available for this auction."
                    : "This wallet has no active action on the current phase."}
          </p>
        </div>
      ) : null}

      {feedback.message ? (
        <p className={`text-sm leading-6 ${feedback.status === "error" ? "text-alert" : "text-muted"}`}>
          {feedback.message}
        </p>
      ) : null}
    </Panel>
  );
}
