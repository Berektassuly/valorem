import { PublicKey } from "@solana/web3.js";
import type {
  AuctionAccount,
  AuctionPhase,
  BidderStateAccount,
  ComplianceRecordAccount,
} from "@valorem/sdk";
import { buildBidCommitment } from "@valorem/sdk";
import { catalogAuctions } from "@/lib/catalog";
import type { AuctionRuntimeState } from "./types";

export const DEMO_WALLET_ADDRESS = "5XwsnwDrWQQuzJqY9mXC9bfHDTLxm7m5KKAB13Di8h66";
const DESK_ALPHA = "1ZfdvkVZyYq43HgcRFRYRdBLFCd2FvGLtJueCXMiR1D";
const DESK_BETA = "3ai7RkWouy7KrLNE2cMKC58g2gzijwfqkCkebEDSKiXj";
const DESK_GAMMA = "agQLrV6V3cnQZPWua24oziZeeapTkfK8KzU6U4dycg9";

function usdc(value: number): bigint {
  return BigInt(Math.round(value * 1_000_000));
}

function unixOffset(seconds: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + seconds);
}

function toPublicKey(value: string): PublicKey {
  return new PublicKey(value);
}

function buildAuctionBase(
  slug: string,
  options: {
    phase: AuctionPhase;
    depositAmount: bigint;
    reservePrice: bigint;
    assetAmount: bigint;
    biddingEndAt: bigint;
    revealEndAt: bigint;
    settlementWindow: bigint;
    activeSettlementStartedAt?: bigint;
    hasSettledBidder?: boolean;
    settledBidder?: string;
    totalProceeds?: bigint;
    totalSlashed?: bigint;
    totalWithdrawn?: bigint;
    assetDeposited?: boolean;
  },
): AuctionAccount {
  const catalog = catalogAuctions.find((entry) => entry.slug === slug);
  if (!catalog) {
    throw new Error(`Unknown catalog auction: ${slug}`);
  }

  return {
    issuer: toPublicKey(catalog.protocol.issuer),
    reviewerAuthority: toPublicKey(catalog.protocol.reviewer),
    assetMint: toPublicKey(catalog.protocol.assetMint),
    paymentMint: toPublicKey(catalog.protocol.paymentMint),
    assetVault: new PublicKey(new Uint8Array(32).fill(slug.length + 11)),
    paymentVault: new PublicKey(new Uint8Array(32).fill(slug.length + 37)),
    issuerPaymentDestination: toPublicKey(catalog.protocol.issuerPaymentDestination),
    transferHookConfig: new PublicKey(new Uint8Array(32).fill(slug.length + 17)),
    transferHookValidation: new PublicKey(new Uint8Array(32).fill(slug.length + 21)),
    auctionSeed: new Uint8Array(Buffer.from(catalog.protocol.auctionSeedHex, "hex")),
    phase: options.phase,
    bump: 255,
    assetDeposited: options.assetDeposited ?? true,
    hasSettledBidder: options.hasSettledBidder ?? false,
    settledBidder: toPublicKey(
      options.settledBidder ?? "11111111111111111111111111111111",
    ),
    depositAmount: options.depositAmount,
    reservePrice: options.reservePrice,
    assetAmount: options.assetAmount,
    totalDepositsHeld: 0n,
    totalSlashed: options.totalSlashed ?? 0n,
    totalProceeds: options.totalProceeds ?? 0n,
    totalWithdrawn: options.totalWithdrawn ?? 0n,
    biddingEndAt: options.biddingEndAt,
    revealEndAt: options.revealEndAt,
    settlementWindow: options.settlementWindow,
    activeSettlementStartedAt: options.activeSettlementStartedAt ?? 0n,
    maxBidders: 16,
    registeredBidders: 0,
    currentSettlementIndex: 0,
    rankedBidders: [],
  };
}

function buildBidderState(
  auctionAddress: string,
  bidder: string,
  params: Partial<BidderStateAccount> & {
    depositAmount: bigint;
    commitment?: Uint8Array;
  },
): BidderStateAccount {
  return {
    auction: toPublicKey(auctionAddress),
    bidder: toPublicKey(bidder),
    commitment: params.commitment ?? new Uint8Array(32),
    commitmentSubmittedAt: params.commitmentSubmittedAt ?? unixOffset(-10_000),
    bidAmount: params.bidAmount ?? 0n,
    revealTimestamp: params.revealTimestamp ?? 0n,
    depositAmount: params.depositAmount,
    rank: params.rank ?? 0,
    bump: params.bump ?? 255,
    depositPaid: params.depositPaid ?? true,
    revealed: params.revealed ?? false,
    settlementEligible: params.settlementEligible ?? false,
    complianceApproved: params.complianceApproved ?? false,
    settled: params.settled ?? false,
    depositRefunded: params.depositRefunded ?? false,
    depositSlashed: params.depositSlashed ?? false,
  };
}

function buildComplianceRecord(
  auctionAddress: string,
  bidder: string,
  reviewer: string,
  approved: boolean,
  expiresAt: bigint,
): ComplianceRecordAccount {
  return {
    auction: toPublicKey(auctionAddress),
    bidder: toPublicKey(bidder),
    reviewer: toPublicKey(reviewer),
    status: approved ? "approved" : "pending",
    attestationDigest: new Uint8Array(32).fill(approved ? 7 : 3),
    reviewedAt: approved ? unixOffset(-1_200) : 0n,
    expiresAt,
    bump: 255,
  };
}

export function createInitialMockProtocolState(): Record<string, AuctionRuntimeState> {
  const result: Record<string, AuctionRuntimeState> = {};

  for (const catalog of catalogAuctions) {
    const baseAuction =
      catalog.slug === "metropolitan-core-office-complex"
        ? buildAuctionBase(catalog.slug, {
            phase: "bidding",
            depositAmount: usdc(750_000),
            reservePrice: usdc(45_000_000),
            assetAmount: 5_000n,
            biddingEndAt: unixOffset(18 * 3600),
            revealEndAt: unixOffset(27 * 3600),
            settlementWindow: 48n * 3600n,
          })
        : catalog.slug === "jade-vault-portrait-series"
          ? buildAuctionBase(catalog.slug, {
              phase: "completed",
              depositAmount: usdc(250_000),
              reservePrice: usdc(2_400_000),
              assetAmount: 12n,
              biddingEndAt: unixOffset(-30 * 3600),
              revealEndAt: unixOffset(-20 * 3600),
              settlementWindow: 36n * 3600n,
              hasSettledBidder: true,
              settledBidder: DESK_ALPHA,
              totalProceeds: usdc(2_860_000),
            })
          : catalog.slug === "prime-manhattan-equity-token-42"
            ? buildAuctionBase(catalog.slug, {
                phase: "settlement",
                depositAmount: usdc(25_000),
                reservePrice: usdc(142_000),
                assetAmount: 1n,
                biddingEndAt: unixOffset(-72 * 3600),
                revealEndAt: unixOffset(-60 * 3600),
                settlementWindow: 24n * 3600n,
                activeSettlementStartedAt: unixOffset(-4 * 3600),
              })
            : catalog.slug === "obsidian-yield-note-7"
              ? buildAuctionBase(catalog.slug, {
                  phase: "reveal",
                  depositAmount: usdc(300_000),
                  reservePrice: usdc(8_700_000),
                  assetAmount: 700n,
                  biddingEndAt: unixOffset(-2 * 3600),
                  revealEndAt: unixOffset(10 * 3600),
                  settlementWindow: 36n * 3600n,
                })
              : catalog.slug === "rotterdam-logistics-hub-april"
                ? buildAuctionBase(catalog.slug, {
                    phase: "settlement",
                    depositAmount: usdc(500_000),
                    reservePrice: usdc(29_500_000),
                    assetAmount: 1_000n,
                    biddingEndAt: unixOffset(-40 * 3600),
                    revealEndAt: unixOffset(-30 * 3600),
                    settlementWindow: 48n * 3600n,
                    activeSettlementStartedAt: unixOffset(-6 * 3600),
                  })
                : buildAuctionBase(catalog.slug, {
                    phase: "bidding",
                    depositAmount: usdc(200_000),
                    reservePrice: usdc(11_900_000),
                    assetAmount: 640n,
                    biddingEndAt: unixOffset(30 * 3600),
                    revealEndAt: unixOffset(42 * 3600),
                    settlementWindow: 48n * 3600n,
                    assetDeposited: false,
                  });

    result[catalog.slug] = {
      catalog,
      auctionAddress: catalog.protocol.auctionAddress,
      auction: baseAuction,
      bidderStates: {},
      complianceRecords: {},
      minIncrement:
        catalog.slug === "prime-manhattan-equity-token-42" ? usdc(5_000) : usdc(250_000),
      paymentSymbol: "USDC",
      assetSymbol: "RWA",
    };
  }

  const prime = result["prime-manhattan-equity-token-42"];
  const primeBid = usdc(155_000);
  prime.auction.rankedBidders = [
    {
      bidder: toPublicKey(DEMO_WALLET_ADDRESS),
      amount: primeBid,
      revealTimestamp: unixOffset(-55 * 3600),
      disqualified: false,
      settled: false,
    },
    {
      bidder: toPublicKey(DESK_BETA),
      amount: usdc(151_000),
      revealTimestamp: unixOffset(-54 * 3600),
      disqualified: false,
      settled: false,
    },
  ];
  prime.auction.currentSettlementIndex = 0;
  prime.auction.registeredBidders = 2;
  prime.auction.totalDepositsHeld = prime.auction.depositAmount * 2n;
  prime.bidderStates[DEMO_WALLET_ADDRESS] = buildBidderState(
    prime.auctionAddress,
    DEMO_WALLET_ADDRESS,
    {
      depositAmount: prime.auction.depositAmount,
      bidAmount: primeBid,
      rank: 1,
      revealed: true,
      revealTimestamp: unixOffset(-55 * 3600),
      settlementEligible: true,
      complianceApproved: false,
    },
  );
  prime.bidderStates[DESK_BETA] = buildBidderState(prime.auctionAddress, DESK_BETA, {
    depositAmount: prime.auction.depositAmount,
    bidAmount: usdc(151_000),
    rank: 2,
    revealed: true,
    revealTimestamp: unixOffset(-54 * 3600),
  });
  prime.complianceRecords[DEMO_WALLET_ADDRESS] = buildComplianceRecord(
    prime.auctionAddress,
    DEMO_WALLET_ADDRESS,
    prime.catalog.protocol.reviewer,
    false,
    unixOffset(20 * 3600),
  );

  const jade = result["jade-vault-portrait-series"];
  jade.auction.rankedBidders = [
    {
      bidder: toPublicKey(DESK_ALPHA),
      amount: usdc(2_860_000),
      revealTimestamp: unixOffset(-21 * 3600),
      disqualified: false,
      settled: true,
    },
    {
      bidder: toPublicKey(DEMO_WALLET_ADDRESS),
      amount: usdc(2_840_000),
      revealTimestamp: unixOffset(-22 * 3600),
      disqualified: false,
      settled: false,
    },
  ];
  jade.auction.registeredBidders = 2;
  jade.bidderStates[DEMO_WALLET_ADDRESS] = buildBidderState(
    jade.auctionAddress,
    DEMO_WALLET_ADDRESS,
    {
      depositAmount: jade.auction.depositAmount,
      bidAmount: usdc(2_840_000),
      rank: 2,
      revealed: true,
      revealTimestamp: unixOffset(-22 * 3600),
    },
  );

  const rotterdam = result["rotterdam-logistics-hub-april"];
  rotterdam.auction.rankedBidders = [
    {
      bidder: toPublicKey(DESK_ALPHA),
      amount: usdc(31_800_000),
      revealTimestamp: unixOffset(-29 * 3600),
      disqualified: false,
      settled: false,
    },
    {
      bidder: toPublicKey(DESK_GAMMA),
      amount: usdc(31_400_000),
      revealTimestamp: unixOffset(-28 * 3600),
      disqualified: false,
      settled: false,
    },
  ];
  rotterdam.auction.registeredBidders = 2;
  rotterdam.auction.currentSettlementIndex = 0;
  rotterdam.auction.totalDepositsHeld = rotterdam.auction.depositAmount * 2n;
  rotterdam.bidderStates[DESK_ALPHA] = buildBidderState(rotterdam.auctionAddress, DESK_ALPHA, {
    depositAmount: rotterdam.auction.depositAmount,
    bidAmount: usdc(31_800_000),
    rank: 1,
    revealed: true,
    revealTimestamp: unixOffset(-29 * 3600),
    settlementEligible: true,
    complianceApproved: true,
  });
  rotterdam.complianceRecords[DESK_ALPHA] = buildComplianceRecord(
    rotterdam.auctionAddress,
    DESK_ALPHA,
    rotterdam.catalog.protocol.reviewer,
    true,
    unixOffset(18 * 3600),
  );

  const obsidian = result["obsidian-yield-note-7"];
  const unrevealedCommitment = buildBidCommitment({
    auction: obsidian.auctionAddress,
    bidder: DEMO_WALLET_ADDRESS,
    bidAmount: usdc(9_400_000),
    salt: new Uint8Array(32).fill(4),
  });
  obsidian.auction.registeredBidders = 1;
  obsidian.auction.totalDepositsHeld = obsidian.auction.depositAmount;
  obsidian.bidderStates[DEMO_WALLET_ADDRESS] = buildBidderState(
    obsidian.auctionAddress,
    DEMO_WALLET_ADDRESS,
    {
      depositAmount: obsidian.auction.depositAmount,
      commitment: unrevealedCommitment,
      revealed: false,
      rank: 0,
    },
  );

  return result;
}
