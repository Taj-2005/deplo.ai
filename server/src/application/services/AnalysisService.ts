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
  ) {}

  async analyzeRepository(
    encryptedToken: string,
    fullName: string,
    ref = "HEAD",
  ): Promise<RepositoryAnalysisResult> {
    const token = decrypt(encryptedToken);

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

    return { stack, envVars, analysis };
  }
}
