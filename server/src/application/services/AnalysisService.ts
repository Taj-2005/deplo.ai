import { GitHubAdapter } from "../../infrastructure/github/GitHubAdapter";
import type { DetectedStack, StackType, EnvVariable } from "../../domain/deployment/Deployment";
import { decrypt } from "../../shared/utils/crypto";
import { logger } from "../../shared/logger/logger";

// ─── Env var scanning ────────────────────────────────────────────────────────

/**
 * Vars that deplo.ai auto-injects or the hosting platform manages.
 * Never ask the user to supply these — we set them ourselves at deploy time.
 */
const AUTO_INJECTED_VARS = new Set([
  "NODE_ENV",
  "PORT",
  // deplo.ai injects the backend URL as NEXT_PUBLIC_API_URL for frontend builds
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_BACKEND_URL",
  "BACKEND_URL",
  "FRONTEND_URL",
  // Vercel platform variables — injected automatically
  "VERCEL_URL",
  "VERCEL_ENV",
  "VERCEL_REGION",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_REF",
  "VERCEL_GIT_PROVIDER",
  "VERCEL_DEPLOYMENT_ID",
]);

/** .env file names to try, in priority order */
const ENV_FILE_NAMES = [
  ".env.example",
  ".env.local.example",
  ".env.sample",
  ".env.template",
  ".env.example.local",
];

/**
 * Source files most likely to concentrate all env var references.
 * Scanned in parallel; existence is checked gracefully (returns null if missing).
 */
const SOURCE_FILES_TO_SCAN = [
  // Config / env modules (highest signal)
  "src/config/env.ts", "src/config/env.js",
  "src/config/index.ts", "src/config/index.js",
  "config/env.ts", "config/env.js",
  "config/index.ts", "config/index.js",
  "src/lib/env.ts", "src/lib/env.js",
  "src/lib/config.ts", "src/lib/config.js",
  // App / server entry points
  "src/index.ts", "src/index.js",
  "src/app.ts", "src/app.js",
  "src/server.ts", "src/server.js",
  "index.ts", "index.js",
  "app.ts", "app.js",
  "server.ts", "server.js",
  // Next.js / Vite config (may reference env vars)
  "next.config.ts", "next.config.js",
  "vite.config.ts", "vite.config.js",
];

const PROCESS_ENV_RE = /process\.env\.([A-Z_][A-Z0-9_]+)/g;
const IMPORT_META_RE = /import\.meta\.env\.([A-Z_][A-Z0-9_]+)/g;

function scanForEnvKeys(content: string): string[] {
  const keys = new Set<string>();
  for (const m of content.matchAll(PROCESS_ENV_RE)) if (m[1]) keys.add(m[1]);
  for (const m of content.matchAll(IMPORT_META_RE)) if (m[1]) keys.add(m[1]);
  return Array.from(keys);
}

function parseEnvFile(content: string): Array<{ key: string; value: string; isRequired: boolean }> {
  const result: Array<{ key: string; value: string; isRequired: boolean }> = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    if (!key) continue;
    // Strip surrounding quotes to get the actual default value
    const value = raw.replace(/^["']|["']$/g, "");
    const isRequired =
      raw === "" ||
      raw.toUpperCase() === "REQUIRED" ||
      raw === '""' ||
      raw === "''";
    result.push({ key, value: isRequired ? "" : value, isRequired });
  }
  return result;
}

// ─── Monorepo heuristics ─────────────────────────────────────────────────────

const FRONTEND_HINTS = ["frontend", "client", "web", "ui", "app"];
const BACKEND_HINTS  = ["backend", "server", "api"];

function matchesHint(name: string, hints: string[]): boolean {
  const lower = name.toLowerCase();
  return hints.some((h) => lower === h || lower.includes(h));
}

// ─── Package.json shape ───────────────────────────────────────────────────────

interface PkgJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: { node?: string };
}

function parsePkg(raw: string | null): PkgJson | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as PkgJson; } catch { return null; }
}

function allDeps(pkg: PkgJson): Record<string, string> {
  return { ...pkg.dependencies, ...pkg.devDependencies };
}

// ─── Per-directory stack detection ───────────────────────────────────────────

interface DirAnalysis {
  frontend: StackType | null;
  backend: StackType | null;
  buildCommand: string | null;
  outputDir: string | null;
  nodeVersion: string | null;
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
}

async function analyzeDir(
  github: GitHubAdapter,
  token: string,
  fullName: string,
  dirPath: string,
): Promise<DirAnalysis | null> {
  const prefix = dirPath ? `${dirPath}/` : "";

  const [pkgRaw, nextJs, nextTs, viteTsConfig, viteJsConfig, yarnLock, pnpmLock, bunLock] =
    await Promise.all([
      github.getFileContent(token, fullName, `${prefix}package.json`),
      github.getFileContent(token, fullName, `${prefix}next.config.js`),
      github.getFileContent(token, fullName, `${prefix}next.config.ts`),
      github.getFileContent(token, fullName, `${prefix}vite.config.ts`),
      github.getFileContent(token, fullName, `${prefix}vite.config.js`),
      github.getFileContent(token, fullName, `${prefix}yarn.lock`),
      github.getFileContent(token, fullName, `${prefix}pnpm-lock.yaml`),
      github.getFileContent(token, fullName, `${prefix}bun.lockb`),
    ]);

  const pkg = parsePkg(pkgRaw);
  if (!pkg) return null;

  const deps = allDeps(pkg);
  const hasNextConfig = nextJs !== null || nextTs !== null;
  const hasViteConfig = viteTsConfig !== null || viteJsConfig !== null;

  let frontend: StackType | null = null;
  let backend: StackType | null = null;
  let buildCommand: string | null = null;
  let outputDir: string | null = null;

  if (hasNextConfig || deps["next"]) {
    frontend = "NEXTJS";
    buildCommand = "npm run build";
    outputDir = ".next";
  } else if (hasViteConfig || deps["vite"]) {
    frontend = "REACT_VITE";
    buildCommand = "npm run build";
    outputDir = "dist";
  }

  if (deps["fastify"]) {
    backend = "FASTIFY";
    if (!buildCommand) buildCommand = "npm run build";
  } else if (deps["express"]) {
    backend = "EXPRESS";
    if (!buildCommand) buildCommand = "npm run build";
  }

  const packageManager: "npm" | "yarn" | "pnpm" | "bun" =
    bunLock ? "bun" : pnpmLock ? "pnpm" : yarnLock ? "yarn" : "npm";

  const nodeVersion =
    pkg.engines?.node?.replace(/[^0-9.]/g, "") ?? null;

  return { frontend, backend, buildCommand, outputDir, nodeVersion, packageManager };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AnalysisService {
  constructor(private readonly github: GitHubAdapter) {}

  async analyzeRepository(
    encryptedToken: string,
    fullName: string,
  ): Promise<{ stack: DetectedStack; envVars: EnvVariable[] }> {
    const token = decrypt(encryptedToken);

    // 1. List root directory
    const rootEntries = await this.github.listDirectory(token, fullName, "");
    const rootDirNames = rootEntries.filter((e) => e.type === "dir").map((e) => e.name);

    // 2. Try root as a single-app first
    const rootAnalysis = await analyzeDir(this.github, token, fullName, "");

    // 3. Find monorepo subdirectories
    const frontendCandidate = rootDirNames.find((d) => matchesHint(d, FRONTEND_HINTS));
    const backendCandidate  = rootDirNames.find((d) => matchesHint(d, BACKEND_HINTS));

    // Also scan unmatched dirs whose names contain hints (e.g. "shopsmart-client")
    const extraFrontend = !frontendCandidate
      ? rootDirNames.find((d) => matchesHint(d, FRONTEND_HINTS))
      : undefined;
    const extraBackend = !backendCandidate
      ? rootDirNames.find((d) => matchesHint(d, BACKEND_HINTS))
      : undefined;

    const frontendDir = frontendCandidate ?? extraFrontend ?? null;
    const backendDir  = backendCandidate  ?? extraBackend  ?? null;

    // 4. Analyse subdirectories in parallel
    const [frontendAnalysis, backendAnalysis] = await Promise.all([
      frontendDir ? analyzeDir(this.github, token, fullName, frontendDir) : Promise.resolve(null),
      backendDir  ? analyzeDir(this.github, token, fullName, backendDir)  : Promise.resolve(null),
    ]);

    // 5. Build final stack — prefer explicit subdirectory matches over root
    let detectedFrontend: StackType | null = null;
    let detectedBackend:  StackType | null = null;
    let frontendPath = "";
    let backendPath  = "";
    let buildCommand: string | null = null;
    let outputDir:    string | null = null;
    let nodeVersion:  string | null = null;
    let packageManager: "npm" | "yarn" | "pnpm" | "bun" = "npm";

    // Frontend: prefer dedicated subdirectory
    if (frontendDir && frontendAnalysis?.frontend) {
      detectedFrontend = frontendAnalysis.frontend;
      frontendPath = frontendDir;
      buildCommand = frontendAnalysis.buildCommand;
      outputDir    = frontendAnalysis.outputDir;
      nodeVersion  = frontendAnalysis.nodeVersion;
      packageManager = frontendAnalysis.packageManager;
    } else if (!frontendDir && rootAnalysis?.frontend) {
      detectedFrontend = rootAnalysis.frontend;
      frontendPath = "";
      buildCommand = rootAnalysis.buildCommand;
      outputDir    = rootAnalysis.outputDir;
      nodeVersion  = rootAnalysis.nodeVersion;
      packageManager = rootAnalysis.packageManager;
    }

    // Backend: prefer dedicated subdirectory
    if (backendDir && backendAnalysis?.backend) {
      detectedBackend = backendAnalysis.backend;
      backendPath = backendDir;
      if (!nodeVersion) nodeVersion = backendAnalysis.nodeVersion;
      if (!packageManager || packageManager === "npm") packageManager = backendAnalysis.packageManager;
    } else if (!backendDir && rootAnalysis?.backend) {
      // Root is a backend (possibly fullstack or API-only)
      detectedBackend = rootAnalysis.backend;
      backendPath = "";
    }

    // Edge case: root is fullstack (both frontend & backend in root package.json)
    if (!detectedFrontend && !detectedBackend && rootAnalysis) {
      detectedFrontend = rootAnalysis.frontend;
      detectedBackend  = rootAnalysis.backend;
      buildCommand     = rootAnalysis.buildCommand;
      outputDir        = rootAnalysis.outputDir;
      nodeVersion      = rootAnalysis.nodeVersion;
      packageManager   = rootAnalysis.packageManager;
    }

    const stack: DetectedStack = {
      frontend: detectedFrontend,
      backend:  detectedBackend,
      frontendPath,
      backendPath,
      packageManager,
      buildCommand,
      outputDir,
      nodeVersion,
    };

    logger.info("Repository analysis complete", { fullName, stack });

    // 6. Collect env vars: grep env files + source code
    const envVars = await this.collectEnvVars(
      token, fullName,
      frontendDir ?? null,
      backendDir  ?? null,
    );

    return { stack, envVars };
  }

  // ── Env var collection ────────────────────────────────────────────────────

  private async collectEnvVars(
    token: string,
    fullName: string,
    frontendDir: string | null,
    backendDir: string | null,
  ): Promise<EnvVariable[]> {
    // All directories to scan (root always included; subdirs added if detected)
    const dirs = [...new Set(["", frontendDir, backendDir].filter((d): d is string => d !== null))];

    const varMap = new Map<string, EnvVariable>();

    await Promise.all(dirs.map((dir) => this.scanDir(token, fullName, dir, varMap)));

    return Array.from(varMap.values()).sort((a, b) => {
      // Required vars first
      if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1;
      return a.key.localeCompare(b.key);
    });
  }

  private async scanDir(
    token: string,
    fullName: string,
    dir: string,
    varMap: Map<string, EnvVariable>,
  ): Promise<void> {
    const prefix = dir ? `${dir}/` : "";

    // ── 1. Try env files in priority order ────────────────────────────────
    const envContents = await Promise.all(
      ENV_FILE_NAMES.map((name) => this.github.getFileContent(token, fullName, `${prefix}${name}`)),
    );
    for (const content of envContents) {
      if (!content) continue;
      for (const v of parseEnvFile(content)) {
        if (!AUTO_INJECTED_VARS.has(v.key) && !varMap.has(v.key)) {
          varMap.set(v.key, { key: v.key, value: v.value, isRequired: v.isRequired, source: "dotenv" });
        }
      }
      // Use the first env file found — others are fallbacks
      break;
    }

    // ── 2. Grep source files for process.env / import.meta.env ───────────
    const sourceContents = await Promise.all(
      SOURCE_FILES_TO_SCAN.map((f) => this.github.getFileContent(token, fullName, `${prefix}${f}`)),
    );
    for (const content of sourceContents) {
      if (!content) continue;
      for (const key of scanForEnvKeys(content)) {
        if (!AUTO_INJECTED_VARS.has(key) && !varMap.has(key)) {
          // Found in code but not in any env file — must be required (no default known)
          varMap.set(key, { key, value: "", isRequired: true, source: "process_env" });
        }
      }
    }
  }
}

