import type { IDeploymentRepository } from "../../domain/deployment/DeploymentRepository.interface";
import type { IRepositoryRepository } from "../../domain/repository/Repository";
import type { IUserRepository } from "../../domain/user/UserRepository.interface";
import type { AnalysisService } from "../services/AnalysisService";
import type { GroqReasoningService } from "../analysis/GroqReasoningService";
import type { IntegrationService } from "../services/IntegrationService";
import { VercelAdapter, type VercelFramework } from "../../infrastructure/vercel/VercelAdapter";
import { RenderAdapter, type RenderRuntime } from "../../infrastructure/render/RenderAdapter";
import type { GitHubAdapter } from "../../infrastructure/github/GitHubAdapter";
import type { StackType } from "../../domain/deployment/Deployment";
import { decrypt } from "../../shared/utils/crypto";
import { AppError } from "../../shared/errors/AppError";
import { logger } from "../../shared/logger/logger";
import { env } from "../../config/env";

// ─── Framework helpers ───────────────────────────────────────────────────────

const VERCEL_FRAMEWORK: Record<string, VercelFramework> = {
  NEXTJS: "nextjs",
  REACT_VITE: "vite",
  VUE: "vue",
  NUXT: "nuxtjs",
  ASTRO: "astro",
  SVELTE: "svelte",
  SVELTEKIT: "sveltekit-1",
  REMIX: "remix",
  GATSBY: "gatsby",
  ANGULAR: "angular",
  // STATIC → null (no preset; served as static files)
};

function toVercelFramework(stack: StackType | null): VercelFramework {
  return (stack && VERCEL_FRAMEWORK[stack]) ?? null;
}

function toHumanStack(stack: StackType | null): string | null {
  const map: Record<string, string> = {
    NEXTJS: "Next.js",
    REACT_VITE: "React (Vite)",
    VUE: "Vue",
    NUXT: "Nuxt",
    ASTRO: "Astro",
    SVELTE: "Svelte",
    SVELTEKIT: "SvelteKit",
    REMIX: "Remix",
    GATSBY: "Gatsby",
    ANGULAR: "Angular",
    STATIC: "Static site",
    EXPRESS: "Express.js",
    FASTIFY: "Fastify",
    FASTAPI: "FastAPI",
    FLASK: "Flask",
    DJANGO: "Django",
    UNKNOWN: "Unknown",
  };
  return stack ? (map[stack] ?? stack) : null;
}

interface PkgJson {
  main?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

export class DeploymentOrchestrator {
  constructor(
    private readonly deploymentRepository: IDeploymentRepository,
    private readonly repositoryRepository: IRepositoryRepository,
    private readonly userRepository: IUserRepository,
    private readonly analysisService: AnalysisService,
    private readonly integrationService: IntegrationService,
    private readonly github: GitHubAdapter,
    /** Optional Layer 3 AI — diagnoses failed deployments (one call max). */
    private readonly reasoning: GroqReasoningService | null = null,
  ) {}

  // ── Phase 1: analyze ──────────────────────────────────────────────────────

  async runAnalysis(deploymentId: string): Promise<{ needsEnv: boolean }> {
    const deployment = await this.deploymentRepository.findById(deploymentId);
    if (!deployment) throw AppError.notFound("Deployment");

    try {
      await this.deploymentRepository.update(deploymentId, { status: "ANALYZING" });
      await this.deploymentRepository.appendLog(deploymentId, "Analyzing repository structure…");

      const repository = await this.repositoryRepository.findById(deployment.repositoryId);
      if (!repository) throw AppError.notFound("Repository");

      const user = await this.userRepository.findById(deployment.userId);
      if (!user) throw AppError.notFound("User");

      const { stack, envVars } = await this.analysisService.analyzeRepository(
        user.githubAccessToken,
        repository.fullName,
        deployment.branch,
      );

      const frontendLabel = toHumanStack(stack.frontend) ?? "none";
      const backendLabel  = toHumanStack(stack.backend)  ?? "none";
      const pathInfo = [
        stack.frontendPath ? `(${stack.frontendPath}/)` : "",
        stack.backendPath  ? `(${stack.backendPath}/)` : "",
      ].filter(Boolean).join(" ");

      const stackLog = `Stack detected: frontend=${frontendLabel}, backend=${backendLabel}${pathInfo ? " " + pathInfo : ""}`;
      await this.deploymentRepository.appendLog(deploymentId, stackLog);
      logger.info(stackLog, { deploymentId });

      // Merge pre-filled values (provided on the Configure step) into detected vars
      const preFilledMap = new Map(
        deployment.envVariables.filter((v) => v.value !== "").map((v) => [v.key, v.value]),
      );
      const mergedEnvVars = envVars.map((v) => ({
        ...v,
        value: preFilledMap.get(v.key) ?? v.value,
      }));

      const unsatisfied = mergedEnvVars.filter((v) => v.isRequired && v.value === "");
      const needsEnv = unsatisfied.length > 0;

      await this.deploymentRepository.update(deploymentId, {
        detectedStack: stack,
        envVariables: mergedEnvVars,
        status: needsEnv ? "WAITING_FOR_ENV" : "DEPLOYING_BACKEND",
      });

      if (needsEnv) {
        await this.deploymentRepository.appendLog(
          deploymentId,
          `Waiting for ${unsatisfied.length} required environment variable(s): ${unsatisfied.map((v) => v.key).join(", ")}.`,
        );
      }

      return { needsEnv };
    } catch (err) {
      await this.failDeployment(deploymentId, err);
      throw err;
    }
  }

  // ── Phase 2: deploy ───────────────────────────────────────────────────────

  async runDeploy(deploymentId: string): Promise<void> {
    const deployment = await this.deploymentRepository.findById(deploymentId);
    if (!deployment) throw AppError.notFound("Deployment");

    try {
      const repository = await this.repositoryRepository.findById(deployment.repositoryId);
      if (!repository) throw AppError.notFound("Repository");

      const user = await this.userRepository.findById(deployment.userId);
      if (!user) throw AppError.notFound("User");

      const githubToken = decrypt(user.githubAccessToken);

      const stack = deployment.detectedStack;
      const hasBackend  = !!stack?.backend;
      const hasFrontend = !!stack?.frontend;
      const envVars = deployment.envVariables;
      const branch  = deployment.branch;

      if (!hasBackend && !hasFrontend) {
        await this.deploymentRepository.appendLog(
          deploymentId,
          "No deployable stack detected. Supported: Next.js, React (Vite), Express, Fastify, FastAPI, Flask, Django.",
        );
        await this.deploymentRepository.update(deploymentId, {
          status: "COMPLETED",
          completedAt: new Date(),
        });
        await this.deploymentRepository.appendLog(deploymentId, "Deployment completed successfully.");
        logger.info("Deployment completed (no stack)", { deploymentId });
        return;
      }

      // Preserve URLs from previous attempts so retries skip already-completed phases
      let backendUrl: string | null = deployment.backendUrl ?? null;

      // Stable Vercel frontend domain — known before deployment so the backend
      // can be configured with FRONTEND_URL (CORS) without a chicken-and-egg problem.
      const backendServiceName  = this.serviceSlug(repository.name, "api");
      const frontendProjectName = this.serviceSlug(repository.name, "web");
      const stableFrontendUrl   = `https://${frontendProjectName}.vercel.app`;

      // ── Backend (Render — user's own workspace) ──────────────────────────
      if (hasBackend && !backendUrl) {
        await this.deploymentRepository.update(deploymentId, { status: "DEPLOYING_BACKEND" });
        await this.deploymentRepository.appendLog(deploymentId, "Deploying backend to Render…");

        // Backends run in the USER'S Render account — resolve their API key.
        // Throws with a clear "connect Render" message if not connected.
        const renderCreds = await this.integrationService.resolveRenderCredentials(deployment.userId);
        const render = new RenderAdapter(renderCreds.apiKey);

        const backendSubPath = stack?.backendPath ?? "";
        const prefix = backendSubPath ? `${backendSubPath}/` : "";

        const runtime: RenderRuntime = stack?.backendRuntime === "python" ? "python" : "node";

        let buildCommand: string;
        let startCommand: string;
        const runtimeEnvVars: Array<{ key: string; value: string }> = [];

        if (runtime === "python") {
          // Python: commands were resolved by the analysis engine from the
          // repo's real files (requirements.txt, app module, wsgi package).
          buildCommand = stack?.backendInstallCommand ?? "pip install -r requirements.txt";
          if (stack?.backendBuildCommand) buildCommand += ` && ${stack.backendBuildCommand}`;
          startCommand = stack?.backendStartCommand ?? "gunicorn --bind 0.0.0.0:$PORT app:app";
          if (stack?.backendRuntimeVersion && /^\d+\.\d+\.\d+$/.test(stack.backendRuntimeVersion)) {
            runtimeEnvVars.push({ key: "PYTHON_VERSION", value: stack.backendRuntimeVersion });
          }
          await this.deploymentRepository.appendLog(
            deploymentId,
            `Python backend — build: "${buildCommand}", start: "${startCommand}"`,
          );
        } else {
          // Node: build/start come from the repo's OWN package.json scripts —
          // never guessed or hardcoded.
          const pkgRaw = await this.github.getFileContent(githubToken, repository.fullName, `${prefix}package.json`);
          let pkg: PkgJson | null = null;
          try {
            pkg = pkgRaw ? (JSON.parse(pkgRaw) as PkgJson) : null;
          } catch {
            pkg = null;
          }
          const scripts = pkg?.scripts ?? {};

          const pm = await this.detectPackageManager(githubToken, repository.fullName, prefix);
          const installCmd =
            pm === "yarn" ? "yarn install" : pm === "pnpm" ? "pnpm install" : pm === "bun" ? "bun install" : "npm install";
          const runPrefix =
            pm === "yarn" ? "yarn" : pm === "pnpm" ? "pnpm run" : pm === "bun" ? "bun run" : "npm run";

          buildCommand = scripts["build"] ? `${installCmd} && ${runPrefix} build` : installCmd;

          if (scripts["start"]) {
            startCommand = pm === "npm" ? "npm start" : pm === "bun" ? "bun run start" : `${pm} start`;
          } else {
            // No start script — locate the entry point from the actual file tree.
            const treeEntries = await this.github.getRepoTree(githubToken, repository.fullName, branch);
            const files = treeEntries
              .filter((e) => !backendSubPath || e.path.startsWith(prefix))
              .map((e) => ({ path: backendSubPath ? e.path.slice(prefix.length) : e.path }));
            const entry = this.resolveBackendEntry(pkg, files);
            startCommand = `node ${entry}.js`;
          }

          runtimeEnvVars.push({ key: "NODE_ENV", value: "production" });
          await this.deploymentRepository.appendLog(
            deploymentId,
            `Using package.json scripts — build: "${buildCommand}", start: "${startCommand}"`,
          );
        }

        // Backend receives backend-scoped + shared vars (never frontend-only ones)
        const backendEnvVars = [
          ...runtimeEnvVars,
          // Frontend origin for the user's own CORS configuration
          { key: "FRONTEND_URL", value: stableFrontendUrl },
          ...envVars
            .filter((v) => (v.scope ?? "shared") !== "frontend")
            .filter((v) => !v.isRequired || v.value !== "")
            .map((v) => ({ key: v.key, value: v.value })),
        ];

        await this.deploymentRepository.appendLog(
          deploymentId,
          "Creating Render web service (your Render account must have access to this GitHub repository)…",
        );

        const createParams: Parameters<RenderAdapter["createWebService"]>[0] = {
          name: backendServiceName,
          repoUrl: `https://github.com/${repository.fullName}`,
          branch,
          runtime,
          buildCommand,
          startCommand,
          envVars: backendEnvVars,
          plan: "free",
          ownerId: renderCreds.ownerId,
        };
        if (backendSubPath) createParams.rootDir = backendSubPath;

        const { service, deployId } = await render.createWebService(createParams);

        await this.deploymentRepository.update(deploymentId, {
          renderServiceId: service.id,
          renderDeployId: deployId,
        });
        await this.deploymentRepository.appendLog(
          deploymentId,
          `Render service created (${service.id}). Building — this can take a few minutes…`,
        );

        const { url } = await render.waitForDeploy(service.id, deployId);
        backendUrl = url;

        await this.deploymentRepository.update(deploymentId, {
          backendUrl,
          status: "BACKEND_READY",
        });
        await this.deploymentRepository.appendLog(deploymentId, `Backend live at ${backendUrl}`);
        logger.info("Backend deployed to Render", { deploymentId, backendUrl, serviceId: service.id });
      }

      // ── Frontend (Vercel — file-based) ───────────────────────────────────
      if (hasFrontend && !deployment.frontendUrl) {
        // Vercel credentials are only needed when there is a frontend to deploy.
        const vercelCreds = await this.integrationService.resolveVercelCredentials(deployment.userId);
        const vercel = new VercelAdapter(vercelCreds.token, vercelCreds.teamId);

        await this.deploymentRepository.update(deploymentId, { status: "DEPLOYING_FRONTEND" });
        await this.deploymentRepository.appendLog(deploymentId, "Fetching repository files…");

        const frontendSubPath = stack?.frontendPath ?? "";
        const treeEntries = await this.github.getRepoTree(githubToken, repository.fullName, branch);

        const relevantEntries = frontendSubPath
          ? treeEntries.filter((e) => e.path.startsWith(`${frontendSubPath}/`))
          : treeEntries;

        if (relevantEntries.length === 0) {
          throw AppError.externalService(
            "GitHub",
            `No files found in ${frontendSubPath ? `${frontendSubPath}/` : "repo root"} — the repository tree may be empty or rate-limited`,
          );
        }

        await this.deploymentRepository.appendLog(
          deploymentId,
          `Downloading ${relevantEntries.length} files${frontendSubPath ? ` from ${frontendSubPath}/` : ""}…`,
        );

        const BATCH = 20;
        const deployFiles: Array<{ path: string; content: Buffer }> = [];
        for (let i = 0; i < relevantEntries.length; i += BATCH) {
          const batch = relevantEntries.slice(i, i + BATCH);
          const buffers = await Promise.all(
            batch.map((e) => this.github.getBlob(githubToken, repository.fullName, e.sha)),
          );
          batch.forEach((e, idx) => {
            const relativePath = frontendSubPath
              ? e.path.slice(`${frontendSubPath}/`.length)
              : e.path;
            deployFiles.push({ path: relativePath, content: buffers[idx]! });
          });
        }

        await this.deploymentRepository.appendLog(
          deploymentId,
          `Deploying frontend to Vercel (${deployFiles.length} files)…`,
        );

        const framework = toVercelFramework(stack?.frontend ?? null);

        // Auto-inject the live backend URL into every frontend key that
        // references it (detected from the user's code + framework default:
        // NEXT_PUBLIC_API_URL, VITE_API_URL, REACT_APP_API_URL, …).
        const apiKeys = new Set(stack?.frontendApiKeys ?? []);
        if (apiKeys.size === 0 && hasBackend) apiKeys.add("NEXT_PUBLIC_API_URL");

        // Frontend receives frontend-scoped + shared vars (never backend-only ones)
        const vercelEnvVars: Array<{ key: string; value: string; target: Array<"production"> }> = [
          ...envVars
            .filter((v) => (v.scope ?? "shared") !== "backend")
            .filter((v) => !v.isRequired || v.value !== "")
            .filter((v) => !apiKeys.has(v.key))
            .map((v) => ({ key: v.key, value: v.value, target: ["production" as const] })),
          ...(hasBackend && backendUrl
            ? [...apiKeys].map((key) => ({ key, value: backendUrl!, target: ["production" as const] }))
            : []),
        ];

        if (hasBackend && backendUrl) {
          await this.deploymentRepository.appendLog(
            deploymentId,
            `Wiring frontend → backend: ${[...apiKeys].join(", ")} = ${backendUrl}`,
          );
        }

        const createProjectParams: Parameters<VercelAdapter["createProject"]>[0] = {
          name: frontendProjectName,
          framework,
          environmentVariables: vercelEnvVars,
        };
        // When Vercel has a framework preset, its defaults are framework-aware
        // (build from package.json scripts, correct output dir) — only pass
        // explicit overrides when there is NO preset to rely on.
        if (!framework) {
          if (stack?.buildCommand) createProjectParams.buildCommand    = stack.buildCommand;
          if (stack?.outputDir)    createProjectParams.outputDirectory = stack.outputDir;
        }

        const project = await vercel.createProject(createProjectParams);

        // Always upsert env vars — project may already exist from a failed attempt
        await vercel.upsertProjectEnvVars(project.id, vercelEnvVars);

        await this.deploymentRepository.update(deploymentId, { vercelProjectId: project.id });

        const deployFromFilesParams: Parameters<VercelAdapter["deployFromFiles"]>[0] = {
          projectId: project.id,
          name: frontendProjectName,
          files: deployFiles,
          framework,
        };
        if (!framework) {
          if (stack?.buildCommand) deployFromFilesParams.buildCommand    = stack.buildCommand;
          if (stack?.outputDir)    deployFromFilesParams.outputDirectory = stack.outputDir;
        }

        const vDeploy = await vercel.deployFromFiles(deployFromFilesParams);

        await this.deploymentRepository.update(deploymentId, { vercelDeployId: vDeploy.id });
        await this.deploymentRepository.appendLog(
          deploymentId,
          `Vercel deployment triggered (${vDeploy.id}). Waiting for build…`,
        );

        await vercel.waitForDeployment(vDeploy.id);
        const frontendUrl = stableFrontendUrl;

        await this.deploymentRepository.update(deploymentId, { frontendUrl });
        await this.deploymentRepository.appendLog(deploymentId, `Frontend live at ${frontendUrl}`);
        logger.info("Frontend deployed", { deploymentId, frontendUrl });
      }

      // ── Complete ──────────────────────────────────────────────────────────
      await this.deploymentRepository.update(deploymentId, {
        status: "COMPLETED",
        completedAt: new Date(),
      });
      await this.deploymentRepository.appendLog(deploymentId, "Deployment completed successfully.");
      logger.info("Deployment completed", { deploymentId });

      // Register GitHub CI/CD webhook (best-effort — never fails the deployment)
      await this.maybeRegisterWebhook(deploymentId, repository.fullName, githubToken);
    } catch (err) {
      await this.failDeployment(deploymentId, err);
      throw err;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private resolveBackendEntry(
    pkg: PkgJson | null,
    files: Array<{ path: string }>,
  ): string {
    // Check package.json "main" field
    if (pkg?.main) {
      const main = pkg.main.replace(/^\.\//, "");
      if (main.startsWith("dist/")) {
        // Compiled output → find the source equivalent
        const withoutDist = main.replace(/^dist\//, "").replace(/\.js$/, "");
        for (const srcDir of ["src", ""]) {
          const candidate = srcDir ? `${srcDir}/${withoutDist}` : withoutDist;
          if (files.some((f) => f.path === `${candidate}.ts` || f.path === `${candidate}.js`)) {
            return candidate;
          }
        }
      }
      return main.replace(/\.(ts|js)$/, "");
    }

    // Check start script: "node dist/index.js" or "ts-node src/index.ts"
    const start = pkg?.scripts?.["start"] ?? "";
    const startMatch = start.match(/(?:node|ts-node)\s+([^\s]+)/);
    if (startMatch) {
      const path = startMatch[1]!.replace(/\.(ts|js)$/, "");
      if (path.startsWith("dist/")) {
        const withoutDist = path.replace(/^dist\//, "");
        if (files.some((f) => f.path === `src/${withoutDist}.ts` || f.path === `src/${withoutDist}.js`)) {
          return `src/${withoutDist}`;
        }
      }
      return path;
    }

    // Fallback: common entry points
    const candidates = ["src/index", "src/app", "src/server", "index", "app", "server"];
    for (const c of candidates) {
      if (files.some((f) => f.path === `${c}.ts` || f.path === `${c}.js`)) {
        return c;
      }
    }

    return "src/index";
  }

  /** Detect the backend's package manager from its lockfiles (component dir, then root). */
  private async detectPackageManager(
    githubToken: string,
    fullName: string,
    prefix: string,
  ): Promise<"npm" | "yarn" | "pnpm" | "bun"> {
    const dirs = prefix ? [prefix, ""] : [""];
    for (const dir of dirs) {
      if (await this.github.getFileContent(githubToken, fullName, `${dir}bun.lockb`)) return "bun";
      if (await this.github.getFileContent(githubToken, fullName, `${dir}pnpm-lock.yaml`)) return "pnpm";
      if (await this.github.getFileContent(githubToken, fullName, `${dir}yarn.lock`)) return "yarn";
    }
    return "npm";
  }

  private async maybeRegisterWebhook(
    deploymentId: string,
    repoFullName: string,
    githubToken: string,
  ): Promise<void> {
    if (!env.PUBLIC_URL || !env.WEBHOOK_SECRET) return;
    const webhookUrl = `${env.PUBLIC_URL}/api/${env.API_VERSION}/webhooks/github`;
    try {
      await this.github.registerWebhook(githubToken, repoFullName, webhookUrl, env.WEBHOOK_SECRET);
      await this.deploymentRepository.appendLog(
        deploymentId,
        "GitHub webhook registered — future pushes will auto-redeploy.",
      );
    } catch (err) {
      logger.warn("GitHub webhook registration failed (non-fatal)", {
        deploymentId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async failDeployment(deploymentId: string, err: unknown): Promise<void> {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Deployment failed", { deploymentId, error: message });
    await this.deploymentRepository
      .update(deploymentId, { status: "FAILED", error: message, completedAt: new Date() })
      .catch(() => undefined);
    await this.deploymentRepository
      .appendLog(deploymentId, `FAILED: ${message}`)
      .catch(() => undefined);

    // Layer 3, attempt #2 — one bounded AI diagnosis of the failure. Runs once
    // per deployment (failDeployment is terminal) and never throws.
    await this.diagnoseFailure(deploymentId, message).catch(() => undefined);
  }

  /** Best-effort AI failure diagnosis appended to the deployment logs. */
  private async diagnoseFailure(deploymentId: string, errorMessage: string): Promise<void> {
    if (!this.reasoning) return;

    const deployment = await this.deploymentRepository.findById(deploymentId);
    if (!deployment) return;

    const s = deployment.detectedStack;
    const stackSummary = s
      ? `frontend=${s.frontend ?? "none"}${s.frontendPath ? ` (${s.frontendPath}/)` : ""}, ` +
        `backend=${s.backend ?? "none"}${s.backendPath ? ` (${s.backendPath}/)` : ""}, ` +
        `build=${s.buildCommand ?? "-"}, outputDir=${s.outputDir ?? "-"}, pm=${s.packageManager}`
      : "(no stack detected)";

    const diagnosis = await this.reasoning.diagnoseDeploymentFailure({
      errorMessage,
      logs: deployment.logs,
      analysis: null,
      stackSummary,
    });
    if (!diagnosis) return;

    const lines = [
      `AI diagnosis: ${diagnosis.likelyCause}`,
      diagnosis.frameworkMisidentified && diagnosis.correctedFramework
        ? `AI suggests the stack was misidentified — likely ${diagnosis.correctedFramework}.`
        : null,
      diagnosis.correctedBuildCommand ? `Suggested build command: ${diagnosis.correctedBuildCommand}` : null,
      diagnosis.correctedStartCommand ? `Suggested start command: ${diagnosis.correctedStartCommand}` : null,
      diagnosis.correctedOutputDirectory ? `Suggested output directory: ${diagnosis.correctedOutputDirectory}` : null,
      `Recommendation: ${diagnosis.recommendation}`,
    ].filter((l): l is string => Boolean(l));

    for (const line of lines) {
      await this.deploymentRepository.appendLog(deploymentId, line).catch(() => undefined);
    }
  }

  private serviceSlug(repoName: string, suffix: "api" | "web"): string {
    const base = repoName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    return `deplo-${base}-${suffix}`;
  }
}
