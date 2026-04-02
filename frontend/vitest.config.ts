import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "@valorem/sdk": path.resolve(__dirname, "../packages/valorem-sdk/src/index.ts"),
    },
  },
  test: {
    globals: true,
  },
});
