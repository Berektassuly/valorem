# Valorem: Technical Implementation

## System Objective

Valorem should be implemented as a two-layer system:

- an on-chain auction and settlement protocol on Solana
- a Next.js client that manages user interaction, wallet orchestration, and local sealed-bid preparation

The protocol should enforce auction state, deposits, reveal validation, ranking, settlement eligibility, and asset release conditions. The frontend should handle presentation, transaction assembly, wallet flows, and local secret management.

## Core On-Chain Design

The protocol should use an explicit state machine:

- `Bidding`
- `Reveal`
- `Settlement`
- `Completed`

Recommended responsibilities of the on-chain program:

- create and manage auction accounts
- accept sealed bid commitments
- escrow fixed earnest-money deposits in USDC
- verify reveal submissions against prior commitments
- determine winner and ordered fallback ranking
- hold the RWA asset in escrow until settlement conditions are met
- validate compliance eligibility before release
- slash deposits when reveal or settlement obligations are missed
- allow reassignment of settlement rights to the next bidder when required

Recommended account model:

- `Auction` PDA: canonical auction configuration and lifecycle state
- `BidderState` PDA per wallet per auction: commitment hash, deposit status, reveal status, ranking metadata, settlement status
- `ComplianceRecord` PDA: issuer-controlled approval record proving settlement eligibility
- escrow token accounts for USDC and the RWA token

Recommended token model:

- USDC for deposits and final payment
- Token-2022 for the RWA asset
- Transfer Hook restrictions so the asset cannot move outside approved settlement paths

## Commit-Reveal Flow

The sealed-bid mechanism should be split across client and program responsibilities.

Client-side responsibilities:

- accept the raw bid amount
- generate a random salt
- compute the commitment hash from bid amount and salt
- persist the bid amount and salt locally for later reveal
- submit only the commitment and deposit transaction during the bidding phase

On-chain responsibilities:

- store the commitment
- verify reveal inputs against the stored commitment
- mark the bid as valid only after successful reveal
- rank revealed bids and determine the winner

This division keeps bid size private during the auction while keeping reveal validation trustless.

## Settlement Model

Settlement should be explicitly separate from winner selection.

Required settlement logic:

- after reveal, the highest valid bidder becomes settlement-eligible rather than immediate owner
- the asset remains in escrow
- the winner must complete KYC, AML, and legal signing off-chain
- the issuer records approval through `ComplianceRecord`
- the winner pays the remaining amount
- the protocol releases the RWA asset only after compliance and payment checks pass

Failure handling:

- if the winner fails compliance or misses the settlement deadline, the deposit can be slashed
- settlement rights move to the next revealed and qualified bidder
- unrevealed bidders lose their deposit

## Frontend Analysis

The current frontend already exists as a design-first implementation in `frontend/`.

Current state:

- framework: `Next.js 16`, `React 19`, `TypeScript`, `Tailwind CSS 4`
- routing: App Router
- implemented routes: marketplace, auction details, issuer terminal, user dashboard
- component structure: reusable presentation components plus page-specific view components
- styling quality: coherent premium visual system with defined colors, typography, layout primitives, and reusable panels/tags/tables
- data source: static mock data from `frontend/lib/site-data.ts`
- validation status: `npm run lint` passes

Current limitation:

- the frontend is a visual shell, not a live protocol client
- there is no wallet integration
- there is no RPC layer
- there is no transaction construction or signing flow
- there is no local sealed-bid cryptography yet
- there is no on-chain account fetching
- there is no compliance workflow integration
- there is no real auction state machine wired into the UI

This means the frontend is already a valid design baseline, but it still needs to be converted from static presentation into a protocol-aware client.

## Recommended Frontend Evolution

The Next.js application should become the orchestration layer between the user and the Solana program.

Recommended frontend responsibilities:

- wallet connection and network checks
- reading auction and bidder accounts from Solana
- preparing commitment hashes locally
- storing reveal secrets locally per wallet and auction
- creating and submitting transactions for bid, reveal, settlement, refund, and admin actions
- rendering UI conditionally from on-chain state and wallet-specific bidder state
- exposing issuer workflows in a controlled admin interface

Recommended route model:

- `/marketplace`
- `/auctions/[slug]`
- `/dashboard`
- `/issuer`

Recommended integration principle:

- user actions should be signed client-side through the wallet
- the Next.js server layer may support indexing, caching, or compliance-related off-chain services
- the server should not replace user wallet authorization for auction participation

## Implementation Summary

Valorem is technically sound if implemented as a regulated auction protocol rather than a marketplace clone.

The essential architecture is:

- Solana program for auction integrity and settlement control
- USDC deposit and payment rails
- Token-2022 RWA custody and release restrictions
- client-side commit-reveal preparation
- Next.js frontend as the protocol-facing user interface

The current frontend already solves the visual layer. The remaining work is protocol implementation, client integration, and stateful auction operations.
