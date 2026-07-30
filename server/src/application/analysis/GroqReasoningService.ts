import type {
  AiFailureDiagnosis,
  AiRepoReasoning,
  FrameworkCandidate,
  FrameworkId,
  Language,
  RepositoryAnalysis,
} from "../../domain/analysis/types";
import { AI_ESCALATION_THRESHOLD } from "../../domain/analysis/types";
import type { ILlmClient, RepoSnapshot } from "./ports";
import { DeploymentStrategyResolver } from "./DeploymentStrategyResolver";
import { logger } from "../../shared/logger/logger";

/**
 * Layer 3 — AI-assisted reasoning via Groq. Strictly bounded:
 *
 *   Attempt 1  reasonAboutRepository()   — when deterministic confidence is low
 *   Attempt 2  diagnoseDeploymentFailure() — once, after a failed deployment
 *
 * Each method makes exactly ONE LLM call; callers invoke each at most once per
 * deployment, so AI reasoning never exceeds two requests. The LLM never sees
 * the whole repository — only the folder tree, key config files, dependency
 * lists, and the deterministic engine's own findings.
 */

const MAX_TREE_PATHS = 200;
const MAX_FILE_CHARS = 1_500;
const MAX_LOG_LINES = 60;
const MAX_CONTEXT_FILES = 25;

/** Top-level source/config files worth including beyond the fixed list. */
const EXTRA_CONTEXT_RE = /\.(py|js|mjs|cjs|ts|go|java|toml|txt|cfg|ini|yaml|yml)$|^(Procfile|Dockerfile|Makefile)$/;

/** Files worth showing the model, checked per component directory. */
const CONTEXT_FILES = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Pipfile",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "manage.py",
  "main.py",
  "app.py",
  "next.config.js",
  "next.config.ts",
  "vite.config.ts",
  "vite.config.js",
  "angular.json",
  "nuxt.config.ts",
  "svelte.config.js",
  "astro.config.mjs",
  "Dockerfile",
  "Procfile",
];

/** Normalises free-text framework names from the LLM onto our FrameworkId set. */
const FRAMEWORK_ALIASES: Record<string, FrameworkId> = {
  "next.js": "nextjs", nextjs: "nextjs", next: "nextjs",
  react: "react", "create-react-app": "react", cra: "react",
  vite: "vite",
  vue: "vue", "vue.js": "vue",
  nuxt: "nuxt", "nuxt.js": "nuxt",
  angular: "angular",
  astro: "astro",
  svelte: "svelte", sveltekit: "sveltekit", "svelte-kit": "sveltekit",
  remix: "remix",
  gatsby: "gatsby",
  html: "static-html", "static html": "static-html", static: "static-html", "static-html": "static-html",
  express: "express", "express.js": "express",
  fastify: "fastify",
  nestjs: "nestjs", nest: "nestjs", "nest.js": "nestjs",
  hono: "hono",
  koa: "koa",
  bun: "bun",
  fastapi: "fastapi",
  flask: "flask",
  django: "django",
  "spring boot": "spring-boot", "spring-boot": "spring-boot", spring: "spring-boot",
  go: "go", golang: "go", gin: "go", fiber: "go", echo: "go",
};

const LANGUAGE_ALIASES: Record<string, Language> = {
  javascript: "javascript", js: "javascript",
  typescript: "typescript", ts: "typescript",
  python: "python", go: "go", golang: "go", java: "java", html: "html",
};

export function normalizeFramework(raw: string): FrameworkId {
  return FRAMEWORK_ALIASES[raw.trim().toLowerCase()] ?? "unknown";
}

export function normalizeLanguage(raw: string): Language {
  return LANGUAGE_ALIASES[raw.trim().toLowerCase()] ?? "unknown";
}

// Canonical values for schema enums — constrained decoding forces the model to
// emit exactly these, so normalization can never miss.
const FRAMEWORK_ENUM: FrameworkId[] = [
  "nextjs", "react", "vite", "vue", "nuxt", "angular", "astro", "svelte",
  "sveltekit", "remix", "gatsby", "static-html", "express", "fastify", "nestjs",
  "hono", "koa", "fastapi", "flask", "django", "spring-boot", "go", "bun", "unknown",
];
const LANGUAGE_ENUM: Language[] = ["javascript", "typescript", "python", "go", "java", "html", "unknown"];

// Strict-mode JSON schemas (all fields required, additionalProperties: false).
const REPO_REASONING_SCHEMA = {
  type: "object",
  properties: {
    components: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          role: { type: "string", enum: ["frontend", "backend"] },
          framework: { type: "string", enum: FRAMEWORK_ENUM },
          language: { type: "string", enum: LANGUAGE_ENUM },
          installCommand: { type: ["string", "null"] },
          buildCommand: { type: ["string", "null"] },
          outputDirectory: { type: ["string", "null"] },
          startCommand: { type: ["string", "null"] },
          confidence: { type: "number" },
          reasoning: { type: "string" },
          envVars: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                required: { type: "boolean" },
                reason: { type: "string" },
              },
              required: ["key", "required", "reason"],
              additionalProperties: false,
            },
          },
        },
        required: [
          "path", "role", "framework", "language", "installCommand",
          "buildCommand", "outputDirectory", "startCommand", "confidence", "reasoning", "envVars",
        ],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
  },
  required: ["components", "summary"],
  additionalProperties: false,
};

const FAILURE_DIAGNOSIS_SCHEMA = {
  type: "object",
  properties: {
    likelyCause: { type: "string" },
    affectedFile: { type: ["string", "null"] },
    frameworkMisidentified: { type: "boolean" },
    correctedFramework: { type: ["string", "null"], enum: [...FRAMEWORK_ENUM, null] },
    correctedBuildCommand: { type: ["string", "null"] },
    correctedStartCommand: { type: ["string", "null"] },
    correctedOutputDirectory: { type: ["string", "null"] },
    recommendation: { type: "string" },
    aiFixPrompt: { type: "string" },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
          category: { type: "string", enum: ["security", "dependency", "configuration", "build", "runtime"] },
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["severity", "category", "title", "detail"],
        additionalProperties: false,
      },
    },
    confidence: { type: "number" },
  },
  required: [
    "likelyCause", "affectedFile", "frameworkMisidentified", "correctedFramework",
    "correctedBuildCommand", "correctedStartCommand", "correctedOutputDirectory",
    "recommendation", "aiFixPrompt", "issues", "confidence",
  ],
  additionalProperties: false,
};

export class GroqReasoningService {
  private readonly strategies = new DeploymentStrategyResolver();

  constructor(private readonly llm: ILlmClient) {}

  /**
   * AI attempt #1 — re-analyze the repository when deterministic confidence is
   * low. Returns an updated RepositoryAnalysis with AI corrections merged, or
   * the original analysis unchanged if the LLM call fails (never throws).
   */
  async reasonAboutRepository(
    snapshot: RepoSnapshot,
    deterministic: RepositoryAnalysis,
  ): Promise<RepositoryAnalysis> {
    try {
      const context = await this.buildRepoContext(snapshot, deterministic);

      const result = await this.llm.completeJson<AiRepoReasoning>({
        schemaName: "repo_reasoning",
        schema: REPO_REASONING_SCHEMA,
        system:
          "You are a deployment analyst for a hosting platform. Given a repository's " +
          "folder tree, key files, and an inconclusive deterministic analysis, identify " +
          "each deployable component's framework, language, and exact install/build/start " +
          "commands. Also list the environment variables each component needs at runtime " +
          "(from code references, config files, and framework conventions) — mark them " +
          "required only when the app cannot start without them. Be precise and " +
          "conservative; use null when a command is not needed.",
        user: context,
      });

      if (result.components.length === 0) {
        logger.warn("Groq returned no components — keeping deterministic result");
        return deterministic;
      }

      const merged = this.applyRepoReasoning(deterministic, result);
      logger.info("Groq repo reasoning applied", {
        components: result.components.length,
        summary: result.summary.slice(0, 200),
      });
      return merged;
    } catch (err) {
      logger.warn("Groq repo reasoning failed — keeping deterministic result", {
        error: err instanceof Error ? err.message : String(err),
      });
      return deterministic;
    }
  }

  /**
   * AI attempt #2 — diagnose a failed deployment from its logs and the
   * analysis that drove it. Returns null when the LLM is unavailable/fails.
   */
  async diagnoseDeploymentFailure(params: {
    errorMessage: string;
    logs: string[];
    analysis: RepositoryAnalysis | null;
    stackSummary: string;
  }): Promise<AiFailureDiagnosis | null> {
    try {
      const logTail = params.logs.slice(-MAX_LOG_LINES).join("\n");
      const componentSummary = params.analysis
        ? params.analysis.components
            .map(
              (c) =>
                `- ${c.path || "(root)"} [${c.role}] ${c.framework.framework} ` +
                `(confidence ${c.framework.confidence.toFixed(2)}), build: ${c.strategy.buildCommand ?? "-"}, ` +
                `start: ${c.strategy.startCommand ?? "-"}, output: ${c.strategy.outputDirectory ?? "-"}`,
            )
            .join("\n")
        : "(no analysis available)";

      const diagnosis = await this.llm.completeJson<AiFailureDiagnosis>({
        schemaName: "failure_diagnosis",
        schema: FAILURE_DIAGNOSIS_SCHEMA,
        system:
          "You are a deployment failure analyst writing for the developer who owns the " +
          "repository. Given the detected stack, the deployment logs, and the error, " +
          "determine what went wrong and how to fix it. Name the specific repo file most " +
          "likely responsible in affectedFile (null if the failure is platform-side, not " +
          "the repo's fault). Write recommendation as clear plain-language steps. Write " +
          "aiFixPrompt as a complete, self-contained prompt the developer can paste into " +
          "their AI coding tool (Cursor, Claude Code, Copilot) to fix the repo — include " +
          "the file to change, the exact change needed, and the error being fixed. In " +
          "issues, list any additional problems you can see in the logs worth fixing — " +
          "security vulnerabilities and dependency problems first, then configuration and " +
          "build concerns; keep it empty rather than inventing problems. If the framework " +
          "was misidentified, say so and name the correct one. Use null for corrections " +
          "you are not confident about.",
        user:
          `## Detected stack\n${params.stackSummary}\n\n` +
          `## Components\n${componentSummary}\n\n` +
          `## Error\n${params.errorMessage}\n\n` +
          `## Deployment log (tail)\n${logTail}`,
      });

      logger.info("Groq failure diagnosis", {
        likelyCause: diagnosis.likelyCause.slice(0, 200),
        frameworkMisidentified: diagnosis.frameworkMisidentified,
        confidence: diagnosis.confidence,
      });
      return diagnosis;
    } catch (err) {
      logger.warn("Groq failure diagnosis failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  // ── Context building ────────────────────────────────────────────────────

  private async buildRepoContext(
    snapshot: RepoSnapshot,
    deterministic: RepositoryAnalysis,
  ): Promise<string> {
    const tree = await snapshot.tree();
    const paths = tree
      .map((b) => b.path)
      .sort()
      .slice(0, MAX_TREE_PATHS);
    const treeBlock = paths.join("\n") + (tree.length > MAX_TREE_PATHS ? `\n… (+${tree.length - MAX_TREE_PATHS} more files)` : "");

    // Pull key files from root + each detected component directory, plus any
    // small top-level source/config files — repos with unconventional names
    // (application.py, deps.txt, …) carry their framework evidence there.
    const dirs = [...new Set(["", ...deterministic.components.map((c) => c.path)])];
    const wanted = new Set<string>();
    for (const dir of dirs) {
      for (const name of CONTEXT_FILES) wanted.add(dir ? `${dir}/${name}` : name);
      const { files } = await snapshot.listDir(dir);
      for (const name of files) {
        if (EXTRA_CONTEXT_RE.test(name)) wanted.add(dir ? `${dir}/${name}` : name);
      }
    }

    const fileBlocks: string[] = [];
    for (const path of [...wanted].sort()) {
      if (fileBlocks.length >= MAX_CONTEXT_FILES) break;
      const content = await snapshot.readFile(path);
      if (content) {
        fileBlocks.push(`### ${path}\n\`\`\`\n${content.slice(0, MAX_FILE_CHARS)}\n\`\`\``);
      }
    }

    const detBlock = deterministic.components
      .map(
        (c) =>
          `- path="${c.path}" [${c.role}]: best guess ${c.framework.framework} ` +
          `(confidence ${c.framework.confidence.toFixed(2)}); ` +
          `evidence: ${c.framework.evidence.map((e) => e.signal).join(", ") || "none"}`,
      )
      .join("\n");

    return (
      `## Folder tree (${tree.length} files)\n${treeBlock}\n\n` +
      `## Deterministic analysis (inconclusive, overall confidence ${deterministic.overallConfidence.toFixed(2)})\n` +
      `Structure: ${deterministic.structure.kind}\n${detBlock}\n\n` +
      `## Key files\n${fileBlocks.join("\n\n") || "(none found)"}\n\n` +
      `You MUST identify at least one deployable component. Use path="" for the ` +
      `repository root, or the subdirectory path for monorepo components. Correct ` +
      `the role (frontend/backend) if the deterministic guess is wrong.`
    );
  }

  // ── Merging ─────────────────────────────────────────────────────────────

  /** Merge AI corrections into the deterministic analysis (AI wins only when more confident). */
  private applyRepoReasoning(
    deterministic: RepositoryAnalysis,
    ai: AiRepoReasoning,
  ): RepositoryAnalysis {
    const components = [...deterministic.components];

    for (const aiComp of ai.components) {
      const framework = normalizeFramework(aiComp.framework);
      const language = normalizeLanguage(aiComp.language);
      const confidence = Math.max(0, Math.min(1, aiComp.confidence));

      // Match by path+role; failing that, an unresolved ("unknown") component at
      // the same path — the AI may legitimately reclassify its role.
      let idx = components.findIndex((c) => c.path === aiComp.path && c.role === aiComp.role);
      if (idx === -1) {
        idx = components.findIndex((c) => c.path === aiComp.path && c.framework.framework === "unknown");
      }
      const existing = idx >= 0 ? components[idx]! : null;

      // Only adopt the AI's view when it is more confident than what we have.
      if (existing && existing.framework.confidence >= confidence) continue;
      if (framework === "unknown" && !existing) continue;

      const candidate: FrameworkCandidate = {
        framework: framework === "unknown" && existing ? existing.framework.framework : framework,
        kind: aiComp.role === "backend" ? "backend" : "frontend",
        language: language === "unknown" && existing ? existing.framework.language : language,
        score: confidence,
        confidence,
        evidence: [
          ...(existing?.framework.evidence ?? []),
          { signal: "ai:groq", weight: confidence, detail: aiComp.reasoning.slice(0, 300) },
        ],
      };

      const runtime = existing?.strategy.runtime ?? { language: candidate.language, version: null, packageManager: null };
      const strategy = this.strategies.resolve(candidate, {
        installCommand: aiComp.installCommand ?? existing?.strategy.installCommand ?? null,
        buildCommand: aiComp.buildCommand ?? existing?.strategy.buildCommand ?? null,
        outputDirectory: aiComp.outputDirectory ?? existing?.strategy.outputDirectory ?? null,
        startCommand: aiComp.startCommand ?? existing?.strategy.startCommand ?? null,
      }, runtime);

      const updated = {
        path: aiComp.path,
        role: aiComp.role,
        framework: candidate,
        candidates: existing ? [candidate, ...existing.candidates] : [candidate],
        strategy,
      };

      if (idx >= 0) components[idx] = updated;
      else components.push(updated);
    }

    const overallConfidence = components.length
      ? Math.min(...components.map((c) => c.framework.confidence))
      : 0;

    // Collect the AI's env findings — AnalysisService merges them with the
    // deterministic scan (deterministic wins on conflicts).
    const aiEnvVars = ai.components.flatMap((c) =>
      (c.envVars ?? []).map((v) => ({
        key: v.key,
        required: v.required,
        scope: c.role,
      })),
    );

    return {
      ...deterministic,
      components,
      overallConfidence,
      needsAiFallback: overallConfidence < AI_ESCALATION_THRESHOLD,
      aiUsed: true,
      aiEnvVars,
      evidence: [
        ...deterministic.evidence,
        { signal: "ai:groq:summary", weight: 0, detail: ai.summary.slice(0, 300) },
      ],
    };
  }
}
