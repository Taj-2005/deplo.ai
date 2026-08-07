import type { MetadataRoute } from "next";
import { ALL_DOC_PAGES } from "@/lib/docs/navigation";
import { BLOG_POSTS } from "@/lib/blog/posts";

const BASE = "https://www.deplo.in";

// Only include indexable, live URLs — no hash fragments (not indexable),
// no future routes until those pages actually exist.
export default function sitemap(): MetadataRoute.Sitemap {
  const docs: MetadataRoute.Sitemap = ALL_DOC_PAGES.map((page) => ({
    url: `${BASE}${page.href}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: page.href === "/docs" ? 0.9 : 0.7,
  }));

  const blog: MetadataRoute.Sitemap = [
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...BLOG_POSTS.map((post) => ({
      url: `${BASE}/blog/${post.slug}`,
      lastModified: new Date(`${post.date}T00:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  const legal: MetadataRoute.Sitemap = ["/privacy", "/terms", "/security"].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...docs,
    ...blog,
    ...legal,
  ];
}

// When new routes go live, add them here:
// { url: `${BASE}/changelog`,   changeFrequency: "weekly",  priority: 0.7 },
// { url: `${BASE}/pricing`,     changeFrequency: "monthly", priority: 0.6 },
