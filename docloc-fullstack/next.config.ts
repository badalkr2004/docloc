import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@noble/curves", "@noble/ciphers", "@noble/hashes"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js needs 'unsafe-inline' for styles; tighten once on App Router stable
              "style-src 'self' 'unsafe-inline'",
              // Scripts: self + inline eval needed by Next.js dev/hydration
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Images: self + blob (document previews) + data URIs
              "img-src 'self' blob: data:",
              // Fonts: self
              "font-src 'self'",
              // Connections: self + Cloudflare R2 (presigned uploads/downloads)
              "connect-src 'self' https://*.r2.cloudflarestorage.com https://*.r2.dev",
              // Workers: blob (used by Web Crypto / future Web Workers)
              "worker-src 'self' blob:",
              // Frames: self only (PDF viewer uses blob iframe)
              "frame-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
