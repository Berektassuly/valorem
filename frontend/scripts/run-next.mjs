import { spawnSync } from "node:child_process";
import path from "node:path";

const [subcommand, ...args] = process.argv.slice(2);

if (!subcommand) {
  throw new Error("Expected a Next.js subcommand.");
}

const command = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);

const result = spawnSync(command, [subcommand, ...args], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    NEXT_IGNORE_INCORRECT_LOCKFILE: "1",
  },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
