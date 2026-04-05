# Valorem

![Valorem Overview](./docs/image.png)

Valorem is a monorepo for a Solana-based auction platform designed for regulated, high-value, real-world asset transfers. The repository brings together three layers of the system: Anchor programs for protocol enforcement, a shared TypeScript SDK for client integration, and a Next.js application for marketplace, issuer, profile, and compliance workflows.

## Repository Overview

- `frontend/` contains the Next.js 16 application, App Router pages, API routes, wallet sign-in flow, and marketplace/compliance orchestration.
- `packages/valorem-sdk/` contains the shared TypeScript SDK, including PDA helpers, instruction builders, account types, commitment utilities, and generated IDL exports.
- `contracts/` contains the Anchor workspace and the on-chain programs `valorem-auction` and `valorem-transfer-hook`.
- `docs/` contains long-form architecture, implementation, planning, and validation material.

## Quick Start

### Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL for local frontend and API development
- Rust, Solana CLI, and Anchor CLI if you plan to build or test the on-chain programs

Recommended protocol toolchain versions in this repository:

- Solana CLI `2.3.0`
- Anchor CLI `0.32.1`

### Install Dependencies

From the repository root:

```bash
npm install
```

The root `postinstall` step builds `@valorem/sdk`, so the frontend can consume current generated outputs immediately.

### Configure the Frontend Environment

Copy the example environment file and adjust it for your machine:

```bash
cp frontend/.env.example frontend/.env.local
```

On PowerShell, use:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
```

At minimum, set these values in `frontend/.env.local`:

- `DATABASE_URL` must point to a reachable PostgreSQL instance.
- `VALOREM_AUTH_SECRET` should be replaced with a local secret.
- The default Solana settings target devnet and can usually stay unchanged for local UI work.

### Start the Application

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Common Commands

| Location | Command | Purpose |
| --- | --- | --- |
| Repository root | `npm run dev` | Start the frontend application |
| Repository root | `npm run build` | Build the SDK, then build the frontend |
| Repository root | `npm run lint` | Run workspace lint and type-oriented checks |
| Repository root | `npm run test` | Run SDK and frontend tests |
| Repository root | `npm run typecheck` | Run SDK and frontend type checks |
| Repository root | `npm run protocol:build` | Build the Anchor workspace |
| Repository root | `npm run protocol:unit` | Run Rust unit tests for the protocol |
| Repository root | `npm run protocol:test` | Run Anchor integration tests |
| `frontend/` | `npm run dev` | Start only the Next.js app |
| `packages/valorem-sdk/` | `npm run build` | Rebuild the shared SDK |
| `contracts/` | `npm run build` | Run `anchor build` directly |

## Architecture

### System Layout

```text
frontend/ (Next.js app, API routes, wallet auth, UI state)
  -> frontend/lib/marketplace/ (Postgres-backed marketplace data and auth challenges)
  -> frontend/lib/protocol/ (auction init, compliance state, local protocol helpers)
  -> packages/valorem-sdk/ (client, PDAs, instructions, commitments, generated IDL)
  -> contracts/ (Anchor programs deployed to Solana)
```

### Workspace Responsibilities

- `frontend/` is the application layer. It renders the marketplace and issuer flows, validates environment configuration, exposes API routes for auctions and compliance cases, and synchronizes linked auction state from Solana RPC when contract addresses are present.
- `packages/valorem-sdk/` is the shared integration boundary. It exports the client, account helpers, discriminators, instruction builders, constants, commitment helpers, and generated program types consumed by the frontend.
- `contracts/` is the protocol layer. It holds the Anchor workspace configuration and the Rust programs responsible for auction logic and transfer restrictions.

### Integration Model

- The frontend uses PostgreSQL for marketplace records and wallet sign-in challenge storage.
- The frontend uses Solana RPC through `ValoremProtocolClient` from `@valorem/sdk` to fetch on-chain auction snapshots and keep linked auction status current.
- The Anchor workspace writes generated types to `packages/valorem-sdk/src/idl/generated`, which keeps the SDK and the app aligned with the protocol.
- The current app surface includes marketplace, auction detail, dashboard, issuer, and profile routes, plus API endpoints for auction creation, wallet authentication, and compliance case handling.

## Documentation

Start with the documentation index at [`docs/README.md`](./docs/README.md), then use the guides below depending on what you need.

### Architecture Documents

- [`docs/architecture/idea-core.md`](./docs/architecture/idea-core.md) explains the product thesis, sealed-bid model, and compliance-gated settlement design.
- [`docs/architecture/technical-implementation-core.md`](./docs/architecture/technical-implementation-core.md) explains the system split between the Solana protocol and the Next.js client.

### Area Guides

- [`frontend/README.md`](./frontend/README.md) covers application-specific development notes.
- [`packages/valorem-sdk/README.md`](./packages/valorem-sdk/README.md) covers the shared SDK boundary and local package workflow.
- [`contracts/README.md`](./contracts/README.md) covers the Anchor workspace layout and protocol commands.

### Additional References

- [`docs/implementation/execution-prompt.md`](./docs/implementation/execution-prompt.md) captures implementation-oriented working notes.
- [`docs/validation/host-validation-2026-04-02.md`](./docs/validation/host-validation-2026-04-02.md) records a previous environment validation run.

## Repository Layout

```text
.
|-- contracts/
|-- docs/
|-- frontend/
|-- packages/
|-- .devcontainer/
|-- .github/
|-- docker-compose.yml
|-- package.json
`-- README.md
```
