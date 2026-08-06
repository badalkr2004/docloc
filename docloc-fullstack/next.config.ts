import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@noble/curves", "@noble/ciphers", "@noble/hashes"],
};

export default nextConfig;
