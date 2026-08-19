import type { NextConfig } from "next";
import path from "path";

// Backend origin for the Vercel Rewrite Proxy. This is a SERVER-ONLY variable
// (never exposed to the browser), so the backend URL stays invisible to users.
//   • Local dev  → unset, defaults to the local API on :4000
//   • Production → set on Vercel to the Render URL (https://deplo-ai.onrender.com)
// The browser only ever calls same-origin `/api/*`; Next.js proxies it here.
const apiOrigin = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  // GitHub profile pictures, shown in the dashboard sidebar and settings.
  // Rendered with `unoptimized` so they never consume Vercel's image quota;
  // the allowlist is declared anyway so the optimizer path also works.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },

  async rewrites() {
    return [
      // User-facing API — transparently proxied to the backend.
      // Browser URL stays https://www.deplo.in/api/*
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
      // NOTE: /docs is the first-party documentation portal (app/docs) —
      // no longer proxied to the backend Swagger UI. Swagger remains
      // available in development directly at the backend origin (/docs on
      // localhost:4000); it is disabled in production.
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "index, follow, max-image-preview:large, max-snippet:-1",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
