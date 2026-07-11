/**
 * Pure domain types for the layered repository analysis engine.
 *
 * These types are provider-agnostic and framework-agnostic at the type level:
 * new frameworks are added as data (signatures), not new type branches.
 */

// ─── Language & runtime ──────────────────────────────────────────────────────

export type Language =
  | "javascript"
  | "typescript"
  | "python"
  | "go"
  | "java"
  | "html"
  | "unknown";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export interface Runtime {
  language: Language;
  /** Best-effort version string, e.g. "20", "3.12" — null when unknown. */
  version: string | null;
  packageManager: PackageManager | null;
}

// ─── Frameworks ──────────────────────────────────────────────────────────────

/**
 * Every framework the engine can detect. Adding one is a data change in the
 * signature registry plus (optionally) a strategy mapping — never new branching.
 */
export type FrameworkId =
  // Frontend
  | "nextjs"
  | "react"
  | "vite"
  | "vue"
  | "nuxt"
  | "angular"
  | "astro"
  | "svelte"
  | "sveltekit"
  | "remix"
  | "gatsby"
  | "static-html"
  // Backend — Node
  | "express"
  | "fastify"
  | "nestjs"
  | "hono"
  | "koa"
  // Backend — Python
  | "fastapi"
  | "flask"
  | "django"
  // Backend — other
  | "spring-boot"
  | "go"
  | "bun"
  // Fallback
  | "unknown";

export type FrameworkKind = "frontend" | "backend" | "static" | "unknown";

// ─── Evidence & confidence ───────────────────────────────────────────────────

/** A single supporting or contradicting signal found during detection. */
export interface Evidence {
  /** Machine-readable signal id, e.g. "dependency:next", "file:next.config.ts". */
  signal: string;
  /** Contribution to the candidate score. Negative values are contradictions. */
  weight: number;
  /** Human-readable explanation for the reasoning trail. */
  detail: string;
}

/** A scored framework hypothesis for one component (directory). */
export interface FrameworkCandidate {
  framework: FrameworkId;
  kind: FrameworkKind;
  language: Language;
  /** Raw summed weight of matched evidence. */
  score: number;
  /** Normalised 0..1 confidence relative to the signature's max attainable score. */
  confidence: number;
  evidence: Evidence[];
}

// ─── Structure ───────────────────────────────────────────────────────────────

export type StructureKind =
  | "single" // one app at the root
  | "frontend-backend" // classic client/ + server/ split
  | "monorepo" // workspace-managed (turbo/nx/pnpm/npm/yarn)
  | "unknown";

export type WorkspaceTool = "turborepo" | "nx" | "pnpm" | "npm" | "yarn" | null;

export interface WorkspaceInfo {
  tool: WorkspaceTool;
  /** Resolved package directories (globs expanded against the tree). */
  packages: string[];
}

export type ComponentRole = "frontend" | "backend" | "shared" | "app";

/** A deployable/analyzable unit within the repository. */
export interface ProjectComponent {
  /** Path relative to repo root: "" for root, "apps/web", "server", etc. */
  path: string;
  role: ComponentRole;
}

export interface ProjectStructure {
  kind: StructureKind;
  workspace: WorkspaceInfo;
  components: ProjectComponent[];
}

// ─── Deployment strategy ─────────────────────────────────────────────────────

export type DeploymentProvider = "vercel" | "render" | "none";

/** Concrete, provider-facing deployment configuration for one component. */
export interface DeploymentStrategy {
  framework: FrameworkId;
  provider: DeploymentProvider;
  /** Provider framework preset (e.g. Vercel "nextjs"), null when not applicable. */
  preset: string | null;
  installCommand: string | null;
  buildCommand: string | null;
  outputDirectory: string | null;
  startCommand: string | null;
  runtime: Runtime;
  /**
   * Whether deplo.ai can actually deploy this today. Detection is broad; some
   * frameworks are recognised but not yet wired to a provider (Phase 2+).
   */
  deployable: boolean;
  notes: string | null;
}

// ─── Final analysis result ───────────────────────────────────────────────────

export interface ComponentAnalysis {
  path: string;
  role: "frontend" | "backend";
  /** Highest-confidence framework for this component. */
  framework: FrameworkCandidate;
  /** All scored hypotheses, best-first, for transparency and AI escalation. */
  candidates: FrameworkCandidate[];
  strategy: DeploymentStrategy;
}

export interface RepositoryAnalysis {
  structure: ProjectStructure;
  components: ComponentAnalysis[];
  primaryLanguage: Language;
  /** Min confidence across detected components (0..1). */
  overallConfidence: number;
  /** True when deterministic confidence is below threshold → escalate to Groq. */
  needsAiFallback: boolean;
  /** Aggregated top-level reasoning trail. */
  evidence: Evidence[];
}

/** Confidence threshold below which the pipeline escalates to AI reasoning. */
export const AI_ESCALATION_THRESHOLD = 0.5;
