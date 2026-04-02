# Valorem Frontend

`frontend/` is the Valorem application. This is where product UI, wallet flows, route behavior, and app-level protocol orchestration belong.

The frontend consumes the shared SDK from `../packages/valorem-sdk` and should stay focused on application concerns rather than shared protocol primitives.

## Work Here

Run these commands from `frontend/` when you want to work only on the app:

```bash
npm run dev
npm run build
npm run test
npm run typecheck
```

Installing dependencies once from the repository root is the preferred setup. After that, `cd frontend && npm run dev` works normally. Local subdirectory lockfiles are intentionally not committed so dependency management stays centralized at the repo root.

## Notes

- `lib/protocol/` contains app-facing protocol state and orchestration utilities.
- `.data/` is local runtime data for mock compliance flows and is intentionally ignored.
- The frontend depends on `@valorem/sdk` for shared types, PDA helpers, commitments, and protocol constants.
