import { GitHubAdapter } from "../../infrastructure/github/GitHubAdapter";
import { RepoSourceAdapter } from "../../infrastructure/github/RepoSourceAdapter";
import type { DetectedStack, EnvVariable } from "../../domain/deployment/Deployment";
import type { RepositoryAnalysis } from "../../domain/analysis/types";
import { RepositoryAnalyzer } from "../analysis/RepositoryAnalyzer";
import { RepoSnapshot } from "../analysis/ports";
import { toDetectedStack } from "../analysis/legacyMapper";
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
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_BACKEND_URL",
  "BACKEND_URL",
  "FRONTEND_URL",
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

/** Source files most likely to concentrate env var references (per component). */
const SOURCE_FILES_TO_SCAN = [
  "src/config/env.ts", "src/config/env.js",
  "src/config/index.ts", "src/config/index.js",
  "config/env.ts", "config/env.js",
  "config/index.ts", "config/index.js",
  "src/lib/env.ts", "src/lib/env.js",
  "src/lib/config.ts", "src/lib/config.js",
  "src/index.ts", "src/index.js",
  "src/app.ts", "src/app.js",
  "src/server.ts", "src/server.js",
  "index.ts", "index.js",
  "app.ts", "app.js",
  "server.ts", "server.js",
  "next.config.ts", "next.config.js",
  "vite.config.ts", "vite.config.js",
  // Python entrypoints / config
  "main.py", "app.py", "config.py", "settings.py",
];

const PROCESS_ENV_RE = /process\.env\.([A-Z_][A-Z0-9_]+)/g;
const IMPORT_META_RE = /import\.meta\.env\.([A-Z_][A-Z0-9_]+)/g;
const PY_GETENV_RE = /os\.(?:getenv|environ(?:\.get)?)\(\s*["']([A-Z_][A-Z0-9_]+)["']/g;

function scanForEnvKeys(content: string): string[] {
  const keys = new Set<string>();
  for (const m of content.matchAll(PROCESS_ENV_RE)) if (m[1]) keys.add(m[1]);
  for (const m of content.matchAll(IMPORT_META_RE)) if (m[1]) keys.add(m[1]);
  for (const m of content.matchAll(PY_GETENV_RE)) if (m[1]) keys.add(m[1]);
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
    const value = raw.replace(/^["']|["']$/g, "");
    const isRequired = raw === "" || raw.toUpperCase() === "REQUIRED" || raw === '""' || raw === "''";
    result.push({ key, value: isRequired ? "" : value, isRequired });
  }
  return result;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export interface RepositoryAnalysisResult {
  stack: DetectedStack;
  envVars: EnvVariable[];
  /** Rich Phase-1 analysis (structure, per-component frameworks, confidence). */
  analysis: RepositoryAnalysis;
}

/**
 * Thin application service over the layered analysis engine. Detection is
 * delegated to RepositoryAnalyzer (deterministic Layer 1 + 2); the legacy
 * DetectedStack projection keeps the existing deploy path working. Env-var
 * collection scans the detected component directories.
 */
export class AnalysisService {
  constructor(private readonly github: GitHubAdapter) {}

  async analyzeRepository(
    encryptedToken: string,
    fullName: string,
    ref = "HEAD",
  ): Promise<RepositoryAnalysisResult> {
    const token = decrypt(encryptedToken);

    // Layered deterministic analysis over a single cached repo snapshot.
    const source = new RepoSourceAdapter(this.github, token, fullName, ref);
    const snapshot = new RepoSnapshot(source);
    const analysis = await new RepositoryAnalyzer(snapshot).analyze();
    const stack = toDetectedStack(analysis);

    logger.info("Repository analysis complete", {
      fullName,
      structure: analysis.structure.kind,
      frontend: stack.frontend,
      backend: stack.backend,
      confidence: Number(analysis.overallConfidence.toFixed(2)),
      needsAiFallback: analysis.needsAiFallback,
    });

    // Collect env vars across root + every detected component directory.
    const dirs = [...new Set(["", ...analysis.components.map((c) => c.path)])];
    const envVars = await this.collectEnvVars(token, fullName, dirs);

    return { stack, envVars, analysis };
  }

  private async collectEnvVars(token: string, fullName: string, dirs: string[]): Promise<EnvVariable[]> {
    const varMap = new Map<string, EnvVariable>();
    await Promise.all(dirs.map((dir) => this.scanDir(token, fullName, dir, varMap)));

    return Array.from(varMap.values()).sort((a, b) => {
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

    // 1. Env files in priority order (first match wins).
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
      break;
    }

    // 2. Grep source files for env references (JS/TS + Python).
    const sourceContents = await Promise.all(
      SOURCE_FILES_TO_SCAN.map((f) => this.github.getFileContent(token, fullName, `${prefix}${f}`)),
    );
    for (const content of sourceContents) {
      if (!content) continue;
      for (const key of scanForEnvKeys(content)) {
        if (!AUTO_INJECTED_VARS.has(key) && !varMap.has(key)) {
          varMap.set(key, { key, value: "", isRequired: true, source: "process_env" });
        }
      }
    }
  }
}
