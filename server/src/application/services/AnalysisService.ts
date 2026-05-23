import { GitHubAdapter } from "../../infrastructure/github/GitHubAdapter";
import type { DetectedStack, StackType, EnvVariable } from "../../domain/deployment/Deployment";
import { decrypt } from "../../shared/utils/crypto";
import { logger } from "../../shared/logger/logger";

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

    // 6. Extract env vars — check both .env.example files
    const [rootEnv, frontendEnv, backendEnv] = await Promise.all([
      this.github.getFileContent(token, fullName, ".env.example"),
      frontendDir ? this.github.getFileContent(token, fullName, `${frontendDir}/.env.example`) : Promise.resolve(null),
      backendDir  ? this.github.getFileContent(token, fullName, `${backendDir}/.env.example`)  : Promise.resolve(null),
    ]);

    const envVars = this.extractEnvVariables(rootEnv ?? frontendEnv ?? backendEnv);

    return { stack, envVars };
  }

  private extractEnvVariables(envExample: string | null): EnvVariable[] {
    if (!envExample) return [];
    const vars: EnvVariable[] = [];
    for (const line of envExample.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key   = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key) {
        vars.push({
          key,
          value,
          isRequired: value === "" || value === "REQUIRED",
          source: "dotenv",
        });
      }
    }
    return vars;
  }
}

