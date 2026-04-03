import { hexToBytes, deriveAuctionPda } from "@valorem/sdk";
import { PublicKey } from "@solana/web3.js";

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

export type CatalogAuctionEntry = {
  slug: string;
  lot: string;
  title: string;
  category: string;
  location: string;
  issuerName: string;
  description: string;
  artwork: ArtworkVariant;
  protocol: {
    issuer: string;
    reviewer: string;
    assetMint: string;
    paymentMint: string;
    issuerPaymentDestination: string;
    auctionSeedHex: string;
    auctionAddress: string;
  };
  editorial: {
    eyebrow: string;
    summary: string;
    heroLabel: string;
    issuerNote: string;
    secondaryTitle: string;
    secondarySummary: string;
    secondaryArtwork: ArtworkVariant;
    diligence: string[];
  };
};

type CatalogSeedRecord = Omit<CatalogAuctionEntry, "protocol"> & {
  protocol: Omit<CatalogAuctionEntry["protocol"], "auctionAddress">;
};

function withDerivedAuctionAddress(entry: CatalogSeedRecord): CatalogAuctionEntry {
  const auctionAddress = deriveAuctionPda(
    new PublicKey(entry.protocol.issuer),
    hexToBytes(entry.protocol.auctionSeedHex),
  )[0].toBase58();

  return {
    ...entry,
    protocol: {
      ...entry.protocol,
      auctionAddress,
    },
  };
}

const catalogSeeds: CatalogSeedRecord[] = [
  {
    slug: "metropolitan-core-office-complex",
    lot: "Lot 01",
    title: "Metropolitan Core Office Complex",
    category: "Core real estate",
    location: "New York, NY",
    issuerName: "Helix Advisory",
    description:
      "Institutional book for a stabilized Class A office stack with supervised release and escrow-backed settlement.",
    artwork: "tower",
    protocol: {
      issuer: "BtsdcryyLWcCc2gHRVM1UuusWazZxNRXyEDJFjcnAFsc",
      reviewer: "BPC2AU69tLDeo214Cf4Uj9yRDtN5us2j27Qrx22JSjrk",
      assetMint: "8B5hHAXnUZWodTqTP3RyxQ5M739NH5ug1AXG5aGSdAhd",
      paymentMint: "8J6FPAxYgu1QMzp3e54LsfJUozfYMZo29eLjijfaP1e9",
      issuerPaymentDestination: "57Z6FmYb5C2iuKiRg8UHWFUSniGwX2x4PNcZNsd9Q11B",
      auctionSeedHex: "ff636428142147486b1e4a6dccb94b2bce146811744778794834e5cc137565de",
    },
    editorial: {
      eyebrow: "Auction dossier / Lot 01",
      summary:
        "A sharply composed auction detail view pairing the hero property asset with a more compact settlement state. The result stays premium, serious, and closer to a financial terminal than a SaaS dashboard.",
      heroLabel: "Primary asset",
      issuerNote:
        "Helix Advisory requested a conservative institutional posture: clean modules, restrained copper actions, and no speculative visual noise.",
      secondaryTitle: "Prime Manhattan Equity Token #42",
      secondarySummary:
        "A complementary certificate state demonstrates how the Valorem interface handles successful outcomes without breaking the monochrome, high-trust atmosphere.",
      secondaryArtwork: "orbital",
      diligence: [
        "Property engineering report and tenancy roll are represented as verified workflow checkpoints rather than placeholder copy.",
        "Settlement amount and payment timing are rendered from protocol state while keeping the original numeric emphasis and negative space.",
        "Supporting modules stay sparse so the composition still reads like an editorial auction terminal rather than a crowded dashboard.",
      ],
    },
  },
  {
    slug: "jade-vault-portrait-series",
    lot: "Lot 02",
    title: "Jade Vault Portrait Series",
    category: "Contemporary art",
    location: "Geneva, CH",
    issuerName: "North Ridge Fine Assets",
    description:
      "Monochrome portrait issuance structured for fractional auction access with controlled settlement windows.",
    artwork: "portrait",
    protocol: {
      issuer: "wcoT4SoijrCWg4ytz4xmistrC4e1Qki27KTVnjim3E9",
      reviewer: "6jFYy8CgGedT5ZnUjWBjqtJU9BETRpKMaFDFH8mMxwpw",
      assetMint: "4sBT7CkG4YwyfYzVgTQ5GsgNrFNubM6Ni6ZWUCsEm9Fw",
      paymentMint: "xjNrWEC9ejasgG22RWNT1n2LjreP46Zwm7bNJZ9Pbx8",
      issuerPaymentDestination: "2rJEkQhvNbcNu2MSzgDT2TeLEg8Fsj8UEqDzNxVvxAYG",
      auctionSeedHex: "483ba2ac009ac714837e025b3f857b262769149f7bb8639e97d525d5ac930786",
    },
    editorial: {
      eyebrow: "Auction dossier / Lot 02",
      summary:
        "A portrait-led issuance for limited counterparties, structured around commit-reveal bidding and a compliance-gated allocation window.",
      heroLabel: "Series asset",
      issuerNote:
        "North Ridge Fine Assets keeps the right rail deliberately spare so diligence, reserve state, and settlement eligibility remain the focal points.",
      secondaryTitle: "Series compliance release",
      secondarySummary:
        "The secondary module captures off-chain review progress, attestation status, and fallback sequencing without leaving the house style.",
      secondaryArtwork: "portrait",
      diligence: [
        "Issuer provenance files and series condition records are represented as structured review outputs.",
        "Fallback positions remain visible through settlement so secondary bidders can see when refund rights unlock.",
        "The visual system stays restrained even when the auction is in compliance review or reassignment mode.",
      ],
    },
  },
  {
    slug: "prime-manhattan-equity-token-42",
    lot: "Lot 03",
    title: "Prime Manhattan Equity Token #42",
    category: "Secondary certificate",
    location: "Manhattan, NY",
    issuerName: "Aster Capital",
    description:
      "Structured certificate for a supervised equity tranche, presented as a premium secondary book with immediate settlement state.",
    artwork: "orbital",
    protocol: {
      issuer: "7T35H1hCsbDHC9wN4Duk3H1PnmngU4LkA5ZypQFWC7AR",
      reviewer: "HsYceyKeyrvmMTjG4SMpxkGiGNp7nf5CXhZhMnFzj34v",
      assetMint: "Bq8vUtYX83qmdTV5kNjL8e9u2xbBweit78BJ9zHHvWF9",
      paymentMint: "HiYoCkKV77HwoFhKxgm5WBCkiQrgPtDRvfCoeZtuo11c",
      issuerPaymentDestination: "BbLhDXUZSkSHR6QDGsxbDZ8ZGvRvZ4hapegSfCQCiPE9",
      auctionSeedHex: "3b2aa41d45208828fb1d9518eb973725a35d1c734b2f5a80100d1491332e58c4",
    },
    editorial: {
      eyebrow: "Auction dossier / Lot 03",
      summary:
        "A secondary certificate already inside settlement, useful for testing compliance approval, payment completion, and transfer-hook release flows.",
      heroLabel: "Settlement candidate",
      issuerNote:
        "Aster Capital uses this lot as the model settlement flow, so the UI keeps payment, attestation, and final release states sharply framed.",
      secondaryTitle: "Settlement certificate",
      secondarySummary:
        "This certificate view is the clearest place to stage winner approval, remaining payment, and asset release confirmation.",
      secondaryArtwork: "orbital",
      diligence: [
        "The live protocol state mirrors the canonical settlement path through compliance approval and controlled release.",
        "Issuer controls can reject the active candidate and advance the right to settle to the next bidder.",
        "Transfer-hook constraints remain explicit in the protocol boundary while the interface reads directly from devnet state.",
      ],
    },
  },
  {
    slug: "obsidian-yield-note-7",
    lot: "Lot 04",
    title: "Obsidian Yield Note 07",
    category: "Structured credit",
    location: "London, UK",
    issuerName: "Monarch Structured Desk",
    description:
      "Short-dated specialty note displayed with muted copper controls, reveal gating, and conservative metrics.",
    artwork: "mist",
    protocol: {
      issuer: "5eLBpvBfbVeSkQJNgzWnVhuvJgEB7kCrhAJJhbRUu3kw",
      reviewer: "7fRkZbPBHS8SivhqhM3z5Ks28zrHgQ9DCcZaeWEqyYg9",
      assetMint: "ExWWjmwr7LGSdp7xksVcTzLRpdXxpskxUSwSh29ULgQo",
      paymentMint: "8Ey4K245WviQSZP8fEQMRB1ziaF8NCzPLVHw4QDj3HiV",
      issuerPaymentDestination: "3fYnCNB6yqrf5wmdHeCkAdjeRbhkGN6HvSVannVQRZwh",
      auctionSeedHex: "c8081857085ae5d0b1f0ddb825d0e2da62bb9a46f38e02f884ef735db0666782",
    },
    editorial: {
      eyebrow: "Auction dossier / Lot 04",
      summary:
        "A live structured-credit book that demonstrates fixed earnest deposits, reveal ranking, and slashing of unrevealed bids.",
      heroLabel: "Note structure",
      issuerNote:
        "The desk keeps visual emphasis on reserve, deposit size, and the close window rather than speculative product chrome.",
      secondaryTitle: "Fallback sequence",
      secondarySummary:
        "If the lead bidder misses settlement or fails review, the next revealed bidder is promoted with a clean restart of the settlement timer.",
      secondaryArtwork: "mist",
      diligence: [
        "Revealed bidders stay visible until their refund rights are actually unlocked.",
        "Unrevealed bidders are isolated from settlement and their deposits can be slashed after reveal close.",
        "The darker copper accents are reserved for decisive settlement-state transitions only.",
      ],
    },
  },
  {
    slug: "rotterdam-logistics-hub-april",
    lot: "Lot 05",
    title: "Logistics Hub Rotterdam April",
    category: "Industrial logistics",
    location: "Rotterdam, NL",
    issuerName: "Axis Freight Holdings",
    description:
      "Industrial distribution asset with a textile-like visual cadence translated into a protocol-aware settlement book.",
    artwork: "textile",
    protocol: {
      issuer: "38iLWGBiKKYJ9xANmHShkPAPPCB9wm2jDumc7Qz1Uu7i",
      reviewer: "3DcNR3M3TyzX3KszVqvnqALEh5rRy4RicjjQPtuiBak8",
      assetMint: "F7yaaJMdAmT2Jtgwak9dNgU65iLtSjkHpAHrxc75Ur2A",
      paymentMint: "39FYoqNNigcw41CSY15w87rkUJKhShTAYnHq5Jq5Zp8M",
      issuerPaymentDestination: "J6ctGwesqoMDD9JFbSTEj1AvFEGNBDP1ucnn4A9mHHh4",
      auctionSeedHex: "29a3ab4623e91a4d01ef65c64f9a55da8ee6cb0beb59c433ae4ece7b08a4c259",
    },
    editorial: {
      eyebrow: "Auction dossier / Lot 05",
      summary:
        "An open industrial allocation with a long close window, useful for testing multiple committed but not yet revealed participants.",
      heroLabel: "Industrial allocation",
      issuerNote:
        "Axis Freight Holdings prefers a calmer auction page with more emphasis on participant state and less on issuer commentary.",
      secondaryTitle: "Qualified fallback pool",
      secondarySummary:
        "This lot keeps several eligible fallback bidders in view so refund gating and reassignment logic remain visible.",
      secondaryArtwork: "textile",
      diligence: [
        "Industrial occupancy and documentation notes remain secondary to the auction-control surface.",
        "The live flow demonstrates how the dashboard keeps fallback positions legible without cluttering the main marketplace.",
        "Settlement promotion and refund release remain the key functional states on this asset.",
      ],
    },
  },
  {
    slug: "arc-light-mineral-rights-c",
    lot: "Lot 06",
    title: "Arc Light Mineral Rights C",
    category: "Specialty rights",
    location: "West Texas, US",
    issuerName: "Meridian Resource Partners",
    description:
      "A specialty-rights issuance with diagrammatic visuals and operationally explicit auction state.",
    artwork: "schema",
    protocol: {
      issuer: "6FE5hzZzh4Ei6nWZ8BjrEXdbB58MuCmLyo9JWBHuhNpW",
      reviewer: "5gCCsJ58rfZhqeyzjHHpJi9KqsCF8zQJmXPDJpvJs9YV",
      assetMint: "BqZVxSPviChtb94VRLdnGq6hfK14mTaKkN72KwLRx5ed",
      paymentMint: "7fngr3ypgLxsDzVQf96rbXCTEbic8tPGPm2AkLfBkjSM",
      issuerPaymentDestination: "9B8R3bTVGFCbp8yk249zUHHPsTe86xf4ZEQxBrjCfTqv",
      auctionSeedHex: "015f51b5d5fac31d50c88eead4d515b2b3cdd353df192086af2aa2441f44d510",
    },
    editorial: {
      eyebrow: "Auction dossier / Lot 06",
      summary:
        "A watch-state specialty issuance that is useful for issuer-side controls, preview setup, and launch preparation.",
      heroLabel: "Specialty rights",
      issuerNote:
        "Meridian uses this slot as a staging area for upcoming books, so preview and launch actions are especially prominent.",
      secondaryTitle: "Issuer staging",
      secondarySummary:
        "The secondary surface keeps launch-readiness, compliance blockers, and book publication decisions visible in a tight module.",
      secondaryArtwork: "schema",
      diligence: [
        "The asset is ideal for showing issuer controls before a book is publicly opened.",
        "Preview readiness, reviewer assignment, and reserve calibration remain deliberate and sparse.",
        "The same compositional system works for both live books and pre-launch staging.",
      ],
    },
  },
];

export const catalogAuctions = catalogSeeds.map(withDerivedAuctionAddress);

export function getCatalogAuction(slug: string) {
  return catalogAuctions.find((entry) => entry.slug === slug) ?? null;
}

export const marketplaceDeskNotes = [
  "Metropolitan Core Office Complex received two additional institutional indications above reserve.",
  "Prime Manhattan Equity Token #42 remains in supervised settlement with payment and attestation both required for release.",
  "Logistics Hub Rotterdam April keeps fallback bidders active while the current candidate moves through review.",
];
