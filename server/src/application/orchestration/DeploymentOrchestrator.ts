import type { IDeploymentRepository } from "../../domain/deployment/DeploymentRepository.interface";
import type { IRepositoryRepository } from "../../domain/repository/Repository";
import type { IUserRepository } from "../../domain/user/UserRepository.interface";
import type { AnalysisService } from "../services/AnalysisService";
import type { IntegrationService } from "../services/IntegrationService";
import { VercelAdapter, type VercelFramework } from "../../infrastructure/vercel/VercelAdapter";
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
};

function toVercelFramework(stack: StackType | null): VercelFramework {
  return (stack && VERCEL_FRAMEWORK[stack]) ?? null;
}

function toHumanStack(stack: StackType | null): string | null {
  const map: Record<string, string> = {
    NEXTJS: "Next.js",
    REACT_VITE: "React (Vite)",
    EXPRESS: "Express.js",
    FASTIFY: "Fastify",
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

      // Load the user's Vercel credentials — throws if not connected
      const vercelCreds = await this.integrationService.resolveVercelCredentials(deployment.userId);
      const vercel = new VercelAdapter(vercelCreds.token, vercelCreds.teamId);

      const stack = deployment.detectedStack;
      const hasBackend  = !!stack?.backend;
      const hasFrontend = !!stack?.frontend;
      const envVars = deployment.envVariables;
      const branch  = deployment.branch;

      if (!hasBackend && !hasFrontend) {
        await this.deploymentRepository.appendLog(
          deploymentId,
          "No deployable stack detected. Supported: Next.js, React (Vite), Express, Fastify.",
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

      // Stable Vercel project domains — computed before any deployment so we can cross-link
      // frontend ↔ backend (CORS, NEXT_PUBLIC_API_URL) without a chicken-and-egg problem.
      const backendProjectName  = this.serviceSlug(repository.name, "api");
      const frontendProjectName = this.serviceSlug(repository.name, "web");
      const stableBackendUrl    = `https://${backendProjectName}.vercel.app`;
      const stableFrontendUrl   = `https://${frontendProjectName}.vercel.app`;

      // ── Backend (Vercel serverless) ──────────────────────────────────────
      if (hasBackend && !backendUrl) {

        await this.deploymentRepository.update(deploymentId, { status: "DEPLOYING_BACKEND" });
        await this.deploymentRepository.appendLog(deploymentId, "Deploying backend to Vercel (serverless)…");

        const backendSubPath = stack?.backendPath ?? "";
        const treeEntries = await this.github.getRepoTree(githubToken, repository.fullName, branch);

        const relevantEntries = backendSubPath
          ? treeEntries.filter((e) => e.path.startsWith(`${backendSubPath}/`))
          : treeEntries;

        await this.deploymentRepository.appendLog(
          deploymentId,
          `Downloading ${relevantEntries.length} files${backendSubPath ? ` from ${backendSubPath}/` : ""}…`,
        );

        // Files we always inject — remove originals to prevent duplicates
        const INJECTED_PATHS = new Set(["vercel.json", "api/index.js", "api/index.ts"]);

        const BATCH = 20;
        const backendFiles: Array<{ path: string; content: Buffer }> = [];
        for (let i = 0; i < relevantEntries.length; i += BATCH) {
          const batch = relevantEntries.slice(i, i + BATCH);
          const buffers = await Promise.all(
            batch.map((e) => this.github.getBlob(githubToken, repository.fullName, e.sha)),
          );
          batch.forEach((e, idx) => {
            const relativePath = backendSubPath
              ? e.path.slice(`${backendSubPath}/`.length)
              : e.path;
            if (!INJECTED_PATHS.has(relativePath)) {
              backendFiles.push({ path: relativePath, content: buffers[idx]! });
            }
          });
        }

        // Patch package.json to add serverless-http
        const pkgIdx = backendFiles.findIndex((f) => f.path === "package.json");
        let pkg: PkgJson | null = null;
        if (pkgIdx !== -1) {
          try {
            pkg = JSON.parse(backendFiles[pkgIdx]!.content.toString("utf8")) as PkgJson;
            const patched: PkgJson = {
              ...pkg,
              dependencies: { ...(pkg.dependencies ?? {}), "serverless-http": "^3.2.0" },
            };
            backendFiles[pkgIdx] = {
              path: "package.json",
              content: Buffer.from(JSON.stringify(patched, null, 2), "utf8"),
            };
          } catch { /* leave as-is */ }
        }

        // Detect entry point and inject serverless wrapper + vercel.json
        const entry = this.resolveBackendEntry(pkg, backendFiles);
        backendFiles.push(
          {
            path: "api/index.js",
            content: Buffer.from(this.generateServerlessWrapper(entry, stack?.backend ?? null), "utf8"),
          },
          {
            path: "vercel.json",
            content: Buffer.from(
              JSON.stringify(
                { version: 2, builds: [{ src: "api/index.js", use: "@vercel/node" }], routes: [{ src: "/(.*)", dest: "/api/index.js" }] },
                null, 2,
              ),
              "utf8",
            ),
          },
        );

        const backendEnvVars: Array<{ key: string; value: string; target: Array<"production"> }> = [
          { key: "NODE_ENV",      value: "production",      target: ["production"] },
          // deplo.ai injects the frontend URL so the serverless CORS wrapper can allow it
          { key: "FRONTEND_URL", value: stableFrontendUrl, target: ["production"] },
          ...envVars
            .filter((v) => !v.isRequired || v.value !== "")
            .map((v) => ({ key: v.key, value: v.value, target: ["production" as const] })),
        ];

        const backendProject = await vercel.createProject({
          name: backendProjectName,
          framework: null,
          environmentVariables: backendEnvVars,
        });

        // Always upsert env vars — project may already exist from a failed attempt
        await vercel.upsertProjectEnvVars(backendProject.id, backendEnvVars);

        const backendDeploy = await vercel.deployFromFiles({
          projectId: backendProject.id,
          name: backendProjectName,
          files: backendFiles,
        });

        await this.deploymentRepository.appendLog(
          deploymentId,
          `Vercel backend deployment triggered (${backendDeploy.id}). Waiting for build…`,
        );

        await vercel.waitForDeployment(backendDeploy.id);
        backendUrl = stableBackendUrl;

        await this.deploymentRepository.update(deploymentId, {
          backendUrl,
          status: "BACKEND_READY",
          renderServiceId: backendProject.id, // repurposed to store backend Vercel project ID
        });
        await this.deploymentRepository.appendLog(deploymentId, `Backend live at ${backendUrl}`);
        logger.info("Backend deployed to Vercel (serverless)", { deploymentId, backendUrl });
      }

      // ── Frontend (Vercel — file-based) ───────────────────────────────────
      if (hasFrontend && !deployment.frontendUrl) {
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

        const vercelEnvVars: Array<{ key: string; value: string; target: Array<"production"> }> = [
          ...envVars
            .filter((v) => !v.isRequired || v.value !== "")
            .map((v) => ({ key: v.key, value: v.value, target: ["production" as const] })),
          // Always set to stable backend URL — fixes stale hash-URL from previous deployments
          ...(hasBackend ? [{ key: "NEXT_PUBLIC_API_URL", value: stableBackendUrl, target: ["production" as const] }] : []),
        ];

        const createProjectParams: Parameters<VercelAdapter["createProject"]>[0] = {
          name: frontendProjectName,
          framework,
          environmentVariables: vercelEnvVars,
        };
        if (stack?.buildCommand)  createProjectParams.buildCommand    = stack.buildCommand;
        if (stack?.outputDir)     createProjectParams.outputDirectory = stack.outputDir;

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
        if (stack?.buildCommand) deployFromFilesParams.buildCommand    = stack.buildCommand;
        if (stack?.outputDir)    deployFromFilesParams.outputDirectory = stack.outputDir;

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

  private generateServerlessWrapper(entryPath: string, backend: StackType | null): string {
    const importPath = entryPath.startsWith(".") ? entryPath : `../${entryPath}`;
    return [
      `'use strict';`,
      `// Generated by deplo.ai — serverless wrapper (${backend ?? "Express"} backend)`,
      `const http = require('http');`,
      `const serverlessHttp = require('serverless-http');`,
      ``,
      `// CORS — injected at wrapper level so it works regardless of user app config.`,
      `// FRONTEND_URL is set by deplo.ai at deploy time (stable Vercel project domain).`,
      `const CORS_ORIGIN  = process.env.FRONTEND_URL || null;`,
      `const CORS_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';`,
      `const CORS_HEADERS = 'Content-Type,Authorization,X-Requested-With,Accept';`,
      `function setCors(req, res) {`,
      `  const origin = req.headers['origin'];`,
      `  if (CORS_ORIGIN) {`,
      `    if (!origin || origin === CORS_ORIGIN) {`,
      `      res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);`,
      `      res.setHeader('Access-Control-Allow-Credentials', 'true');`,
      `      res.setHeader('Vary', 'Origin');`,
      `    }`,
      `  } else if (origin) {`,
      `    // No FRONTEND_URL set — reflect origin (dev fallback only)`,
      `    res.setHeader('Access-Control-Allow-Origin', origin);`,
      `    res.setHeader('Access-Control-Allow-Credentials', 'true');`,
      `    res.setHeader('Vary', 'Origin');`,
      `  }`,
      `  res.setHeader('Access-Control-Allow-Methods', CORS_METHODS);`,
      `  res.setHeader('Access-Control-Allow-Headers', CORS_HEADERS);`,
      `}`,
      ``,
      `// Most backends use async bootstrap: async function main() { await db.connect(); app.listen(); }`,
      `// require() is synchronous, so http.createServer is called AFTER require() returns.`,
      `// We use a Promise so the exported handler can await the app being ready.`,
      `let _resolveHandler;`,
      `const _handlerReady = new Promise(function(resolve) { _resolveHandler = resolve; });`,
      ``,
      `// Intercept http.createServer — captures the Express/Fastify app no matter how it is created.`,
      `const _origCreate = http.createServer;`,
      `http.createServer = function() {`,
      `  const args = Array.prototype.slice.call(arguments);`,
      `  const server = _origCreate.apply(http, args);`,
      `  if (typeof args[0] === 'function') _resolveHandler(args[0]);`,
      `  // Stub listen() — serverless has no persistent port`,
      `  server.listen = function(port, host, cb) {`,
      `    const done = typeof port === 'function' ? port`,
      `      : typeof host === 'function' ? host`,
      `      : typeof cb === 'function' ? cb : null;`,
      `    if (done) setImmediate(done);`,
      `    return server;`,
      `  };`,
      `  return server;`,
      `};`,
      ``,
      `// Load the user's app — triggers the async bootstrap`,
      `const mod = require('${importPath}');`,
      ``,
      `// If the app exports its handler directly (no listen call), resolve immediately`,
      `const _exported = mod && typeof mod === 'object'`,
      `  ? (mod.default || mod.app || mod.handler || mod.fastify)`,
      `  : null;`,
      `if (typeof _exported === 'function') _resolveHandler(_exported);`,
      ``,
      `// Cache the serverless-wrapped handler after first init`,
      `let _wrapped = null;`,
      ``,
      `// Async handler — waits for the app to finish its async startup before serving.`,
      `// Handles: await db.connect(), await redis.connect(), etc. before app.listen().`,
      `module.exports = async function handler(req, res) {`,
      `  setCors(req, res);`,
      `  // Short-circuit OPTIONS preflight without delegating to the user's app`,
      `  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }`,
      `  if (!_wrapped) {`,
      `    const app = await Promise.race([`,
      `      _handlerReady,`,
      `      new Promise(function(_, reject) {`,
      `        setTimeout(function() {`,
      `          reject(new Error('[deplo.ai] App startup timed out (30s). Verify DB_URL, REDIS_URL and other required env vars are set.'));`,
      `        }, 30000);`,
      `      }),`,
      `    ]);`,
      `    _wrapped = serverlessHttp(app);`,
      `  }`,
      `  return _wrapped(req, res);`,
      `};`,
    ].join("\n") + "\n";
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
