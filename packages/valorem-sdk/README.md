# Valorem SDK

`packages/valorem-sdk/` is the shared TypeScript library used by the frontend and fed by protocol-generated artifacts.

This package is the boundary between protocol internals and app consumption. Shared account types, PDA helpers, commitment utilities, constants, instruction helpers, and checked-in generated IDL exports belong here.

## Work Here

Run these commands from `packages/valorem-sdk/`:

```bash
npm run build
npm run test
npm run typecheck
```

## Notes

- Generated IDL TypeScript lives in `src/idl/generated/`.
- The frontend consumes this package as `@valorem/sdk`.
- Root `postinstall` builds this package so the app has fresh shared outputs available quickly.
