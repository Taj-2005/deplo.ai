import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "deplo.ai",
    short_name: "deplo.ai",
    description:
      "AI-powered deployment orchestration. Connect your GitHub repo and get production-ready frontend and backend URLs in under 3 minutes — no DevOps knowledge required.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["developer-tools", "productivity", "utilities"],
  };
}
