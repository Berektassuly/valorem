# Railway Seller Studio Asset Mint Investigation Prompt

## Role

You are a senior full-stack Solana and deployment engineer working inside the Valorem monorepo. Your job is to investigate production-like runtime inconsistencies affecting both the seller lot creation flow and the bidder commitment flow on Railway.

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

The Railway-hosted app shows contradictory state and inconsistent runtime behavior across seller and bidder flows.

Observed UI copy:

- `Protocol preset`
- `On-chain defaults`
- `The MVP sources protocol parameters from shared defaults. Each lot receives its own Token-2022 asset mint created at initialization time.`
- `Asset mint / Generated per lot`

Observed runtime failure while creating a lot:

- `Draft 12312-b68ab154 was created in PostgreSQL, but the on-chain step failed.`
- `Configured asset mint 8YnpgSQFExHfe5D5ugTDbg7BLicQPtaMuDM733En3LXN does not exist on devnet.`

Observed runtime failure while committing a bid:

- UI copy:
  - `Commit bid (USDC)`
  - `Parsed bid`
  - `$1`
  - `Submit commitment`
  - `Escrow deposit`
- error:
  - `Transaction simulation failed before wallet confirmation.`
  - `Program log: Error: insufficient funds`
  - `Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA failed: custom program error: 0x1`
  - `Program FG6nnyfyztJyn1Yzov6xHqfjRMJGTpHd6T5LwPJuruPS failed: custom program error: 0x1`

Additional facts:

- the same asset-mint error message is rendered twice in the UI
- the deployment is believed to be on the latest version
- `NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_MINT` was already removed from Railway env configuration
- the current local source inspection does not match the deployed runtime behavior
- the bidder UI labels the payment asset as `USDC`
- the protocol preset shows a concrete payment mint address, so the agent must verify whether the deployed payment mint is actually devnet USDC or a different mint that the UI is mislabeling as USDC

## Task

Investigate and fix the discrepancies between the source code and the Railway runtime.

You must determine which of the following is true, or whether multiple causes are involved:

1. Railway is serving an outdated build.
2. A build-time public environment variable is still being baked into the frontend bundle.
3. Another code path still injects `assetMintAddress`.
4. There is a stale cached deployment artifact or preview instance being hit.
5. The seller studio UI copy was updated, but the execution path still uses legacy shared-mint behavior.
6. Some Railway configuration, build caching, or runtime environment behavior is causing the mismatch.
7. The bidder commitment path is using a payment mint or balance assumption that does not match the deployed environment.
8. The UI labels or payment-token assumptions are misleading and causing invalid bidding attempts.

## Required Investigation Steps

1. Inspect all code paths that can call `initializeAuction(...)` and confirm whether any of them pass `assetMintAddress`.
2. Trace every use of `NEXT_PUBLIC_VALOREM_DEFAULT_ASSET_MINT` and determine whether it is still reachable in the active deployment path.
3. Verify whether the deployed Railway build truly corresponds to the current repository state.
4. Check whether Next.js public env values could have been embedded at build time before the env variable was removed.
5. Confirm whether the user is hitting the correct Railway deployment and not an older preview or cached frontend.
6. Explain why the runtime still emits `Configured asset mint ...` even though the UI claims per-lot mint generation.
7. Inspect the bidder `submitCommitment` path and confirm exactly which mint is being escrowed during commitment.
8. Verify whether the bidder wallet is expected to hold the correct token mint and whether the UI is accurately labeling that mint as USDC.
9. Explain whether the `insufficient funds` failure is caused by missing token balance, wrong token mint, wrong decimals assumption, missing ATA, or a deeper protocol bug.
10. Fix the root cause rather than hiding the error.

## Implementation Expectations

- Reproduce the issue first.
- Use the actual Railway deployment and runtime behavior as the source of truth for this bug.
- Do not assume the problem is solved just because the current source code looks correct.
- If the issue is build or deployment related, make the fix explicit and durable.
- If the issue is code-path related, remove the contradiction between UI copy and runtime behavior.
- If duplicate error rendering is still present, clean that up as a secondary fix after the main root cause is understood.
- Treat the seller flow and bidder flow as potentially related, because both depend on deployed mint configuration and client-side assumptions.

## Acceptance Criteria

The work is complete only if all of the following are true:

- seller studio on Railway no longer tries to validate a nonexistent preconfigured asset mint when the per-lot mint flow is expected
- the deployed runtime behavior matches the current source code intent
- the root cause is clearly identified and documented
- the fix is validated against the actual Railway-hosted app
- the user can create a lot without hitting the contradictory `Configured asset mint ... does not exist on devnet` failure in the per-lot mint flow
- the bidder commitment flow either succeeds with the correct payment token balance or fails with an accurate, non-misleading explanation
- the deployed UI does not mislabel a non-USDC mint as USDC

## Suggested Starting Points

- `frontend/components/views/seller-studio-view.tsx`
- `frontend/components/protocol/auction-action-panel.tsx`
- `frontend/components/providers/valorem-app-provider.tsx`
- `frontend/lib/protocol/auction-init.ts`
- `frontend/lib/marketplace/config.ts`
- `frontend/lib/protocol/runtime-state.ts`
- Railway deployment configuration
- Railway environment variables
- Railway build logs
- Next.js build output and cache behavior

## Working Style

- Reproduce first.
- Verify the active deployment, not just local code.
- Distinguish build-time env behavior from runtime env behavior.
- Verify token-mint assumptions before blaming wallet balances.
- Patch the real cause, then verify end-to-end on Railway.
