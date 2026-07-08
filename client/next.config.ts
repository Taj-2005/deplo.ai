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

  // Swagger UI (proxied at /docs) redirects /docs → /docs/. Next.js strips
  // trailing slashes by default, which would bounce it straight back and cause
  // an infinite redirect loop. Skipping the redirect lets both forms proxy
  // through to the backend as-is.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      // User-facing API — transparently proxied to the backend.
      // Browser URL stays https://deplo.ai.taj.works/api/*
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
      // Swagger/OpenAPI docs served by the backend, kept on-domain so the
      // frontend never links out to the Render URL.
      {
        source: "/docs",
        destination: `${apiOrigin}/docs`,
      },
      {
        source: "/docs/:path*",
        destination: `${apiOrigin}/docs/:path*`,
      },
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
