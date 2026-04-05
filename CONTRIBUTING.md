# Contributing to Valorem

Thanks for contributing to Valorem. This repository is a monorepo with three main areas:

- `frontend/` for the application
- `packages/valorem-sdk/` for the shared TypeScript SDK
- `contracts/` for the Anchor/Rust protocol workspace

## Prerequisites

Before you start, make sure you have:

- Node.js 22
- npm
- Rust stable
- Docker, if you want to run the containerized protocol checks used in CI

If you plan to work directly in `contracts/`, an Anchor-compatible environment is also recommended. The included devcontainer and Docker setup are the easiest way to get a consistent toolchain.

## Getting Started

From the repository root:

```bash
npm install
cp frontend/.env.example frontend/.env.local
npm run dev
```

Use the root workspace when possible. The root `package-lock.json` is the source of truth for JavaScript dependencies.

## Common Commands

From the repository root:

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run typecheck
npm run protocol:build
npm run protocol:test
npm run protocol:unit
```

Area-specific commands:

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run test
npm run typecheck
```

### SDK

```bash
cd packages/valorem-sdk
npm run build
npm run lint
npm run test
npm run typecheck
```

### Contracts

```bash
cd contracts
npm run build
npm run test
npm run unit
```

## Development Guidelines

- Keep changes focused on a single concern when possible.
- Add or update tests when behavior changes.
- Update documentation when setup, behavior, or architecture changes.
- Do not commit nested `package-lock.json` files; dependency management is centralized at the repository root.
- If protocol changes affect generated IDL artifacts consumed by the SDK or frontend, include the corresponding generated updates in the same pull request.

## Before Opening a Pull Request

Run the checks that match your change:

```bash
npm run lint
npm run test
npm run build
npm run protocol:unit
```

For protocol changes, also run full protocol validation in a compatible Anchor environment. The CI container workflow is a good reference:

```bash
docker compose build workspace
docker compose run --rm workspace bash -lc "NO_DNA=1 npm install && NO_DNA=1 npm run protocol:build"
docker compose run --rm workspace bash -lc "NO_DNA=1 npm install && NO_DNA=1 npm run protocol:test"
```

## Pull Request Notes

- Include a clear summary of what changed and why.
- Call out any follow-up work, tradeoffs, or known limitations.
- Include screenshots or recordings for user-facing frontend changes when helpful.
- Mention any environment, migration, or deployment implications in the PR description.

## Questions

If something in the setup or workflow is unclear, open an issue or ask in the relevant team channel before spending time on the wrong path. Small clarifications early save a lot of rework later.
