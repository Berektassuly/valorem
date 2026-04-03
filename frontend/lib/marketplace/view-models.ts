import type { AuctionLot, LotStatus } from "./types";

export function formatLotStatus(status: LotStatus) {
  switch (status) {
    case "draft":
      return "Draft";
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

export function formatWalletAddress(value: string | null) {
  if (!value) {
    return "Unavailable";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function formatCalendarDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function buildMarketplaceCardLot(lot: AuctionLot, index: number) {
  return {
    slug: lot.slug,
    lot: `Lot ${String(index + 1).padStart(2, "0")}`,
    title: lot.title,
    description: lot.description,
    issuerName: formatWalletAddress(lot.issuerWallet),
    status: formatLotStatus(lot.status),
    imageBase64: lot.imageBase64,
    detailLabel: lot.contractAddress
      ? `Contract / ${formatWalletAddress(lot.contractAddress)}`
      : `Created / ${formatCalendarDate(lot.createdAt)}`,
    marketMetrics: [
      {
        label: "Seller",
        value: formatWalletAddress(lot.issuerWallet),
      },
      {
        label: "Contract",
        value: formatWalletAddress(lot.contractAddress),
        accent: Boolean(lot.contractAddress),
      },
      {
        label: "Created",
        value: formatCalendarDate(lot.createdAt),
      },
      {
        label: "Updated",
        value: formatCalendarDate(lot.updatedAt),
      },
    ],
  };
}

