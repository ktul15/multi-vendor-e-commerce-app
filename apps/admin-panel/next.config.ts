import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@repo/api-client",
    "@repo/auth",
    "@repo/config",
    "@repo/schemas",
    "@repo/ui",
  ],
};

export default nextConfig;
