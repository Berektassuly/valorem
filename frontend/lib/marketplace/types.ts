import { z } from "zod";

export const lotStatusSchema = z.enum([
  "draft",
  "bidding",
  "reveal",
  "settlement",
  "completed",
]);

export type LotStatus = z.infer<typeof lotStatusSchema>;

export const authSessionSchema = z.object({
  walletAddress: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string(),
});

export type AuthSession = z.infer<typeof authSessionSchema>;

export const auctionLotSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  issuerWallet: z.string(),
  contractAddress: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  imageBase64: z.string(),
  status: lotStatusSchema,
  settledBidder: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AuctionLot = z.infer<typeof auctionLotSchema>;

export const createAuctionDraftInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(24).max(4_000),
  imageBase64: z
    .string()
    .min(64)
    .max(6_500_000)
    .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,/),
});

export type CreateAuctionDraftInput = z.infer<typeof createAuctionDraftInputSchema>;

export const linkAuctionContractInputSchema = z.object({
  contractAddress: z.string().trim().min(32).max(64),
});

export type LinkAuctionContractInput = z.infer<typeof linkAuctionContractInputSchema>;

export function createAuctionSlug(title: string, id: string) {
  const slugBase = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${slugBase || "auction-lot"}-${id.slice(0, 8)}`;
}

