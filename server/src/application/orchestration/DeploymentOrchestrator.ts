import type { IDeploymentRepository } from "../../domain/deployment/DeploymentRepository.interface";
import type { IRepositoryRepository } from "../../domain/repository/Repository";
import type { IUserRepository } from "../../domain/user/UserRepository.interface";
import type { AnalysisService } from "../services/AnalysisService";
import { type VercelAdapter } from "../../infrastructure/vercel/VercelAdapter";
import type { GitHubAdapter } from "../../infrastructure/github/GitHubAdapter";
import type { StackType } from "../../domain/deployment/Deployment";
import type { VercelFramework } from "../../infrastructure/vercel/VercelAdapter";
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
    private readonly vercel: VercelAdapter,
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

      const requiredVars = envVars.filter((v) => v.isRequired);
      const needsEnv = requiredVars.length > 0;

      await this.deploymentRepository.update(deploymentId, {
        detectedStack: stack,
        envVariables: envVars,
        status: needsEnv ? "WAITING_FOR_ENV" : "DEPLOYING_BACKEND",
      });

      if (needsEnv) {
        await this.deploymentRepository.appendLog(
          deploymentId,
          `Waiting for ${requiredVars.length} required environment variable(s).`,
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

      let backendUrl: string | null = null;

      // ── Backend (Vercel serverless) ──────────────────────────────────────
      if (hasBackend) {
        if (!env.VERCEL_TOKEN) {
          throw AppError.externalService("Vercel", "VERCEL_TOKEN must be configured");
        }

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
            backendFiles.push({ path: relativePath, content: buffers[idx]! });
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

        const backendProjectName = this.serviceSlug(repository.name, "api");
        const backendEnvVars = [
          { key: "NODE_ENV", value: "production", target: ["production" as const] },
          ...envVars
            .filter((v) => !v.isRequired || v.value !== "")
            .map((v) => ({ key: v.key, value: v.value, target: ["production" as const] })),
        ];

        const backendProject = await this.vercel.createProject({
          name: backendProjectName,
          framework: null,
          environmentVariables: backendEnvVars,
        });

        const backendDeploy = await this.vercel.deployFromFiles({
          projectId: backendProject.id,
          name: backendProjectName,
          files: backendFiles,
        });

        await this.deploymentRepository.appendLog(
          deploymentId,
          `Vercel backend deployment triggered (${backendDeploy.id}). Waiting for build…`,
        );

        const { url: bUrl } = await this.vercel.waitForDeployment(backendDeploy.id);
        backendUrl = bUrl;

        await this.deploymentRepository.update(deploymentId, {
          backendUrl,
          status: "BACKEND_READY",
          renderServiceId: backendProject.id, // repurposed to store backend Vercel project ID
        });
        await this.deploymentRepository.appendLog(deploymentId, `Backend live at ${backendUrl}`);
        logger.info("Backend deployed to Vercel (serverless)", { deploymentId, backendUrl });
      }

      // ── Frontend (Vercel — file-based) ───────────────────────────────────
      if (hasFrontend) {
        if (!env.VERCEL_TOKEN) {
          throw AppError.externalService("Vercel", "VERCEL_TOKEN must be configured");
        }

        await this.deploymentRepository.update(deploymentId, { status: "DEPLOYING_FRONTEND" });
        await this.deploymentRepository.appendLog(deploymentId, "Fetching repository files…");

        const frontendSubPath = stack?.frontendPath ?? "";
        const treeEntries = await this.github.getRepoTree(githubToken, repository.fullName, branch);

        const relevantEntries = frontendSubPath
          ? treeEntries.filter((e) => e.path.startsWith(`${frontendSubPath}/`))
          : treeEntries;

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

        const projectName = this.serviceSlug(repository.name, "web");
        const framework   = toVercelFramework(stack?.frontend ?? null);

        const vercelEnvVars = envVars
          .filter((v) => !v.isRequired || v.value !== "")
          .map((v) => ({ key: v.key, value: v.value, target: ["production" as const] }));

        if (backendUrl) {
          vercelEnvVars.push({
            key: "NEXT_PUBLIC_API_URL",
            value: backendUrl,
            target: ["production"],
          });
        }

        const createProjectParams: Parameters<VercelAdapter["createProject"]>[0] = {
          name: projectName,
          framework,
          environmentVariables: vercelEnvVars,
        };
        if (stack?.buildCommand)  createProjectParams.buildCommand    = stack.buildCommand;
        if (stack?.outputDir)     createProjectParams.outputDirectory = stack.outputDir;

        const project = await this.vercel.createProject(createProjectParams);

        await this.deploymentRepository.update(deploymentId, { vercelProjectId: project.id });

        const deployFromFilesParams: Parameters<VercelAdapter["deployFromFiles"]>[0] = {
          projectId: project.id,
          name: projectName,
          files: deployFiles,
          framework,
        };
        if (stack?.buildCommand) deployFromFilesParams.buildCommand    = stack.buildCommand;
        if (stack?.outputDir)    deployFromFilesParams.outputDirectory = stack.outputDir;

        const vDeploy = await this.vercel.deployFromFiles(deployFromFilesParams);

        await this.deploymentRepository.update(deploymentId, { vercelDeployId: vDeploy.id });
        await this.deploymentRepository.appendLog(
          deploymentId,
          `Vercel deployment triggered (${vDeploy.id}). Waiting for build…`,
        );

        const { url: frontendUrl } = await this.vercel.waitForDeployment(vDeploy.id);

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
      `// Generated by deplo.ai — serverless adapter for ${backend ?? "Express"} backend`,
      `const serverlessHttp = require('serverless-http');`,
      `const mod = require('${importPath}');`,
      `const app = mod.default || mod.app || mod.fastify || mod;`,
      `module.exports = serverlessHttp(app);`,
    ].join("\n") + "\n";
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
