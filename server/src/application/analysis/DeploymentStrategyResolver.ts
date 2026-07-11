import type {
  DeploymentProvider,
  DeploymentStrategy,
  FrameworkCandidate,
  FrameworkId,
  Runtime,
} from "../../domain/analysis/types";
import type { BuildPlan } from "./BuildCommandResolver";

interface ProviderRule {
  provider: DeploymentProvider;
  /** Provider framework preset, or null when not applicable. */
  preset: string | null;
  /**
   * Whether deplo.ai can deploy this today. Detection is broad; this flag marks
   * what the current orchestrator actually supports (Phase 1). Broadening this
   * is the job of later phases (new provider targets).
   */
  deployable: boolean;
}

/**
 * The single source of truth mapping a framework to its deployment target.
 * Centralised here (not scattered across the orchestrator) so adding/altering
 * provider behaviour is one edit.
 */
const PROVIDER_RULES: Record<FrameworkId, ProviderRule> = {
  // Frontend → Vercel
  nextjs: { provider: "vercel", preset: "nextjs", deployable: true },
  vite: { provider: "vercel", preset: "vite", deployable: true },
  react: { provider: "vercel", preset: "create-react-app", deployable: true },
  vue: { provider: "vercel", preset: "vite", deployable: false },
  nuxt: { provider: "vercel", preset: "nuxtjs", deployable: false },
  angular: { provider: "vercel", preset: "angular", deployable: false },
  astro: { provider: "vercel", preset: "astro", deployable: false },
  svelte: { provider: "vercel", preset: "svelte", deployable: false },
  sveltekit: { provider: "vercel", preset: "sveltekit", deployable: false },
  remix: { provider: "vercel", preset: "remix", deployable: false },
  gatsby: { provider: "vercel", preset: "gatsby", deployable: false },
  "static-html": { provider: "vercel", preset: null, deployable: false },
  // Backend (Node) → Vercel serverless (current orchestrator path)
  express: { provider: "vercel", preset: null, deployable: true },
  fastify: { provider: "vercel", preset: null, deployable: true },
  nestjs: { provider: "vercel", preset: null, deployable: false },
  hono: { provider: "vercel", preset: null, deployable: false },
  koa: { provider: "vercel", preset: null, deployable: false },
  bun: { provider: "render", preset: null, deployable: false },
  // Backend (other runtimes) → Render (Phase 2 targets)
  fastapi: { provider: "render", preset: null, deployable: false },
  flask: { provider: "render", preset: null, deployable: false },
  django: { provider: "render", preset: null, deployable: false },
  "spring-boot": { provider: "render", preset: null, deployable: false },
  go: { provider: "render", preset: null, deployable: false },
  unknown: { provider: "none", preset: null, deployable: false },
};

/**
 * Provider strategy layer — turns a detected framework + build plan + runtime
 * into a concrete, provider-facing DeploymentStrategy.
 */
export class DeploymentStrategyResolver {
  resolve(candidate: FrameworkCandidate, build: BuildPlan, runtime: Runtime): DeploymentStrategy {
    const rule = PROVIDER_RULES[candidate.framework];

    return {
      framework: candidate.framework,
      provider: rule.provider,
      preset: rule.preset,
      installCommand: build.installCommand,
      buildCommand: build.buildCommand,
      outputDirectory: build.outputDirectory,
      startCommand: build.startCommand,
      runtime,
      deployable: rule.deployable,
      notes: rule.deployable
        ? null
        : `Detected ${candidate.framework} — deployment support for this stack is planned (Phase 2). Deterministic config is provided for review.`,
    };
  }
}
