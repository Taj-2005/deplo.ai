import type { MetadataRoute } from "next";
import { ALL_DOC_PAGES } from "@/lib/docs/navigation";

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

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...docs,
  ];
}

// When new routes go live, add them here:
// { url: `${BASE}/blog`,        changeFrequency: "weekly",  priority: 0.8 },
// { url: `${BASE}/changelog`,   changeFrequency: "weekly",  priority: 0.7 },
// { url: `${BASE}/pricing`,     changeFrequency: "monthly", priority: 0.6 },
