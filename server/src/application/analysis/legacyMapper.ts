import type { DetectedStack, StackType } from "../../domain/deployment/Deployment";
import type { ComponentAnalysis, FrameworkId, PackageManager, RepositoryAnalysis } from "../../domain/analysis/types";

/**
 * Projects the rich RepositoryAnalysis onto the legacy DetectedStack shape the
 * current orchestrator, DB, and dashboard already understand. This keeps the
 * existing deploy path working unchanged while the new engine drives detection.
 *
 * Only frameworks the current orchestrator can deploy map to a concrete
 * StackType; everything else is UNKNOWN (detected, but not yet deployable).
 */
const FRAMEWORK_TO_STACK: Partial<Record<FrameworkId, StackType>> = {
  nextjs: "NEXTJS",
  vite: "REACT_VITE",
  react: "REACT_VITE",
  vue: "VUE",
  nuxt: "NUXT",
  astro: "ASTRO",
  svelte: "SVELTE",
  sveltekit: "SVELTEKIT",
  remix: "REMIX",
  gatsby: "GATSBY",
  angular: "ANGULAR",
  "static-html": "STATIC",
  express: "EXPRESS",
  fastify: "FASTIFY",
  fastapi: "FASTAPI",
  flask: "FLASK",
  django: "DJANGO",
};

function toStackType(framework: FrameworkId): StackType {
  return FRAMEWORK_TO_STACK[framework] ?? "UNKNOWN";
}

/** Prefer a component whose framework maps to a real (deployable) StackType. */
function pick(components: ComponentAnalysis[], role: "frontend" | "backend"): ComponentAnalysis | null {
  const ofRole = components.filter((c) => c.role === role);
  if (ofRole.length === 0) return null;
  const deployable = ofRole.find((c) => toStackType(c.framework.framework) !== "UNKNOWN");
  return deployable ?? ofRole[0]!;
}

export function toDetectedStack(analysis: RepositoryAnalysis): DetectedStack {
  const frontend = pick(analysis.components, "frontend");
  const backend = pick(analysis.components, "backend");

  const pm: PackageManager =
    frontend?.strategy.runtime.packageManager ?? backend?.strategy.runtime.packageManager ?? "npm";

  const nodeVersion =
    [frontend, backend]
      .map((c) => (c?.strategy.runtime.language === "typescript" || c?.strategy.runtime.language === "javascript" ? c?.strategy.runtime.version : null))
      .find((v): v is string => Boolean(v)) ?? null;

  return {
    frontend: frontend ? toStackType(frontend.framework.framework) : null,
    backend: backend ? toStackType(backend.framework.framework) : null,
    frontendPath: frontend?.path ?? "",
    backendPath: backend?.path ?? "",
    packageManager: pm,
    buildCommand: frontend?.strategy.buildCommand ?? backend?.strategy.buildCommand ?? null,
    outputDir: frontend?.strategy.outputDirectory ?? null,
    nodeVersion,
  };
}
