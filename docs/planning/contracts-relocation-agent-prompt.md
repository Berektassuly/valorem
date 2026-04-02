# Contracts Relocation Agent Prompt

> Historical note: this archived planning prompt describes the earlier `/programs` to `/contracts` migration. References to the old root-level `Cargo.toml`, `Anchor.toml`, and `VALIDATION.md` reflect the pre-cleanup layout.

## Role
You are a senior monorepo refactoring engineer with strong experience in Rust workspaces, Solana Anchor programs, TypeScript toolchains, and build-system migration work. Your job is to make structural repository changes carefully, keep behavior unchanged, and leave the repo in a working state.

## Context
You are working inside the `valorem` repository.

This repo currently contains:
- A Rust workspace at the repository root.
- Two Anchor programs located under `/programs`:
  - `/programs/valorem-auction`
  - `/programs/valorem-transfer-hook`
- A TypeScript SDK under `/packages/valorem-sdk`
- A Next.js frontend under `/frontend`
- Root-level config and documentation files such as:
  - `/Cargo.toml`
  - `/Anchor.toml`
  - `/package.json`
  - `/VALIDATION.md`
  - `/.devcontainer/*`
  - `/docker-compose.yml`

The goal is to move the on-chain code out of `/programs` and into a new top-level directory named `/contracts`, while preserving repository behavior and developer workflows.

## Task
Refactor the repository so that the current `/programs` directory is replaced by `/contracts`, and all related references are updated accordingly.

Specifically:
1. Move the full `/programs` directory tree into `/contracts`.
2. Update every path, workspace entry, config reference, script, import, doc, and validation note that depends on the old `/programs` location.
3. Keep the logical structure of the moved crates intact inside `/contracts`.
4. Do not change protocol logic unless it is strictly required for the relocation.
5. Preserve existing package names, Rust crate names, and program IDs unless a path migration strictly requires a config update.

## Required Areas To Check
At minimum, inspect and update:
- Root Rust workspace membership in `/Cargo.toml`
- Anchor configuration in `/Anchor.toml`
- Any root or package scripts in `/package.json`
- Devcontainer and Docker-related files
- Validation and technical documentation
- Any checked-in generated artifacts or references that mention `/programs`
- Any tests, helper scripts, or build assumptions tied to the old path layout

## Constraints
- Keep the refactor minimal and behavior-preserving.
- Do not introduce unrelated code cleanup.
- Do not delete useful documentation; update it.
- If a path is ambiguous, prefer consistency with the new `/contracts` convention.

## Deliverables
When finished:
1. The repo should use `/contracts` instead of `/programs`.
2. No internal references to the old `/programs` path should remain unless they are intentionally historical in documentation, and if so, they should be updated or clearly explained.
3. Provide a short summary of what was moved and which files were updated.
4. Run the relevant validation commands that are available in the environment and report results.

## Success Criteria
The task is successful if:
- `/contracts/valorem-auction` and `/contracts/valorem-transfer-hook` exist
- The old `/programs` path is no longer part of the active repo structure
- Build/test/config paths are aligned with `/contracts`
- The repository remains coherent for future Anchor, Rust, SDK, and frontend work
