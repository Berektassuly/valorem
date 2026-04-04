# Auction Participation UI Agent Prompt

## Role

You are a senior full-stack product engineer working inside the Valorem monorepo. Your job is to finish the missing auction participation interface for the MVP without breaking the existing seller flow, on-chain integration, or marketplace styling. Work like an owner: inspect the current implementation, identify the real UI/runtime gap, implement the missing interface end-to-end, and verify the result.

## Context

Valorem already supports seller-side lot creation and on-chain auction initialization. The protocol and frontend provider already contain wallet actions for bidder participation, including commitment submission, reveal, refund, and settlement. However, the current MVP is incomplete from a user perspective because the participation UI is not actually wired into the live lot pages.

What is already true in the codebase:

- `frontend/components/providers/valorem-app-provider.tsx` already exposes protocol actions such as:
  - `submitCommitment`
  - `revealBid`
  - `claimRefund`
  - `settleCandidate`
  - plus wallet-aware runtime helpers like `getAuction` and `getWalletAuctionState`
- `frontend/components/protocol/auction-action-panel.tsx` already exists and renders a bid action rail, but it is currently not mounted anywhere in the application
- `frontend/app/auctions/[slug]/page.tsx` loads dynamic lot records from PostgreSQL via `getAuctionBySlug`
- `frontend/components/views/auction-details-view.tsx` currently renders only the stored lot metadata, status, and audit trail
- `frontend/lib/marketplace/auction-store.ts` powers dynamic marketplace lots from PostgreSQL
- `frontend/components/providers/valorem-app-provider.tsx` currently builds live runtime state from `catalogAuctions`, which means newly created dynamic lots are not fully integrated into the bidder interaction flow

This means the current state is roughly:

- create lot: present
- initialize on-chain auction: present
- list lot in marketplace: present
- open lot detail page: present
- actually participate in the auction through the UI: incomplete

The product goal for the MVP is not just to show dynamic lots, but to let a second wallet open a live lot and interact with the auction lifecycle through the interface.

## Task

Implement the missing auction participation UI for dynamic lots.

Your work should include the following:

1. Diagnose the current gap between dynamic marketplace lots and the runtime protocol state used by the bidder action flow.
2. Integrate live protocol-backed auction actions into the lot detail experience for real database-backed lots, not just hardcoded catalog entries.
3. Ensure a user can open a live lot page and see the correct participation surface based on:
   - whether a wallet is connected
   - the current auction phase
   - that wallet's bidder state
   - compliance or settlement state where relevant
4. Mount or adapt the existing action panel where appropriate, but do not assume the current component structure is correct. Refactor if needed.
5. Make the UI feel intentional and production-ready within the existing design language. Preserve the established visual system rather than introducing an unrelated style.
6. Preserve the seller flow and the dynamic marketplace/profile filtering logic already implemented in the MVP.

## Requirements

- Support newly created dynamic lots loaded from PostgreSQL.
- Do not rely only on `catalogAuctions` for bidder interaction.
- The lot detail page should show live auction participation controls when the lot has a linked on-chain contract.
- Handle wallet states clearly:
  - disconnected
  - ready to commit
  - waiting for reveal
  - ready to reveal
  - waiting for compliance
  - ready to settle
  - ready to claim refund
  - no available action
- Show meaningful loading, empty, and error states.
- Keep the UI understandable for MVP users. The product should not require reading logs or using devtools to know what to do next.
- Reuse existing provider actions and protocol helpers where possible instead of rewriting protocol logic.
- If the current provider architecture prevents dynamic-lot participation, extend it cleanly rather than hacking around it in the page layer.

## Non-Goals

- Do not redesign the marketplace from scratch.
- Do not remove the PostgreSQL-backed lot flow.
- Do not rewrite the protocol unless you discover a genuine blocker that cannot be solved in the UI/runtime layer.
- Do not hardcode fake auction states just to make the interface appear complete.

## Acceptance Criteria

The implementation is complete only if all of the following are true:

- A dynamically created lot with a linked `contractAddress` can display live auction participation UI on its detail page.
- The UI reflects real protocol phase and wallet-specific action availability.
- A connected wallet can see the correct next action for that lot.
- The existing participation methods in the provider are actually reachable through the app UI.
- The solution works for dynamic marketplace lots rather than only static demo/catalog data.
- Type checks and relevant tests pass.

## Suggested Starting Points

- `frontend/app/auctions/[slug]/page.tsx`
- `frontend/components/views/auction-details-view.tsx`
- `frontend/components/protocol/auction-action-panel.tsx`
- `frontend/components/providers/valorem-app-provider.tsx`
- `frontend/lib/marketplace/auction-store.ts`
- `frontend/lib/protocol/runtime-state.ts`
- `frontend/lib/catalog.ts`

## Working Style

- Inspect the current code before changing architecture.
- Prefer a small number of coherent changes over scattered patches.
- Keep the UX clear and deterministic.
- Verify the happy path and obvious failure states.
- Leave the codebase in a state where the MVP meaningfully supports both creation and participation.
