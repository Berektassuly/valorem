import path from "node:path";
import type { NextConfig } from "next";
import { env } from "./lib/env";

void env;

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
