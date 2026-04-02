# Validation

## Host checks completed on 2026-04-02

This validation record was captured before the workspace cleanup moved the Rust and Anchor ownership files into `contracts/`. The equivalent protocol entry points are now:

- `npm run protocol:*` from the repository root
- `npm run build`, `npm run unit`, and `npm run test` from `contracts/`

The following commands were run successfully from `C:\Users\berek\valorem`:

```powershell
npm run lint
npm run test
npm run protocol:unit
npm run build
```

Observed results:

- `npm run lint`: passed for `@valorem/sdk` and `frontend`
- `npm run test`: passed
  - SDK: 4 tests passed
  - Frontend: 6 tests passed
- `npm run protocol:unit`: passed
  - `valorem-auction`: 4 Rust unit tests passed
  - `valorem-transfer-hook`: 3 Rust unit tests passed
- `npm run build`: passed
  - SDK TypeScript build passed
  - Next.js production build passed

## Host limitations observed

Full Anchor program compilation and `anchor test` are not available on the native Windows host in the current environment.

Direct host attempts:

```powershell
$env:NO_DNA='1'; npm run protocol:build
solana --version
```

Results:

- `npm run protocol:build` failed because `anchor build` could not find the required `build-sbf` command
- `solana --version` failed because `solana` is not installed on the host

This confirms the native host is missing the Solana CLI toolchain required for SBF compilation.

## Containerized validation path

The repo includes a containerized toolchain in:

- `.devcontainer/devcontainer.json`
- `.devcontainer/Dockerfile`
- `docker-compose.yml`

Intended full protocol validation flow:

```bash
docker compose build workspace
docker compose run --rm workspace bash -lc "NO_DNA=1 npm install && NO_DNA=1 npm run protocol:build"
docker compose run --rm workspace bash -lc "NO_DNA=1 npm install && NO_DNA=1 npm run protocol:test"
```

Container attempt status on this machine:

- `docker --version`: available
- `docker compose version`: available
- `docker compose run --rm workspace ...`: failed because the Docker Desktop Linux engine pipe was unavailable

The exact local error was:

```text
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```

## Notes

- Next.js builds emit `bigint: Failed to load bindings, pure JS will be used`, but the production build still completes successfully.
- Rust unit tests emit Anchor macro `unexpected cfg` warnings and a deprecation warning on the transfer-hook interface macro under host compilation. These are warnings, not current test failures.
- The current local/dev implementation assumes the auction payment path can use the same token program boundary as the rest of the settlement flow, which keeps the account model coherent for the containerized fixture environment. Production custody, treasury routing, and external compliance infrastructure remain external integrations.
