import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  outputFileTracingIncludes: { "/**": ["./prisma/demo.db"] },
  partialPrefetching: false,
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
