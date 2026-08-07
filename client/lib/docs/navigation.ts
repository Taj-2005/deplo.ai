/**
 * Docs navigation registry — the single source of truth for the docs portal.
 *
 * Drives: sidebar tree, breadcrumbs, previous/next links, search index,
 * and the sitemap. Adding a page = add one entry here + one page.tsx.
 * Order matters: prev/next follows the flattened order of this tree.
 */

export interface DocPage {
  /** URL path under /docs, e.g. "/docs/cli/commands" */
  href: string;
  title: string;
  /** One-line summary shown in search results and section indexes. */
  description: string;
  /** Extra search terms: commands, endpoints, error strings, synonyms. */
  searchTerms?: string[];
}

export interface DocSection {
  title: string;
  pages: DocPage[];
}

export const DOCS_NAV: DocSection[] = [
  {
    title: "Getting Started",
    pages: [
      {
        href: "/docs",
        title: "Overview",
        description: "What deplo.ai is and where to start.",
        searchTerms: ["home", "docs", "documentation", "start"],
      },
      {
        href: "/docs/getting-started/introduction",
        title: "Introduction",
        description: "What deplo.ai does, why it exists, key features, and supported platforms.",
        searchTerms: ["what is deplo", "why deplo", "features", "supported frameworks", "vision", "own accounts", "no lock-in"],
      },
      {
        href: "/docs/getting-started/quickstart",
        title: "Quickstart",
        description: "From GitHub sign-in to a live production URL in under ten minutes.",
        searchTerms: ["create account", "sign up", "connect github", "connect vercel", "connect render", "first deploy", "tutorial"],
      },
      {
        href: "/docs/getting-started/architecture-overview",
        title: "Architecture Overview",
        description: "The moving parts: dashboard, API, queue, detection engine, and providers.",
        searchTerms: ["how it works", "system design", "components", "high level"],
      },
    ],
  },
  {
    title: "Guides",
    pages: [
      {
        href: "/docs/guides/deployments",
        title: "Deployments",
        description: "What happens between clicking Deploy and getting a production URL.",
        searchTerms: ["deploy", "pipeline", "build commands", "logs", "status", "redeploy", "rollback", "stack detection", "analysis"],
      },
      {
        href: "/docs/guides/environment-variables",
        title: "Environment Variables",
        description: "How env vars are detected, scoped, wired between frontend and backend, and provided.",
        searchTerms: ["env", "NEXT_PUBLIC_API_URL", "VITE_API_URL", "FRONTEND_URL", "secrets", "waiting for env", "required variables"],
      },
      {
        href: "/docs/guides/monitoring",
        title: "Monitoring & Analytics",
        description: "Uptime, latency, server metrics, and privacy-friendly product analytics per project.",
        searchTerms: ["uptime", "latency", "cpu", "memory", "analytics", "insights.js", "pageviews", "visitors", "health"],
      },
      {
        href: "/docs/guides/troubleshooting",
        title: "Troubleshooting",
        description: "Common failures — OAuth, env vars, builds, deploys, API keys, webhooks — and their fixes.",
        searchTerms: ["error", "failed", "fix", "oauth failed", "build failed", "invalid api key", "repository not found", "private repo"],
      },
      {
        href: "/docs/guides/best-practices",
        title: "Best Practices",
        description: "Repository layout, env management, secrets, and production readiness.",
        searchTerms: ["monorepo", "structure", "secrets management", "production checklist", "recommendations"],
      },
    ],
  },
  {
    title: "Integrations",
    pages: [
      {
        href: "/docs/integrations/github",
        title: "GitHub",
        description: "OAuth sign-in, repository access, the GitHub App for private repos, and webhooks.",
        searchTerms: ["github oauth", "permissions", "private repositories", "github app", "webhooks", "branches", "repo sync"],
      },
      {
        href: "/docs/integrations/vercel",
        title: "Vercel",
        description: "Connecting your Vercel account and how frontend deployments land in it.",
        searchTerms: ["vercel oauth", "vercel integration", "frontend hosting", "vercel projects", "framework presets"],
      },
      {
        href: "/docs/integrations/render",
        title: "Render",
        description: "Connecting Render with a Personal API key and how backend services are created.",
        searchTerms: ["render api key", "rnd_", "web service", "backend hosting", "render workspace", "rotate key"],
      },
      {
        href: "/docs/integrations/roadmap",
        title: "Provider Roadmap",
        description: "Providers on the roadmap and how new providers plug into the platform.",
        searchTerms: ["railway", "cloudflare", "fly.io", "netlify", "coming soon", "future providers"],
      },
    ],
  },
  {
    title: "CLI",
    pages: [
      {
        href: "/docs/cli",
        title: "Overview & Installation",
        description: "The deplo CLI: install with npm, run with npx, requirements, and what it can do.",
        searchTerms: ["install cli", "npx @deplo.ai/cli", "npm i -g", "node 20", "terminal", "deplo command"],
      },
      {
        href: "/docs/cli/setup",
        title: "Setup Guide",
        description: "Complete first-run setup on a new machine: prerequisites through first deploy.",
        searchTerms: ["prerequisites", "first run", "verify installation", "update cli", "uninstall"],
      },
      {
        href: "/docs/cli/authentication",
        title: "Authentication",
        description: "Browser hand-off login, CLI tokens, headless machines, and CI.",
        searchTerms: ["deplo login", "cli token", "dpl_", "DEPLO_TOKEN", "logout", "revoke", "headless", "ssh"],
      },
      {
        href: "/docs/cli/commands",
        title: "Command Reference",
        description: "Every command: purpose, syntax, flags, examples, and expected output.",
        searchTerms: ["deplo deploy", "deplo status", "deplo logs", "deplo list", "deplo open", "deplo whoami", "deplo connect", "flags", "options"],
      },
      {
        href: "/docs/cli/configuration",
        title: "Configuration",
        description: "The config file, environment variables, and pointing the CLI at another API.",
        searchTerms: ["config.json", ".config/deplo", "DEPLO_API_URL", "DEPLO_WEB_URL", "NO_COLOR"],
      },
      {
        href: "/docs/cli/ci",
        title: "CI Usage",
        description: "Running deplo in GitHub Actions and other CI systems with DEPLO_TOKEN.",
        searchTerms: ["github actions", "ci cd", "pipeline", "automation", "exit codes", "--yes"],
      },
      {
        href: "/docs/cli/troubleshooting",
        title: "Troubleshooting",
        description: "CLI-specific issues: login loops, token errors, repo matching, and connectivity.",
        searchTerms: ["not signed in", "token expired", "no github remote", "repository not visible", "browser did not open"],
      },
    ],
  },
  {
    title: "API Reference",
    pages: [
      {
        href: "/docs/api",
        title: "Overview",
        description: "Base URL, authentication, versioning, rate limits, and error format.",
        searchTerms: ["rest api", "base url", "api/v1", "rate limit", "bearer token", "errors"],
      },
      {
        href: "/docs/api/authentication",
        title: "Authentication",
        description: "GitHub OAuth endpoints, JWTs, CLI tokens, and the current-user endpoint.",
        searchTerms: ["auth/github", "auth/me", "jwt", "cli-tokens", "bearer"],
      },
      {
        href: "/docs/api/repositories",
        title: "Repositories",
        description: "List, sync, and analyze repositories.",
        searchTerms: ["GET /repos", "POST /repos/sync", "analyze", "stack detection endpoint"],
      },
      {
        href: "/docs/api/deployments",
        title: "Deployments",
        description: "Start deployments, poll status and logs, provide env vars, cancel.",
        searchTerms: ["POST /deployments", "GET /deployments", "deployment status", "provide env", "cancel deployment"],
      },
      {
        href: "/docs/api/integrations",
        title: "Integrations",
        description: "Connection status, Vercel install URL, Render key connect/disconnect.",
        searchTerms: ["GET /integrations", "vercel install-url", "POST /integrations/render"],
      },
      {
        href: "/docs/api/monitoring",
        title: "Monitoring & Analytics",
        description: "Per-project health, uptime, server metrics, analytics, and the insights beacon.",
        searchTerms: ["projects monitoring", "projects analytics", "insights.js", "public beacon", "uptime api"],
      },
      {
        href: "/docs/api/cli-tokens",
        title: "CLI Tokens",
        description: "Create, list, and revoke long-lived CLI tokens.",
        searchTerms: ["POST /cli-tokens", "DELETE /cli-tokens", "dpl_ token api"],
      },
    ],
  },
  {
    title: "Concepts",
    pages: [
      {
        href: "/docs/concepts/architecture",
        title: "Architecture",
        description: "Deep dive: clean architecture layers, queue system, detection engine, AI analysis.",
        searchTerms: ["clean architecture", "bullmq", "redis", "postgres", "prisma", "groq", "detection engine", "diagrams"],
      },
      {
        href: "/docs/concepts/deployment-lifecycle",
        title: "Deployment Lifecycle",
        description: "Every state a deployment moves through, from repository to production URL.",
        searchTerms: ["PENDING", "ANALYZING", "WAITING_FOR_ENV", "DEPLOYING_BACKEND", "COMPLETED", "FAILED", "states", "lifecycle"],
      },
      {
        href: "/docs/concepts/authentication",
        title: "Authentication & Security",
        description: "OAuth flows, JWTs, CLI tokens, credential encryption, and the trust model.",
        searchTerms: ["security", "aes-256-gcm", "encryption", "token storage", "trust model", "sessions"],
      },
      {
        href: "/docs/concepts/project-structure",
        title: "Project Structure",
        description: "How the deplo.ai codebase is organized: client, server, CLI, and workers.",
        searchTerms: ["monorepo layout", "folder structure", "domain", "application", "infrastructure", "interfaces"],
      },
    ],
  },
  {
    title: "Resources",
    pages: [
      {
        href: "/docs/faq",
        title: "FAQ",
        description: "Billing, providers, deployments, security, performance — answered.",
        searchTerms: ["pricing", "free", "questions", "faq", "how much", "is it safe"],
      },
    ],
  },
];

/** Flat, ordered page list — powers prev/next and the search index. */
export const ALL_DOC_PAGES: Array<DocPage & { section: string }> = DOCS_NAV.flatMap((section) =>
  section.pages.map((page) => ({ ...page, section: section.title })),
);

export function findDocPage(href: string): (DocPage & { section: string }) | undefined {
  return ALL_DOC_PAGES.find((p) => p.href === href);
}

export function prevNext(href: string): {
  prev: (DocPage & { section: string }) | null;
  next: (DocPage & { section: string }) | null;
} {
  const i = ALL_DOC_PAGES.findIndex((p) => p.href === href);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? (ALL_DOC_PAGES[i - 1] ?? null) : null,
    next: i < ALL_DOC_PAGES.length - 1 ? (ALL_DOC_PAGES[i + 1] ?? null) : null,
  };
}
