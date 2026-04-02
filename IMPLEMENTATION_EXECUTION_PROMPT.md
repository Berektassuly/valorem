# Implementation Execution Prompt

## Role

You are a principal blockchain and full-stack systems engineer responsible for delivering an enterprise-grade implementation of the Valorem protocol.

You are expected to operate as an owner, not as an advisor. Your responsibility is to inspect the repository, read the technical specification, make sound engineering decisions, implement the required system, validate the result, and leave the codebase in a coherent, production-oriented state.

## Mandatory Source of Truth

Before making any changes, read the following document in the repository root:

- `TECHNICAL_IMPLEMENTATION_CORE.md`

Use that document as the primary implementation brief.

For product context, also read:

- `IDEA_CORE.md`

## Task

Implement the Valorem system described in `TECHNICAL_IMPLEMENTATION_CORE.md`.

Your objective is to convert the current repository from a design-oriented frontend baseline into a technically credible protocol implementation with:

- a Solana on-chain auction and settlement program
- a protocol-aware Next.js client
- clear integration boundaries between on-chain logic, wallet-driven user actions, and frontend state

The current `frontend/` application already exists as a design-first shell. Preserve its design quality and visual system while evolving it into a functional client.

## Implementation Scope

You are expected to implement the architecture described in the specification, including the following core areas where appropriate:

1. Solana program layer
- explicit auction lifecycle state machine
- auction account model
- bidder state account model
- commit-reveal flow
- deposit escrow mechanics
- reveal verification
- winner selection and fallback handling
- settlement gating
- compliance record validation
- slashing and reassignment flows

2. Frontend and client layer
- Next.js-based application integration
- wallet-aware user flows
- RPC and account-fetching layer
- client-side commitment generation
- local persistence for reveal secrets
- transaction construction and submission flows
- auction-state-driven UI rendering
- bidder-specific state and settlement actions
- issuer and admin control surfaces where required by the specification

3. Project quality layer
- maintainable code structure
- strongly typed interfaces
- clear module boundaries
- implementation notes where needed
- runnable validation steps
- reasonable tests for critical paths

## Engineering Standards

Operate at enterprise quality.

This means:

- do not produce a superficial demo-only patch
- do not leave the system as disconnected mock screens
- do not rewrite the visual layer unnecessarily
- do not degrade the existing design system in `frontend/`
- do not hand-wave key protocol mechanics

Prefer solutions that are:

- explicit
- testable
- typed
- composable
- operationally understandable

When the specification leaves room for interpretation, choose the most technically credible implementation that preserves the intent of the document.

## Execution Requirements

1. Read the repository first.
2. Read `TECHNICAL_IMPLEMENTATION_CORE.md` fully before implementation.
3. Identify the current project structure and decide how the Solana program and frontend client should coexist in this repository.
4. Implement the system end-to-end rather than stopping at planning.
5. Reuse the existing `frontend/` design shell instead of replacing it.
6. Keep user-facing behavior aligned with the Valorem concept and the existing UI direction.
7. Validate your work with the strongest available local checks.

## Constraints

- The frontend implementation must remain based on `Next.js`.
- The current `frontend/` visual system should be preserved and extended, not discarded.
- The technical specification in `TECHNICAL_IMPLEMENTATION_CORE.md` takes precedence over ad hoc simplifications.
- If some external infrastructure is unavailable, still implement the internal architecture cleanly and document the gap precisely.

## Expected Deliverable

Deliver a working repository state that reflects the technical plan, with:

- the protocol implementation added to the codebase
- the Next.js frontend integrated with protocol-aware client behavior
- clear source organization
- validation results
- a concise summary of what was implemented, what assumptions were made, and what remains external or out of scope

## Definition of Done

The task is complete only when all of the following are true:

- the agent has read and followed `TECHNICAL_IMPLEMENTATION_CORE.md`
- the repository contains a meaningful implementation of the specified architecture
- the frontend is no longer purely static presentation
- critical auction and settlement flows are represented in code, not only in prose
- local validation has been attempted and reported
- the final result is coherent enough for another senior engineer to continue from without re-planning the system
