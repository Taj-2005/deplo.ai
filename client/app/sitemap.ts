import type { MetadataRoute } from "next";

const BASE = "https://www.deplo.in";

// Only include indexable, live URLs — no hash fragments (not indexable),
// no future routes until those pages actually exist.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];
}

// When new routes go live, add them here:
// { url: `${BASE}/docs`,        changeFrequency: "weekly",  priority: 0.8 },
// { url: `${BASE}/blog`,        changeFrequency: "weekly",  priority: 0.8 },
// { url: `${BASE}/integrations`,changeFrequency: "monthly", priority: 0.7 },
// { url: `${BASE}/changelog`,   changeFrequency: "weekly",  priority: 0.7 },
// { url: `${BASE}/pricing`,     changeFrequency: "monthly", priority: 0.6 },
