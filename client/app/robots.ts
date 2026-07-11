import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      // Explicitly allow major AI crawlers
      {
        userAgent: "GPTBot",
        allow: "/",
      },
      {
        userAgent: "Claude-Web",
        allow: "/",
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
      },
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "Bingbot",
        allow: "/",
      },
    ],
    sitemap: "https://www.deplo.in/sitemap.xml",
    host: "https://www.deplo.in",
  };
}
