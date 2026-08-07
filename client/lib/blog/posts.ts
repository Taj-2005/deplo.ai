/**
 * Blog registry — drives the /blog index and the sitemap.
 * Adding a post = one entry here + one page at app/blog/<slug>/page.tsx.
 */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** ISO date, used for display and sitemap lastModified. */
  date: string;
  readMinutes: number;
  tag: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "introducing-deplo",
    title: "Introducing deplo.ai — code goes in, production URL comes out",
    description:
      "Why we built a deployment platform that owns nothing: your repo deploys into your own Vercel and Render accounts, with stack detection, env wiring, and AI failure diagnosis doing the DevOps.",
    date: "2026-08-07",
    readMinutes: 6,
    tag: "Announcement",
  },
];

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
