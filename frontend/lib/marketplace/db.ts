import postgres from "postgres";
import { env } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __valoremSql__: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __valoremSchemaPromise__: Promise<void> | undefined;
}

function createSqlClient() {
  return postgres(env.DATABASE_URL, {
    idle_timeout: 10,
    max: 5,
    prepare: false,
  });
}

export function getSql() {
  globalThis.__valoremSql__ ??= createSqlClient();
  return globalThis.__valoremSql__;
}

export async function ensureMarketplaceSchema() {
  globalThis.__valoremSchemaPromise__ ??= (async () => {
    const sql = getSql();

    await sql`
      create table if not exists auctions (
        id uuid primary key,
        slug text not null unique,
        issuer_wallet text not null,
        contract_address text unique,
        title text not null,
        description text not null,
        image_base64 text not null,
        status text not null,
        settled_bidder text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        constraint auctions_status_check
          check (status in ('draft', 'bidding', 'reveal', 'settlement', 'completed'))
      )
    `;

    await sql`
      create table if not exists auth_challenges (
        id uuid primary key,
        wallet_address text not null,
        nonce text not null unique,
        message text not null,
        expires_at timestamptz not null,
        consumed_at timestamptz,
        created_at timestamptz not null default now()
      )
    `;

    await sql`
      create index if not exists auctions_marketplace_idx
      on auctions (status, created_at desc)
      where contract_address is not null and status <> 'completed'
    `;

    await sql`
      create index if not exists auctions_profile_idx
      on auctions (settled_bidder, created_at desc)
      where status = 'completed' and settled_bidder is not null
    `;

    await sql`
      create index if not exists auth_challenges_wallet_expires_idx
      on auth_challenges (wallet_address, expires_at desc)
    `;
  })();

  return globalThis.__valoremSchemaPromise__;
}
