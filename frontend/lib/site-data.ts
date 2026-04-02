export type ArtworkVariant =
  | "mist"
  | "portrait"
  | "orbital"
  | "tower"
  | "textile"
  | "schema"
  | "statue"
  | "bear";

export type MetricItem = {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
};

export type AuctionLot = {
  slug: string;
  lot: string;
  title: string;
  category: string;
  location: string;
  issuer: string;
  description: string;
  status: string;
  artwork: ArtworkVariant;
  marketMetrics: MetricItem[];
};

export type AuctionDetail = {
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  category: string;
  location: string;
  issuer: string;
  status: string;
  room: string;
  artwork: ArtworkVariant;
  heroLabel: string;
  auctionMetrics: MetricItem[];
  bidDeskMetrics: MetricItem[];
  clearingBid: string;
  bidNotes: Array<{ label: string; value: string }>;
  settlementAmount: string;
  issuerNote: string;
  secondaryTitle: string;
  secondarySummary: string;
  secondaryArtwork: ArtworkVariant;
  secondaryMetrics: MetricItem[];
  diligence: string[];
  ledger: Array<{
    step: string;
    note: string;
    window: string;
    amount: string;
    status: string;
    tone: "default" | "copper" | "dark" | "alert";
  }>;
};

export const marketplaceLots: AuctionLot[] = [
  {
    slug: "metropolitan-core-office-complex",
    lot: "Lot 01",
    title: "Metropolitan Core Office Complex",
    category: "Core real estate",
    location: "New York, NY",
    issuer: "Helix Advisory",
    description:
      "Institutional book for a stabilized Class A office stack with supervised release and escrow-backed settlement.",
    status: "Live",
    artwork: "tower",
    marketMetrics: [
      { label: "Current bid", value: "$48.2M", accent: true },
      { label: "Reserve", value: "$45.0M" },
      { label: "Min increment", value: "$250K" },
      { label: "Closes", value: "14h 20m" },
    ],
  },
  {
    slug: "jade-vault-portrait-series",
    lot: "Lot 02",
    title: "Jade Vault Portrait Series",
    category: "Contemporary art",
    location: "Geneva, CH",
    issuer: "North Ridge Fine Assets",
    description:
      "Monochrome portrait issuance structured for fractional auction access with controlled settlement windows.",
    status: "Preview",
    artwork: "portrait",
    marketMetrics: [
      { label: "Indicative", value: "$2.8M", accent: true },
      { label: "Reserve", value: "$2.4M" },
      { label: "Series", value: "12 works" },
      { label: "Closes", value: "21h 05m" },
    ],
  },
  {
    slug: "prime-manhattan-equity-token-42",
    lot: "Lot 03",
    title: "Prime Manhattan Equity Token #42",
    category: "Secondary certificate",
    location: "Manhattan, NY",
    issuer: "Aster Capital",
    description:
      "Structured certificate for a supervised equity tranche, presented as a premium secondary book with immediate settlement state.",
    status: "Settlement",
    artwork: "orbital",
    marketMetrics: [
      { label: "Current bid", value: "$155K", accent: true },
      { label: "Reserve", value: "$142K" },
      { label: "Token size", value: "2.50%" },
      { label: "Window", value: "T+1" },
    ],
  },
  {
    slug: "obsidian-yield-note-7",
    lot: "Lot 04",
    title: "Obsidian Yield Note 07",
    category: "Structured credit",
    location: "London, UK",
    issuer: "Monarch Structured Desk",
    description:
      "Short-dated specialty note displayed as a pure visual state with muted copper controls and conservative metrics.",
    status: "Live",
    artwork: "mist",
    marketMetrics: [
      { label: "Current bid", value: "$9.4M", accent: true },
      { label: "Reserve", value: "$8.7M" },
      { label: "Yield", value: "8.1%" },
      { label: "Closes", value: "09h 12m" },
    ],
  },
  {
    slug: "rotterdam-logistics-hub-april",
    lot: "Lot 05",
    title: "Logistics Hub Rotterdam April",
    category: "Industrial logistics",
    location: "Rotterdam, NL",
    issuer: "Axis Freight Holdings",
    description:
      "Industrial distribution asset with strong operational photography cues translated into grayscale textile-like composition.",
    status: "Open",
    artwork: "textile",
    marketMetrics: [
      { label: "Current bid", value: "$31.8M", accent: true },
      { label: "Reserve", value: "$29.5M" },
      { label: "Occupancy", value: "97%" },
      { label: "Closes", value: "18h 44m" },
    ],
  },
  {
    slug: "arc-light-mineral-rights-c",
    lot: "Lot 06",
    title: "Arc Light Mineral Rights C",
    category: "Specialty rights",
    location: "West Texas, US",
    issuer: "Meridian Resource Partners",
    description:
      "A sharply framed specialty rights issuance with diagrammatic visuals and understated border structure.",
    status: "Watch",
    artwork: "schema",
    marketMetrics: [
      { label: "Indicative", value: "$12.6M", accent: true },
      { label: "Reserve", value: "$11.9M" },
      { label: "Tenor", value: "7 yrs" },
      { label: "Closes", value: "31h 10m" },
    ],
  },
];

function buildDefaultAuctionDetail(lot: AuctionLot): AuctionDetail {
  return {
    slug: lot.slug,
    eyebrow: `Auction dossier / ${lot.lot}`,
    title: lot.title,
    summary: `Institutional allocation window for ${lot.title}. The page stays focused on proportion, typography, and layout fidelity rather than product logic.`,
    category: lot.category,
    location: lot.location,
    issuer: lot.issuer,
    status: lot.status,
    room: "A2",
    artwork: lot.artwork,
    heroLabel: lot.category,
    auctionMetrics: [
      { label: "Indicative size", value: lot.marketMetrics[0]?.value ?? "TBD", accent: true },
      { label: "Reserve", value: lot.marketMetrics[1]?.value ?? "TBD" },
      { label: "Settlement", value: "Escrow release" },
      { label: "Participant tier", value: "Institutional" },
    ],
    bidDeskMetrics: [
      { label: "Registered", value: "18" },
      { label: "Min step", value: lot.marketMetrics[2]?.value ?? "TBD" },
      { label: "Close", value: lot.marketMetrics[3]?.value ?? "TBD" },
      { label: "Mode", value: "Live book" },
    ],
    clearingBid: lot.marketMetrics[0]?.value ?? "TBD",
    bidNotes: [
      { label: "Reserve state", value: "Above reserve" },
      { label: "Diligence", value: "Primary docs complete" },
      { label: "Settlement", value: "Escrow verified" },
      { label: "Desk mode", value: "Manual release" },
    ],
    settlementAmount: lot.marketMetrics[0]?.value ?? "TBD",
    issuerNote:
      "This environment is intentionally static. Controls represent presentation-only terminal states designed to match the Figma composition and tone.",
    secondaryTitle: `${lot.title} / settlement certificate`,
    secondarySummary:
      "A secondary state card shows how the same design language handles settlement, payment, and post-auction communication without leaving the editorial system.",
    secondaryArtwork: lot.artwork === "tower" ? "orbital" : lot.artwork,
    secondaryMetrics: [
      { label: "Window", value: "T+1" },
      { label: "Escrow", value: "Confirmed", accent: true },
      { label: "Wire reference", value: "VAL-042" },
      { label: "Beneficiary", value: "Desk copy" },
    ],
    diligence: [
      "Offering materials reviewed and normalized into a restrained presentation state.",
      "Issuer disclosures, cap table references, and settlement notes are displayed as mock copy only.",
      "Layout spacing intentionally prioritizes readability and negative space over feature density.",
    ],
    ledger: [
      {
        step: "Bid confirmation",
        note: "Room note 01",
        window: "Immediate",
        amount: "Confirmed",
        status: "Closed",
        tone: "dark",
      },
      {
        step: "Wire release",
        note: "Room note 02",
        window: "T+1",
        amount: lot.marketMetrics[0]?.value ?? "TBD",
        status: "Pending",
        tone: "copper",
      },
      {
        step: "Certificate delivery",
        note: "Room note 03",
        window: "T+2",
        amount: "Digital",
        status: "Queued",
        tone: "default",
      },
    ],
  };
}

const customAuctionDetails: Record<string, AuctionDetail> = {
  "metropolitan-core-office-complex": {
    slug: "metropolitan-core-office-complex",
    eyebrow: "Auction dossier / Lot 01",
    title: "Metropolitan Core Office Complex",
    summary:
      "A sharply composed auction detail view pairing the hero property asset with a more compact settlement state. The result stays premium, serious, and closer to a financial terminal than a SaaS dashboard.",
    category: "Core real estate",
    location: "New York, NY",
    issuer: "Helix Advisory",
    status: "Live",
    room: "A1",
    artwork: "tower",
    heroLabel: "Primary asset",
    auctionMetrics: [
      { label: "Current clearing bid", value: "$48.2M", accent: true },
      { label: "Reserve", value: "$45.0M" },
      { label: "Token supply", value: "5,000" },
      { label: "Settlement", value: "Escrow / T+2" },
    ],
    bidDeskMetrics: [
      { label: "Registered desks", value: "27" },
      { label: "Min increment", value: "$250K" },
      { label: "Time remaining", value: "14h 20m" },
      { label: "Book state", value: "Active" },
    ],
    clearingBid: "$48.2M",
    bidNotes: [
      { label: "Next bid", value: "$48.45M" },
      { label: "Reserve state", value: "Reserve met" },
      { label: "Data room", value: "Verified" },
      { label: "Settlement", value: "Escrow ready" },
    ],
    settlementAmount: "155,000",
    issuerNote:
      "Helix Advisory has requested that the preview maintain a conservative institutional posture: clean modules, restrained copper actions, and no speculative visual noise.",
    secondaryTitle: "Prime Manhattan Equity Token #42",
    secondarySummary:
      "A complementary certificate state demonstrates how the Valorem interface handles successful outcomes without breaking the monochrome, high-trust atmosphere.",
    secondaryArtwork: "orbital",
    secondaryMetrics: [
      { label: "Token size", value: "2.50%" },
      { label: "Payment due", value: "$155,000", accent: true },
      { label: "Window", value: "24 hours" },
      { label: "Release", value: "Desk approval" },
    ],
    diligence: [
      "Property engineering report and tenancy roll are represented as verified static states for design review.",
      "Settlement amount and payment timing are mock values chosen to mirror the numeric emphasis visible in the Figma flow.",
      "Supporting blocks remain intentionally sparse to preserve the editorial white space of the original composition.",
    ],
    ledger: [
      {
        step: "Winning allocation",
        note: "Bid room close",
        window: "Immediate",
        amount: "$48.2M",
        status: "Confirmed",
        tone: "dark",
      },
      {
        step: "Initial payment",
        note: "Escrow instruction",
        window: "24 hours",
        amount: "$155,000",
        status: "Pending",
        tone: "copper",
      },
      {
        step: "Certificate release",
        note: "Post-clearance",
        window: "T+2",
        amount: "Digital",
        status: "Queued",
        tone: "default",
      },
    ],
  },
};

export function getAuctionDetail(slug: string) {
  const lot = marketplaceLots.find((item) => item.slug === slug);

  if (!lot) {
    return null;
  }

  return customAuctionDetails[slug] ?? buildDefaultAuctionDetail(lot);
}

export const marketPulse = [
  {
    title: "Closing windows",
    badge: "3 active",
    copy: "Three listings are inside their supervised close window with copper emphasis reserved for the most decisive actions only.",
    tone: "copper" as const,
  },
  {
    title: "Issuer quality",
    badge: "Verified",
    copy: "All visible issuers in this mock environment pass the same trust-oriented visual treatment: sharp borders, narrow labels, and modest color usage.",
    tone: "dark" as const,
  },
  {
    title: "Settlement flow",
    badge: "T+1 / T+2",
    copy: "Secondary states, congratulations banners, and payment instructions remain presentational, but they are laid out to feel credible and usable.",
    tone: "default" as const,
  },
  {
    title: "Desk volume",
    badge: "$182M",
    copy: "The explorer balances strong financial numerics with ample margins so the interface still reads as premium rather than over-instrumented.",
    tone: "copper" as const,
  },
];

export const issuerWorkflowMetrics: MetricItem[] = [
  { label: "Programs live", value: "04" },
  { label: "Reviews open", value: "02" },
  { label: "Gross shown", value: "$121M", accent: true },
  { label: "Desk cycle", value: "Q2" },
];

export const issuerProgramMetrics: MetricItem[] = [
  { label: "Current issuer", value: "Helix Advisory" },
  { label: "Jurisdiction", value: "Delaware" },
  { label: "Offering type", value: "Core office" },
  { label: "Launch state", value: "Ready", accent: true },
];

export const issuerFlaggedItems = [
  {
    title: "Beneficial ownership attestation",
    status: "Action required",
    copy: "A final attestation line item remains outstanding before the preview can be released to the full allocation desk.",
  },
  {
    title: "Secondary transfer language",
    status: "Review",
    copy: "Secondary transfer language is held for legal confirmation and is displayed here only as a visual alert state.",
  },
];

export const issuerTableRows = [
  {
    program: "Metropolitan Core Office Complex",
    issuer: "Helix Advisory",
    sector: "Real estate",
    notional: "$48.2M",
    stage: "Live",
    tone: "dark" as const,
  },
  {
    program: "Logistics Hub Rotterdam April",
    issuer: "Axis Freight Holdings",
    sector: "Industrial",
    notional: "$31.8M",
    stage: "Preview",
    tone: "copper" as const,
  },
  {
    program: "Arc Light Mineral Rights C",
    issuer: "Meridian Resource Partners",
    sector: "Specialty rights",
    notional: "$12.6M",
    stage: "Watch",
    tone: "default" as const,
  },
];

export const dashboardHighlights: MetricItem[] = [
  { label: "Active bids", value: "03" },
  { label: "Inventory", value: "04" },
  { label: "Notional", value: "$64.9M", accent: true },
  { label: "Tier", value: "Prime" },
];

export const dashboardBidRows = [
  {
    asset: "Prime Manhattan Equity Token #42",
    reference: "Ref / PME-042",
    artwork: "orbital" as const,
    position: "Lead",
    notional: "$155,000",
    status: "Winning",
    tone: "copper" as const,
  },
  {
    asset: "Jade Vault Portrait Series",
    reference: "Ref / JVP-018",
    artwork: "portrait" as const,
    position: "Outbid",
    notional: "$2.84M",
    status: "Review",
    tone: "default" as const,
  },
  {
    asset: "Metropolitan Core Office Complex",
    reference: "Ref / MCO-001",
    artwork: "tower" as const,
    position: "Qualified",
    notional: "$48.2M",
    status: "Open",
    tone: "dark" as const,
  },
];

export const dashboardPrimaryHolding = {
  title: "Logistics Hub Rotterdam April",
  badge: "Primary stake",
  artwork: "textile" as const,
  label: "Industrial allocation",
  metrics: [
    { label: "Held notional", value: "$31.8M", accent: true },
    { label: "Yield basis", value: "6.8%" },
    { label: "Settlement", value: "Complete" },
  ],
};

export const dashboardActivity = [
  {
    title: "Settlement ready",
    status: "T+1",
    copy: "Prime Manhattan Equity Token #42 is awaiting payment instruction release.",
    tone: "copper" as const,
  },
  {
    title: "Desk review",
    status: "Open",
    copy: "Jade Vault Portrait Series remains under review for a counter position.",
    tone: "default" as const,
  },
];
