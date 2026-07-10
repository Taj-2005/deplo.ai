import type { FrameworkId, FrameworkKind, Language } from "../../domain/analysis/types";

/**
 * Declarative, weighted framework signatures. Detection is data-driven:
 * adding a framework means adding a signature here, never new control flow.
 *
 * Weight conventions (contribution to a candidate's raw score):
 *   primary dependency / manifest entry .... 0.6
 *   secondary dependency ................... 0.4–0.5
 *   framework config file .................. 0.4
 *   language manifest file ................. 0.3
 *   source content pattern ................. 0.4
 *   build/start script ..................... 0.1
 */

export interface DepIndicator {
  name: string;
  weight: number;
}
export interface FileIndicator {
  /** Path relative to the component root. */
  path: string;
  weight: number;
}
export interface ScriptIndicator {
  name: string;
  weight: number;
}
export interface ContentIndicator {
  /** File whose content is scanned (relative to component root). */
  file: string;
  pattern: RegExp;
  weight: number;
}

export interface FrameworkSignature {
  framework: FrameworkId;
  kind: FrameworkKind;
  language: Language;
  dependencies?: DepIndicator[];
  files?: FileIndicator[];
  scripts?: ScriptIndicator[];
  content?: ContentIndicator[];
}

/**
 * When several frameworks of the same kind match confidently, the primary is
 * the one with the highest priority (most specific / meta-framework wins).
 */
export const FRAMEWORK_PRIORITY: Record<FrameworkId, number> = {
  // frontend
  nextjs: 100,
  nuxt: 95,
  sveltekit: 95,
  remix: 92,
  gatsby: 90,
  astro: 88,
  angular: 85,
  vite: 70,
  vue: 60,
  svelte: 60,
  react: 50,
  "static-html": 10,
  // backend
  nestjs: 90,
  django: 88,
  "spring-boot": 86,
  fastapi: 85,
  flask: 80,
  fastify: 70,
  go: 62,
  express: 60,
  hono: 58,
  koa: 55,
  bun: 50,
  unknown: 0,
};

// Files whose contents the detector pre-reads for content-pattern matching.
export const CONTENT_SCAN_FILES = [
  "requirements.txt",
  "pyproject.toml",
  "Pipfile",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "manage.py",
  "main.py",
  "app.py",
  "wsgi.py",
  "asgi.py",
  "main.go",
] as const;

export const FRAMEWORK_SIGNATURES: FrameworkSignature[] = [
  // ── Frontend: JS/TS meta-frameworks ──────────────────────────────────────
  {
    framework: "nextjs",
    kind: "frontend",
    language: "typescript",
    dependencies: [{ name: "next", weight: 0.6 }],
    files: [
      { path: "next.config.js", weight: 0.4 },
      { path: "next.config.ts", weight: 0.4 },
      { path: "next.config.mjs", weight: 0.4 },
    ],
    scripts: [{ name: "build", weight: 0.1 }],
  },
  {
    framework: "nuxt",
    kind: "frontend",
    language: "typescript",
    dependencies: [
      { name: "nuxt", weight: 0.6 },
      { name: "nuxt3", weight: 0.6 },
    ],
    files: [
      { path: "nuxt.config.js", weight: 0.4 },
      { path: "nuxt.config.ts", weight: 0.4 },
    ],
  },
  {
    framework: "sveltekit",
    kind: "frontend",
    language: "typescript",
    dependencies: [{ name: "@sveltejs/kit", weight: 0.6 }],
    files: [
      { path: "svelte.config.js", weight: 0.4 },
      { path: "svelte.config.ts", weight: 0.4 },
    ],
  },
  {
    framework: "remix",
    kind: "frontend",
    language: "typescript",
    dependencies: [
      { name: "@remix-run/react", weight: 0.6 },
      { name: "@remix-run/node", weight: 0.4 },
    ],
    files: [
      { path: "remix.config.js", weight: 0.4 },
      { path: "remix.config.ts", weight: 0.4 },
    ],
  },
  {
    framework: "gatsby",
    kind: "frontend",
    language: "typescript",
    dependencies: [{ name: "gatsby", weight: 0.6 }],
    files: [
      { path: "gatsby-config.js", weight: 0.4 },
      { path: "gatsby-config.ts", weight: 0.4 },
    ],
  },
  {
    framework: "astro",
    kind: "frontend",
    language: "typescript",
    dependencies: [{ name: "astro", weight: 0.6 }],
    files: [
      { path: "astro.config.mjs", weight: 0.4 },
      { path: "astro.config.ts", weight: 0.4 },
      { path: "astro.config.js", weight: 0.4 },
    ],
  },
  {
    framework: "angular",
    kind: "frontend",
    language: "typescript",
    dependencies: [{ name: "@angular/core", weight: 0.6 }],
    files: [
      { path: "angular.json", weight: 0.4 },
      { path: ".angular-cli.json", weight: 0.3 },
    ],
  },
  // ── Frontend: base libraries / bundlers ──────────────────────────────────
  {
    framework: "vite",
    kind: "frontend",
    language: "typescript",
    dependencies: [{ name: "vite", weight: 0.5 }],
    files: [
      { path: "vite.config.ts", weight: 0.4 },
      { path: "vite.config.js", weight: 0.4 },
      { path: "vite.config.mjs", weight: 0.4 },
    ],
  },
  {
    framework: "vue",
    kind: "frontend",
    language: "typescript",
    dependencies: [{ name: "vue", weight: 0.5 }],
    files: [{ path: "vue.config.js", weight: 0.3 }],
  },
  {
    framework: "svelte",
    kind: "frontend",
    language: "typescript",
    dependencies: [{ name: "svelte", weight: 0.5 }],
  },
  {
    framework: "react",
    kind: "frontend",
    language: "typescript",
    dependencies: [
      { name: "react", weight: 0.5 },
      { name: "react-dom", weight: 0.2 },
      { name: "react-scripts", weight: 0.3 },
    ],
  },
  {
    framework: "static-html",
    kind: "static",
    language: "html",
    files: [
      { path: "index.html", weight: 0.5 },
      { path: "public/index.html", weight: 0.3 },
    ],
  },
  // ── Backend: Node ────────────────────────────────────────────────────────
  {
    framework: "nestjs",
    kind: "backend",
    language: "typescript",
    dependencies: [
      { name: "@nestjs/core", weight: 0.6 },
      { name: "@nestjs/common", weight: 0.3 },
    ],
    files: [{ path: "nest-cli.json", weight: 0.4 }],
  },
  {
    framework: "fastify",
    kind: "backend",
    language: "typescript",
    dependencies: [{ name: "fastify", weight: 0.6 }],
  },
  {
    framework: "hono",
    kind: "backend",
    language: "typescript",
    dependencies: [{ name: "hono", weight: 0.6 }],
  },
  {
    framework: "koa",
    kind: "backend",
    language: "typescript",
    dependencies: [{ name: "koa", weight: 0.6 }],
  },
  {
    framework: "express",
    kind: "backend",
    language: "typescript",
    dependencies: [{ name: "express", weight: 0.6 }],
  },
  {
    framework: "bun",
    kind: "backend",
    language: "typescript",
    files: [{ path: "bun.lockb", weight: 0.4 }],
    content: [{ file: "package.json", pattern: /"bun"\s*:/, weight: 0.2 }],
  },
  // ── Backend: Python ──────────────────────────────────────────────────────
  {
    framework: "fastapi",
    kind: "backend",
    language: "python",
    files: [
      { path: "requirements.txt", weight: 0.2 },
      { path: "pyproject.toml", weight: 0.2 },
    ],
    content: [
      { file: "requirements.txt", pattern: /^\s*fastapi\b/im, weight: 0.6 },
      { file: "pyproject.toml", pattern: /\bfastapi\b/i, weight: 0.6 },
      { file: "main.py", pattern: /FastAPI\s*\(/, weight: 0.5 },
      { file: "app.py", pattern: /FastAPI\s*\(/, weight: 0.5 },
      { file: "requirements.txt", pattern: /^\s*uvicorn\b/im, weight: 0.2 },
    ],
  },
  {
    framework: "django",
    kind: "backend",
    language: "python",
    files: [
      { path: "manage.py", weight: 0.5 },
      { path: "requirements.txt", weight: 0.1 },
    ],
    content: [
      { file: "requirements.txt", pattern: /^\s*django\b/im, weight: 0.6 },
      { file: "pyproject.toml", pattern: /\bdjango\b/i, weight: 0.6 },
      { file: "manage.py", pattern: /django/i, weight: 0.4 },
    ],
  },
  {
    framework: "flask",
    kind: "backend",
    language: "python",
    files: [
      { path: "requirements.txt", weight: 0.1 },
      { path: "wsgi.py", weight: 0.2 },
    ],
    content: [
      { file: "requirements.txt", pattern: /^\s*flask\b/im, weight: 0.6 },
      { file: "pyproject.toml", pattern: /\bflask\b/i, weight: 0.6 },
      { file: "app.py", pattern: /from\s+flask\s+import|Flask\s*\(/, weight: 0.5 },
      { file: "main.py", pattern: /from\s+flask\s+import|Flask\s*\(/, weight: 0.5 },
    ],
  },
  // ── Backend: Go & Java ───────────────────────────────────────────────────
  {
    framework: "go",
    kind: "backend",
    language: "go",
    files: [{ path: "go.mod", weight: 0.6 }],
    content: [
      { file: "go.mod", pattern: /gin-gonic\/gin/, weight: 0.3 },
      { file: "go.mod", pattern: /gofiber\/fiber/, weight: 0.3 },
      { file: "go.mod", pattern: /labstack\/echo/, weight: 0.3 },
      { file: "main.go", pattern: /package\s+main/, weight: 0.3 },
    ],
  },
  {
    framework: "spring-boot",
    kind: "backend",
    language: "java",
    files: [
      { path: "pom.xml", weight: 0.3 },
      { path: "build.gradle", weight: 0.3 },
      { path: "build.gradle.kts", weight: 0.3 },
    ],
    content: [
      { file: "pom.xml", pattern: /spring-boot/i, weight: 0.6 },
      { file: "build.gradle", pattern: /spring-boot|org\.springframework\.boot/i, weight: 0.6 },
      { file: "build.gradle.kts", pattern: /spring-boot|org\.springframework\.boot/i, weight: 0.6 },
    ],
  },
];
