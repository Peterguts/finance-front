import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  webpack(config, { dev }) {
    if (dev) {
      const stub = path.resolve(__dirname, "lib/next-devtools-segment-stub.tsx");
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "next/dist/next-devtools/userspace/app/segment-explorer-node": stub,
        "next/dist/esm/next-devtools/userspace/app/segment-explorer-node": stub,
      };
    }
    return config;
  },
};

export default nextConfig;
