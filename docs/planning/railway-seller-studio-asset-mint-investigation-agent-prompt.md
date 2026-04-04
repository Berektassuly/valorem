# Railway Seller Studio Asset Mint Investigation Prompt

## Role

You are a senior full-stack Solana and deployment engineer working inside the Valorem monorepo. Your job is to investigate a production-like runtime inconsistency affecting the seller lot creation flow on Railway.

Operate like an owner. Do not stop at surface-level guesses. Reproduce the issue, verify the real runtime behavior, identify the root cause, and implement the correct fix.

## Context

Valorem has a seller flow that:

- creates a lot draft in PostgreSQL first
- initializes the auction on Solana next
- links the on-chain auction address back to the database record

The current source code strongly suggests that seller studio should create a fresh per-lot Token-2022 asset mint during auction initialization instead of relying on a preconfigured shared asset mint.

Relevant source observations:

- `frontend/components/views/seller-studio-view.tsx` calls `initializeAuction(...)` without passing `assetMintAddress`
- the seller UI shows:
  - `Asset mint / Generated per lot`
  - `Each lot receives its own Token-2022 asset mint created at initialization time.`
- `frontend/components/providers/valorem-app-provider.tsx` contains logic that creates a fresh mint when `assetMintAddress` is absent
- `frontend/lib/protocol/auction-init.ts` still contains validation logic for a preconfigured `asset mint` path and throws:
  - `Configured asset mint <pubkey> does not exist on devnet.`

This deployment is running on Railway, not just locally.

## Symptoms

The Railway-hosted app shows a contradictory state.

Observed UI copy:

- `Protocol preset`
- `On-chain defaults`
- `The MVP sources protocol parameters from shared defaults. Each lot receives its own Token-2022 asset mint created at initialization time.`
- `Asset mint / Generated per lot`

Observed runtime failure while creating a lot:

- `Draft 12312-b68ab154 was created in PostgreSQL, but the on-chain step failed.`
- `Configured asset mint 8YnpgSQFExHfe5D5ugTDbg7BLicQPtaMuDM733En3LXN does not exist on devnet.`

Additional facts:

- the same asset-mint error message is rendered twice in the UI
- the deployment is believed to be on the latest version
- `NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_MINT` was already removed from Railway env configuration
- the current local source inspection does not match the deployed runtime behavior

## Task

Investigate and fix the discrepancy between the source code and the Railway runtime.

You must determine which of the following is true, or whether multiple causes are involved:

1. Railway is serving an outdated build.
2. A build-time public environment variable is still being baked into the frontend bundle.
3. Another code path still injects `assetMintAddress`.
4. There is a stale cached deployment artifact or preview instance being hit.
5. The seller studio UI copy was updated, but the execution path still uses legacy shared-mint behavior.
6. Some Railway configuration, build caching, or runtime environment behavior is causing the mismatch.

## Required Investigation Steps

1. Inspect all code paths that can call `initializeAuction(...)` and confirm whether any of them pass `assetMintAddress`.
2. Trace every use of `NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_MINT` and determine whether it is still reachable in the active deployment path.
3. Verify whether the deployed Railway build truly corresponds to the current repository state.
4. Check whether Next.js public env values could have been embedded at build time before the env variable was removed.
5. Confirm whether the user is hitting the correct Railway deployment and not an older preview or cached frontend.
6. Explain why the runtime still emits `Configured asset mint ...` even though the UI claims per-lot mint generation.
7. Fix the root cause rather than hiding the error.

## Implementation Expectations

- Reproduce the issue first.
- Use the actual Railway deployment and runtime behavior as the source of truth for this bug.
- Do not assume the problem is solved just because the current source code looks correct.
- If the issue is build or deployment related, make the fix explicit and durable.
- If the issue is code-path related, remove the contradiction between UI copy and runtime behavior.
- If duplicate error rendering is still present, clean that up as a secondary fix after the main root cause is understood.

## Acceptance Criteria

The work is complete only if all of the following are true:

- seller studio on Railway no longer tries to validate a nonexistent preconfigured asset mint when the per-lot mint flow is expected
- the deployed runtime behavior matches the current source code intent
- the root cause is clearly identified and documented
- the fix is validated against the actual Railway-hosted app
- the user can create a lot without hitting the contradictory `Configured asset mint ... does not exist on devnet` failure in the per-lot mint flow

## Suggested Starting Points

- `frontend/components/views/seller-studio-view.tsx`
- `frontend/components/providers/valorem-app-provider.tsx`
- `frontend/lib/protocol/auction-init.ts`
- `frontend/lib/marketplace/config.ts`
- Railway deployment configuration
- Railway environment variables
- Railway build logs
- Next.js build output and cache behavior

## Working Style

- Reproduce first.
- Verify the active deployment, not just local code.
- Distinguish build-time env behavior from runtime env behavior.
- Patch the real cause, then verify end-to-end on Railway.
