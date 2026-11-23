import type { NextConfig } from "next";
import path from "node:path";

// VERBA lives in its own folder inside the MESA repository, so Turbopack's root
// is pinned here (otherwise it would pick up MESA's lockfile one level up).
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(import.meta.dirname),
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
