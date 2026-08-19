import { GitHubAdapter } from "../../infrastructure/github/GitHubAdapter";
import { RepoSourceAdapter } from "../../infrastructure/github/RepoSourceAdapter";
import type { DetectedStack, EnvVariable } from "../../domain/deployment/Deployment";
import type { RepositoryAnalysis } from "../../domain/analysis/types";
import { RepositoryAnalyzer } from "../analysis/RepositoryAnalyzer";
import { GroqReasoningService } from "../analysis/GroqReasoningService";
import { EnvVarScanner, defaultFrontendApiKeys } from "../analysis/EnvVarScanner";
import { RepoSnapshot } from "../analysis/ports";
import { toDetectedStack } from "../analysis/legacyMapper";
import { decrypt } from "../../shared/utils/crypto";
import { logger } from "../../shared/logger/logger";
import type { CacheService } from "../../infrastructure/redis/CacheService";

/**
 * A single analysis costs roughly 80 GitHub API calls — one recursive tree
 * plus a bounded fan-out of file reads — against a 5,000/hour per-user budget.
 * The same repo is analysed repeatedly in normal use (opening Configure, then
 * deploying, then retrying), so results are cached per repo+ref. Pushes
 * invalidate the entry, so a cache hit can never serve a stale stack.
 */
const ANALYSIS_TTL_SECONDS = 900;

export function analysisCacheKey(fullName: string, ref: string): string {
  return `analysis:${fullName}:${ref}`;
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
  constructor(
    private readonly github: GitHubAdapter,
    /** Optional Layer 3 AI fallback — engine is deterministic-only without it. */
    private readonly reasoning: GroqReasoningService | null = null,
    /** Optional cache — without it every call re-reads the repo from GitHub. */
    private readonly cache: CacheService | null = null,
  ) {}

  async analyzeRepository(
    encryptedToken: string,
    fullName: string,
    ref = "HEAD",
  ): Promise<RepositoryAnalysisResult> {
    const token = decrypt(encryptedToken);

    const cacheKey = analysisCacheKey(fullName, ref);
    if (this.cache) {
      const hit = await this.cache.get<RepositoryAnalysisResult>(cacheKey);
      if (hit) {
        logger.info("Analysis served from cache", { fullName, ref });
        return hit;
      }
    }

    // Layered deterministic analysis over a single cached repo snapshot.
    const source = new RepoSourceAdapter(this.github, token, fullName, ref);
    const snapshot = new RepoSnapshot(source);
    let analysis = await new RepositoryAnalyzer(snapshot).analyze();

    // Layer 3 — single bounded AI attempt when deterministic confidence is low.
    if (analysis.needsAiFallback && this.reasoning) {
      logger.info("Deterministic confidence low — escalating to Groq", {
        fullName,
        confidence: Number(analysis.overallConfidence.toFixed(2)),
      });
      analysis = await this.reasoning.reasonAboutRepository(snapshot, analysis);
    }

    const stack = toDetectedStack(analysis);

    // Tree-driven env detection: every .env* file + every source file (bounded)
    // is scanned from the actual repo tree, scoped frontend/backend/shared.
    // Never depends on a fixed filename list or .env.example being present.
    const scanner = new EnvVarScanner(snapshot);
    const scanComponents = analysis.components.map((c) => ({ path: c.path, role: c.role }));
    const { vars: scannedVars, frontendApiKeys } = await scanner.scan(scanComponents);

    // Merge AI-discovered env vars (from the Groq reasoning call) — the
    // deterministic scan wins on conflicts; AI only adds missing keys.
    const envVars = [...scannedVars];
    const known = new Set(envVars.map((v) => v.key));
    for (const ai of analysis.aiEnvVars ?? []) {
      if (known.has(ai.key)) continue;
      known.add(ai.key);
      envVars.push({ key: ai.key, value: "", isRequired: ai.required, source: "inferred", scope: ai.scope });
    }
    envVars.sort((a, b) => (a.isRequired !== b.isRequired ? (a.isRequired ? -1 : 1) : a.key.localeCompare(b.key)));

    // Backend-URL keys the frontend actually uses (+ framework default) —
    // auto-injected with the live backend URL at deploy time.
    stack.frontendApiKeys = [...new Set([...frontendApiKeys, ...defaultFrontendApiKeys(stack.frontend)])];

    // Backend runtime + engine-resolved commands (used by the orchestrator for
    // non-Node backends; Node backends re-derive from package.json at deploy time).
    const backendComp = analysis.components.find((c) => c.role === "backend");
    if (backendComp) {
      const lang = backendComp.framework.language;
      stack.backendRuntime = lang === "python" ? "python" : lang === "go" ? "go" : "node";
      stack.backendInstallCommand = backendComp.strategy.installCommand;
      stack.backendBuildCommand = backendComp.strategy.buildCommand;
      stack.backendStartCommand = backendComp.strategy.startCommand;
      stack.backendRuntimeVersion = backendComp.strategy.runtime.version;
    }

    logger.info("Repository analysis complete", {
      fullName,
      structure: analysis.structure.kind,
      frontend: stack.frontend,
      backend: stack.backend,
      confidence: Number(analysis.overallConfidence.toFixed(2)),
      needsAiFallback: analysis.needsAiFallback,
      aiUsed: analysis.aiUsed ?? false,
      envVarsFound: envVars.length,
      frontendApiKeys: stack.frontendApiKeys,
    });

    const result: RepositoryAnalysisResult = { stack, envVars, analysis };

    // Values read from a real .env are blanked by the scanner before this
    // point, so nothing secret is cached — only keys, example values, and the
    // detected stack.
    if (this.cache) {
      await this.cache.set(cacheKey, result, ANALYSIS_TTL_SECONDS);
    }

    return result;
  }
}
