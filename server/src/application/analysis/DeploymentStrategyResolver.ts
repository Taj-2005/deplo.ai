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
  // Frontend → Vercel (preset slugs verified against GET /v1/frameworks)
  nextjs: { provider: "vercel", preset: "nextjs", deployable: true },
  vite: { provider: "vercel", preset: "vite", deployable: true },
  react: { provider: "vercel", preset: "create-react-app", deployable: true },
  vue: { provider: "vercel", preset: "vue", deployable: true },
  nuxt: { provider: "vercel", preset: "nuxtjs", deployable: true },
  angular: { provider: "vercel", preset: "angular", deployable: true },
  astro: { provider: "vercel", preset: "astro", deployable: true },
  svelte: { provider: "vercel", preset: "svelte", deployable: true },
  sveltekit: { provider: "vercel", preset: "sveltekit-1", deployable: true },
  remix: { provider: "vercel", preset: "remix", deployable: true },
  gatsby: { provider: "vercel", preset: "gatsby", deployable: true },
  "static-html": { provider: "vercel", preset: null, deployable: true },
  // Backend (Node) → Render web service in the user's own workspace
  express: { provider: "render", preset: null, deployable: true },
  fastify: { provider: "render", preset: null, deployable: true },
  nestjs: { provider: "render", preset: null, deployable: false },
  hono: { provider: "render", preset: null, deployable: false },
  koa: { provider: "render", preset: null, deployable: false },
  bun: { provider: "render", preset: null, deployable: false },
  // Backend (Python) → Render web service in the user's own workspace
  fastapi: { provider: "render", preset: null, deployable: true },
  flask: { provider: "render", preset: null, deployable: true },
  django: { provider: "render", preset: null, deployable: true },
  "spring-boot": { provider: "render", preset: null, deployable: false },
  go: { provider: "render", preset: null, deployable: true },
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
