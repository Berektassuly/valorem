import { randomUUID } from "node:crypto";
import { Connection, PublicKey } from "@solana/web3.js";
import { ValoremProtocolClient } from "@valorem/sdk";
import { protocolMode, protocolRpcUrl } from "@/lib/protocol/config";
import { ensureMarketplaceSchema, getSql } from "./db";
import {
  createAuctionSlug,
  type AuctionLot,
  type CreateAuctionDraftInput,
  type LinkAuctionContractInput,
  type LotStatus,
} from "./types";

type AuctionRow = {
  id: string;
  slug: string;
  issuer_wallet: string;
  contract_address: string | null;
  title: string;
  description: string;
  image_base64: string;
  status: LotStatus;
  settled_bidder: string | null;
  created_at: Date;
  updated_at: Date;
};

type AuthChallengeRow = {
  id: string;
  wallet_address: string;
  nonce: string;
  message: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
};

declare global {
  var __valoremProtocolClient__: ValoremProtocolClient | undefined;
}

function mapAuctionRow(row: AuctionRow): AuctionLot {
  return {
    id: row.id,
    slug: row.slug,
    issuerWallet: row.issuer_wallet,
    contractAddress: row.contract_address,
    title: row.title,
    description: row.description,
    imageBase64: row.image_base64,
    status: row.status,
    settledBidder: row.settled_bidder,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function getProtocolClient() {
  globalThis.__valoremProtocolClient__ ??= new ValoremProtocolClient(
    new Connection(protocolRpcUrl, "confirmed"),
    "confirmed",
  );

  return globalThis.__valoremProtocolClient__;
}

async function listLinkedAuctionRows() {
  await ensureMarketplaceSchema();
  const sql = getSql();

  return sql<AuctionRow[]>`
    select *
    from auctions
    where contract_address is not null
    order by created_at desc
  `;
}

async function syncAuctionStatuses() {
  if (protocolMode !== "rpc") {
    return;
  }

  const sql = getSql();
  const client = getProtocolClient();
  const linkedAuctions = await listLinkedAuctionRows();

  await Promise.all(
    linkedAuctions.map(async (row) => {
      if (!row.contract_address) {
        return;
      }

      try {
        const snapshot = await client.fetchAuctionSnapshot(
          new PublicKey(row.contract_address),
        );
        if (!snapshot) {
          return;
        }

        const nextStatus = snapshot.auction.phase;
        const nextSettledBidder = snapshot.auction.hasSettledBidder
          ? snapshot.auction.settledBidder.toBase58()
          : null;

        if (
          nextStatus === row.status &&
          nextSettledBidder === row.settled_bidder
        ) {
          return;
        }

        await sql`
          update auctions
          set
            status = ${nextStatus},
            settled_bidder = ${nextSettledBidder},
            updated_at = now()
          where id = ${row.id}
        `;
      } catch {
        // Ignore RPC sync failures and keep the cached database state.
      }
    }),
  );
}

export async function listMarketplaceAuctions() {
  await ensureMarketplaceSchema();
  await syncAuctionStatuses();
  const sql = getSql();

  const rows = await sql<AuctionRow[]>`
    select *
    from auctions
    where contract_address is not null
      and status <> 'completed'
    order by created_at desc
  `;

  return rows.map(mapAuctionRow);
}

export async function listProfileAuctions(walletAddress: string) {
  await ensureMarketplaceSchema();
  await syncAuctionStatuses();
  const sql = getSql();

  const rows = await sql<AuctionRow[]>`
    select *
    from auctions
    where status = 'completed'
      and settled_bidder = ${walletAddress}
    order by updated_at desc
  `;

  return rows.map(mapAuctionRow);
}

export async function getAuctionBySlug(slug: string) {
  await ensureMarketplaceSchema();
  const sql = getSql();

  const [row] = await sql<AuctionRow[]>`
    select *
    from auctions
    where slug = ${slug}
    limit 1
  `;

  if (!row) {
    return null;
  }

  if (row.contract_address && protocolMode === "rpc") {
    await syncAuctionStatuses();
    const [freshRow] = await sql<AuctionRow[]>`
      select *
      from auctions
      where id = ${row.id}
      limit 1
    `;
    return freshRow ? mapAuctionRow(freshRow) : null;
  }

  return mapAuctionRow(row);
}

export async function createAuctionDraft(
  walletAddress: string,
  input: CreateAuctionDraftInput,
) {
  await ensureMarketplaceSchema();
  const sql = getSql();
  const id = randomUUID();
  const slug = createAuctionSlug(input.title, id);

  const [row] = await sql<AuctionRow[]>`
    insert into auctions (
      id,
      slug,
      issuer_wallet,
      title,
      description,
      image_base64,
      status
    )
    values (
      ${id},
      ${slug},
      ${walletAddress},
      ${input.title},
      ${input.description},
      ${input.imageBase64},
      'draft'
    )
    returning *
  `;

  return mapAuctionRow(row);
}

export async function linkAuctionContract(
  id: string,
  walletAddress: string,
  input: LinkAuctionContractInput,
) {
  await ensureMarketplaceSchema();
  const sql = getSql();

  const [row] = await sql<AuctionRow[]>`
    update auctions
    set
      contract_address = ${input.contractAddress},
      status = 'bidding',
      updated_at = now()
    where id = ${id}
      and issuer_wallet = ${walletAddress}
    returning *
  `;

  return row ? mapAuctionRow(row) : null;
}

export async function createAuthChallengeRecord(input: {
  id: string;
  walletAddress: string;
  nonce: string;
  message: string;
  expiresAt: string;
}) {
  await ensureMarketplaceSchema();
  const sql = getSql();

  const [row] = await sql<AuthChallengeRow[]>`
    insert into auth_challenges (
      id,
      wallet_address,
      nonce,
      message,
      expires_at
    )
    values (
      ${input.id},
      ${input.walletAddress},
      ${input.nonce},
      ${input.message},
      ${input.expiresAt}
    )
    returning *
  `;

  return row;
}

export async function getAuthChallengeRecord(
  id: string,
  walletAddress: string,
) {
  await ensureMarketplaceSchema();
  const sql = getSql();

  const [row] = await sql<AuthChallengeRow[]>`
    select *
    from auth_challenges
    where id = ${id}
      and wallet_address = ${walletAddress}
      and consumed_at is null
      and expires_at > now()
    limit 1
  `;

  return row ?? null;
}

export async function consumeAuthChallengeRecord(
  id: string,
  walletAddress: string,
) {
  await ensureMarketplaceSchema();
  const sql = getSql();

  const [row] = await sql<AuthChallengeRow[]>`
    update auth_challenges
    set consumed_at = now()
    where id = ${id}
      and wallet_address = ${walletAddress}
      and consumed_at is null
      and expires_at > now()
    returning *
  `;

  return row ?? null;
}
