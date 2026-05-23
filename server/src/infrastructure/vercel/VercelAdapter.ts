import crypto from "node:crypto";
import { AppError } from "../../shared/errors/AppError";
import { env } from "../../config/env";
import { logger } from "../../shared/logger/logger";

// ─── Response shapes ─────────────────────────────────────────────────────────

export interface VercelProject {
  id: string;
  name: string;
}

export interface VercelDeployment {
  id: string;
  url: string;
  readyState: "READY" | "ERROR" | "CANCELED" | "BUILDING" | "QUEUED" | "INITIALIZING";
}

// ─── Params ──────────────────────────────────────────────────────────────────

export type VercelFramework =
  | "nextjs"
  | "vite"
  | "create-react-app"
  | "remix"
  | "nuxtjs"
  | "svelte"
  | null;

export interface CreateProjectParams {
  name: string;
  framework: VercelFramework;
  rootDirectory?: string;
  buildCommand?: string;
  outputDirectory?: string;
  environmentVariables?: Array<{
    key: string;
    value: string;
    target: Array<"production" | "preview" | "development">;
    type?: "plain" | "encrypted" | "secret";
  }>;
}

/** A single file to include in a file-based deployment. */
export interface DeployFile {
  /** Relative path inside the repo (or subdir), e.g. "src/index.ts" */
  path: string;
  content: Buffer;
}

export interface DeployFromFilesParams {
  projectId: string;
  name: string;
  files: DeployFile[];
  /** Override build command (e.g. "npm run build") */
  buildCommand?: string;
  /** Override output directory (e.g. ".next") */
  outputDirectory?: string;
  framework?: VercelFramework;
  environmentVariables?: Array<{
    key: string;
    value: string;
    target: Array<"production" | "preview" | "development">;
  }>;
}

// ─── Excluded paths ───────────────────────────────────────────────────────────

const EXCLUDED_PREFIXES = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  ".turbo/",
  "coverage/",
  ".nyc_output/",
];
const EXCLUDED_EXTENSIONS = [".log", ".lock"];
const MAX_FILES = 8_000;
const MAX_FILE_BYTES = 45 * 1024 * 1024; // 45 MB

function shouldExclude(filePath: string): boolean {
  if (EXCLUDED_PREFIXES.some((p) => filePath.startsWith(p))) return true;
  if (EXCLUDED_EXTENSIONS.some((ext) => filePath.endsWith(ext))) return true;
  return false;
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export class VercelAdapter {
  private readonly apiBase = "https://api.vercel.com";

  /** Create a Vercel project (no GitHub connection required). */
  async createProject(params: CreateProjectParams): Promise<VercelProject> {
    const body: Record<string, unknown> = {
      name: params.name,
      framework: params.framework,
    };
    if (params.rootDirectory)    body.rootDirectory    = params.rootDirectory;
    if (params.buildCommand)     body.buildCommand     = params.buildCommand;
    if (params.outputDirectory)  body.outputDirectory  = params.outputDirectory;
    if (params.environmentVariables?.length) {
      body.environmentVariables = params.environmentVariables;
    }

    const project = await this.request<VercelProject>("POST", "/v9/projects", body);
    logger.info("Vercel project created", { projectId: project.id, name: project.name });
    return project;
  }

  /**
   * Upload files directly to Vercel and create a deployment.
   * This does NOT require a GitHub App — we push the source ourselves.
   */
  async deployFromFiles(params: DeployFromFilesParams): Promise<VercelDeployment> {
    const eligible = params.files
      .filter((f) => !shouldExclude(f.path) && f.content.length <= MAX_FILE_BYTES)
      .slice(0, MAX_FILES);

    logger.info("Uploading files to Vercel", {
      projectId: params.projectId,
      fileCount: eligible.length,
    });

    // Upload each file (Vercel dedupes by SHA — safe to parallelise)
    const fileRefs = await Promise.all(
      eligible.map(async (f) => {
        const sha = crypto.createHash("sha1").update(f.content).digest("hex");
        await this.uploadFile(sha, f.content);
        return { file: f.path, sha, size: f.content.length };
      }),
    );

    const deployBody: Record<string, unknown> = {
      name: params.name,
      files: fileRefs,
      projectId: params.projectId,
      target: "production",
    };
    const projectSettings: Record<string, unknown> = {};
    if (params.framework)        projectSettings.framework        = params.framework;
    if (params.buildCommand)     projectSettings.buildCommand     = params.buildCommand;
    if (params.outputDirectory)  projectSettings.outputDirectory  = params.outputDirectory;
    if (Object.keys(projectSettings).length) deployBody.projectSettings = projectSettings;

    const deployment = await this.request<VercelDeployment>("POST", "/v13/deployments", deployBody);
    logger.info("Vercel deployment triggered", {
      deploymentId: deployment.id,
      url: deployment.url,
    });
    return deployment;
  }

  /** Upload a single file to Vercel's file store (idempotent). */
  async uploadFile(sha1: string, content: Buffer): Promise<void> {
    if (!env.VERCEL_TOKEN) {
      throw AppError.externalService("Vercel", "VERCEL_TOKEN not configured");
    }
    const teamSuffix = env.VERCEL_TEAM_ID ? `?teamId=${env.VERCEL_TEAM_ID}` : "";
    const res = await fetch(`${this.apiBase}/v2/files${teamSuffix}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.VERCEL_TOKEN}`,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(content.length),
        "x-vercel-digest": sha1,
      },
      body: content,
    });
    // 200 = newly stored, 409 = already exists (both fine)
    if (!res.ok && res.status !== 409) {
      const text = await res.text().catch(() => "");
      throw AppError.externalService("Vercel", `File upload failed ${res.status}: ${text}`);
    }
  }

  /** Poll deployment until READY or ERROR (max ~15 min with exponential backoff). */
  async waitForDeployment(
    deploymentId: string,
    opts: { timeoutMs?: number } = {},
  ): Promise<{ url: string }> {
    const timeoutMs = opts.timeoutMs ?? 15 * 60 * 1_000;
    const deadline = Date.now() + timeoutMs;
    let delay = 5_000;

    while (Date.now() < deadline) {
      const deployment = await this.getDeployment(deploymentId);
      logger.info("Vercel deployment status", {
        deploymentId,
        readyState: deployment.readyState,
      });

      if (deployment.readyState === "READY") {
        return { url: `https://${deployment.url}` };
      }

      if (deployment.readyState === "ERROR" || deployment.readyState === "CANCELED") {
        throw AppError.externalService(
          "Vercel",
          `Deployment ${deploymentId} ended with state: ${deployment.readyState}`,
        );
      }

      await sleep(delay);
      delay = Math.min(delay * 1.5, 30_000);
    }

    throw AppError.externalService(
      "Vercel",
      `Deployment timed out after ${timeoutMs / 60_000} minutes`,
    );
  }

  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    return this.request<VercelDeployment>("GET", `/v13/deployments/${deploymentId}`);
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.request("DELETE", `/v9/projects/${projectId}`);
  }

  private async request<T = void>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!env.VERCEL_TOKEN) {
      throw AppError.externalService("Vercel", "VERCEL_TOKEN not configured");
    }
    const teamSuffix = env.VERCEL_TEAM_ID ? `?teamId=${env.VERCEL_TEAM_ID}` : "";
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${env.VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);

    const res = await fetch(`${this.apiBase}${path}${teamSuffix}`, init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw AppError.externalService("Vercel", `${res.status}: ${text}`);
    }

    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
