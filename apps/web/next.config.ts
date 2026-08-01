import type { NextConfig } from "next";

const allowedOrigins = process.env.TRUSTED_ORIGINS
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => {
    try { return new URL(value).host; } catch { return value; }
  });

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@desafio/auth",
    "@desafio/config",
    "@desafio/database",
    "@desafio/engagement",
    "@desafio/game",
    "@desafio/operations",
    "@desafio/sailti",
    "@desafio/scoring",
    "@desafio/ui",
  ],
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      ...(allowedOrigins?.length ? { allowedOrigins } : {}),
    },
  },
};

export default nextConfig;
