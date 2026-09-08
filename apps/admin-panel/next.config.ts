import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverSourceMaps: false },
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  transpilePackages: [
    "@repo/api-client",
    "@repo/auth",
    "@repo/config",
    "@repo/observability",
    "@repo/schemas",
    "@repo/ui",
  ],
};

export default nextConfig;
