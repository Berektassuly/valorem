import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const [subcommand, ...args] = process.argv.slice(2);

if (!subcommand) {
  throw new Error("Expected a Next.js subcommand.");
}

const require = createRequire(import.meta.url);
const nextCliEntrypoint = require.resolve("next/dist/bin/next");

const result = spawnSync(process.execPath, [nextCliEntrypoint, subcommand, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_IGNORE_INCORRECT_LOCKFILE: "1",
  },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
