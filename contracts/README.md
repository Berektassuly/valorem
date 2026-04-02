# Valorem Contracts Workspace

`contracts/` is the single Anchor/Rust protocol workspace for Valorem. This is where on-chain programs, protocol-level Rust tests, and Anchor configuration belong.

This repository is not split into microservices. Multiple programs may live here, but they are developed as one protocol workspace with shared configuration and coordinated outputs.

## What Lives Here

- `Anchor.toml` for Anchor workspace configuration
- `Cargo.toml` and `Cargo.lock` for the Rust workspace
- `rust-toolchain.toml` for protocol toolchain expectations
- one directory per program, such as `valorem-auction/` and `valorem-transfer-hook/`

## Work Here

Run these commands from `contracts/` when you want to work on the protocol directly:

```bash
npm run build
npm run unit
npm run test
```

`anchor build` writes generated types to `../packages/valorem-sdk/src/idl/generated` so the SDK and frontend stay aligned with the protocol.
