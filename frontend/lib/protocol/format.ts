import type { AuctionPhase } from "@valorem/sdk";

export function formatUsd(amount: bigint, decimals = 6): string {
  const divider = 10n ** BigInt(decimals);
  const whole = amount / divider;
  const fraction = amount % divider;
  const wholeNumber = Number(whole);
  const formattedWhole = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(wholeNumber);

  if (fraction === 0n) {
    return `$${formattedWhole}`;
  }

  const cents = Number((fraction * 100n) / divider);
  return `$${formattedWhole}.${String(cents).padStart(2, "0")}`;
}

export function formatShortUsd(amount: bigint, decimals = 6): string {
  const value = Number(amount) / 10 ** decimals;
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function formatCountDown(targetUnixSeconds: bigint): string {
  const deltaSeconds = Number(targetUnixSeconds) - Math.floor(Date.now() / 1000);
  if (deltaSeconds <= 0) {
    return "Closed";
  }

  const hours = Math.floor(deltaSeconds / 3600);
  const minutes = Math.floor((deltaSeconds % 3600) / 60);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function formatPhaseLabel(phase: AuctionPhase): string {
  switch (phase) {
    case "bidding":
      return "Bidding";
    case "reveal":
      return "Reveal";
    case "settlement":
      return "Settlement";
    case "completed":
      return "Completed";
    default:
      return "Unknown";
  }
}

export function formatRank(rank: number): string {
  if (rank <= 0) {
    return "Unranked";
  }

  if (rank === 1) {
    return "Lead";
  }

  return `#${rank}`;
}
