import type { NextConfig } from "next";

// Publicación estática (GitHub Pages): STATIC_EXPORT=1 y BASE_PATH=/MESA (nombre del repositorio).
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  ...(isStatic ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } } : {}),
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
