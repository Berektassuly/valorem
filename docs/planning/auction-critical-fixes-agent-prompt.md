# Auction Critical Fixes Agent Prompt

## Role

You are a senior full-stack Solana engineer working inside the Valorem monorepo. Your responsibility is to stabilize the auction MVP by fixing the current production-blocking issues in the seller flow and bidder flow. Work like an owner: reproduce the failures, identify the root causes, implement durable fixes, and verify the end-to-end behavior.

## Context

Valorem already has:

- seller-side lot creation backed by PostgreSQL
- on-chain auction initialization through the Anchor program
- a dynamic marketplace and lot detail pages
- a recently added participation UI that tries to hydrate live protocol state for database-backed lots

However, the MVP is currently blocked by two critical issues.

### Issue 1: Live lot pages fail with `Unexpected end of account data.`

Dynamic lot pages now try to load live protocol state, but the participation panel can fail with:

- `Live protocol state unavailable`
- `Unexpected end of account data.`

Observed behavior:

- the auction account exists on devnet
- the lot has a valid linked `contractAddress`
- the failure happens while hydrating the live protocol snapshot
- bidder and compliance account queries can return zero accounts, so the failure is not caused by those missing records
- the failure is reproducible through the SDK client path

Relevant files:

- `packages/valorem-sdk/src/client.ts`
- `packages/valorem-sdk/src/accounts.ts`
- `packages/valorem-sdk/src/bytes.ts`
- `frontend/components/providers/valorem-app-provider.tsx`
- `frontend/components/protocol/auction-action-panel.tsx`

Important context:

- the current test coverage mainly round-trips synthetic `Uint8Array` data
- the bug appears against real RPC-loaded account data
- the fix must work with actual Solana account payloads returned by `web3.js`

### Issue 2: Creating another lot fails during auction initialization preflight

The seller flow can fail before Phantom confirmation with a message like:

- `Auction initialization preflight failed.`
- `Program 11111111111111111111111111111111 failed: custom program error: 0x0`
- `Program JCdjq... failed: custom program error: 0x0`
- `Program FG6nny... failed: custom program error: 0x0`

Observed behavior:

- the first lot can initialize
- creating another lot with the same default asset mint fails
- the failure path runs through `initialize_auction` and then `valorem_transfer_hook::initialize_hook`
- transfer-hook support accounts are derived per asset mint, not per auction
- this means the current seller preset architecture incorrectly assumes one shared asset mint can back multiple lots

Relevant files:

- `contracts/valorem-auction/src/instructions.rs`
- `contracts/valorem-transfer-hook/src/lib.rs`
- `frontend/components/views/seller-studio-view.tsx`
- `frontend/lib/marketplace/config.ts`
- `frontend/lib/protocol/auction-init.ts`

Important product implication:

- `payment mint` can be shared
- `asset mint` currently behaves like a per-lot resource
- the seller flow is not MVP-safe if it continues to use one global default asset mint for every lot

## Task

Fix both blockers properly.

### Part A: Fix live protocol hydration for dynamic lots

You must:

1. Reproduce the `Unexpected end of account data.` failure on a real linked devnet lot.
2. Identify the exact root cause in the SDK decode path rather than masking the error in the UI.
3. Implement a robust fix so live auction accounts can be decoded correctly from real RPC responses.
4. Add regression coverage that would have caught this issue.
5. Verify that the dynamic lot participation panel can successfully hydrate live state after the fix.

### Part B: Fix the seller-side lot initialization model

You must:

1. Reproduce the preflight failure when creating another lot using the current default asset mint flow.
2. Confirm the root cause in the transfer-hook initialization path.
3. Redesign the seller initialization flow so the MVP can create multiple lots safely.
4. Choose the correct product-safe fix rather than a superficial workaround.

The correct fix should assume:

- one lot should not depend on reusing the same asset mint if the current hook architecture does not support that
- the UI and configuration should stop implying that one static asset mint can power unlimited new lots

## Implementation Expectations

- Fix the root cause, not just the error message.
- Do not hide failures behind generic UI states.
- Do not hardcode fake runtime snapshots.
- Do not ship a seller flow that only works once.
- If the right fix requires changing the seller UX or creation assumptions, do that explicitly.
- Preserve the existing visual language and general marketplace structure.

## Acceptance Criteria

The work is complete only if all of the following are true:

- a linked dynamic lot can load its live protocol state without the `Unexpected end of account data.` failure
- the participation panel becomes usable on a real lot page when the auction state is valid
- the SDK has regression coverage for the real decoding failure mode
- the seller flow can create multiple lots without failing because the same asset mint was reused incorrectly
- the product no longer implies an invalid one-mint-for-many-lots model
- type checks and relevant tests pass
- the fix is validated against real-world behavior, not only synthetic unit tests

## Suggested Starting Points

- `packages/valorem-sdk/src/bytes.ts`
- `packages/valorem-sdk/src/accounts.ts`
- `packages/valorem-sdk/src/client.ts`
- `frontend/components/providers/valorem-app-provider.tsx`
- `frontend/components/protocol/auction-action-panel.tsx`
- `frontend/components/views/seller-studio-view.tsx`
- `frontend/lib/protocol/auction-init.ts`
- `contracts/valorem-auction/src/instructions.rs`
- `contracts/valorem-transfer-hook/src/lib.rs`

## Working Style

- Reproduce first.
- Patch the real cause, not the symptom.
- Add regression tests for both bug classes where practical.
- Verify at least one real happy path for:
  - creating a new lot
  - opening the lot page
  - hydrating live auction state
  - reaching the bidder action surface
