import crypto from "node:crypto";
import { AppError } from "../../shared/errors/AppError";
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

export interface VercelAccountInfo {
  userId: string;
  teamId: string | null;
  accountName: string;
  teamName: string | null;
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

export interface DeployFile {
  path: string;
  content: Buffer;
}

export interface DeployFromFilesParams {
  projectId: string;
  name: string;
  files: DeployFile[];
  buildCommand?: string;
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
const MAX_FILE_BYTES = 45 * 1024 * 1024;

function shouldExclude(filePath: string): boolean {
  if (EXCLUDED_PREFIXES.some((p) => filePath.startsWith(p))) return true;
  if (EXCLUDED_EXTENSIONS.some((ext) => filePath.endsWith(ext))) return true;
  return false;
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

/**
 * Per-user Vercel API client.
 * Instantiated with a user's OAuth integration token + optional team ID.
 * All API calls execute under the user's own Vercel account — deplo.ai never
 * uses a shared platform token.
 */
export class VercelAdapter {
  private readonly apiBase = "https://api.vercel.com";

  constructor(
    private readonly token: string,
    private readonly teamId: string | null = null,
  ) {}

  /** Fetch account/team info for the connected token — used on integration connect. */
  async getAccountInfo(): Promise<VercelAccountInfo> {
    const { user } = await this.request<{ user: { id: string; name: string; username: string } }>("GET", "/v2/user");
    let teamName: string | null = null;
    if (this.teamId) {
      const team = await this.request<{ name: string }>("GET", `/v2/teams/${this.teamId}`);
      teamName = team.name;
    }
    return {
      userId: user.id,
      teamId: this.teamId,
      accountName: user.name || user.username,
      teamName,
    };
  }

  /** Create a Vercel project in the user's account, or return the existing one. */
  async createProject(params: CreateProjectParams): Promise<VercelProject> {
    const body: Record<string, unknown> = {
      name: params.name,
      framework: params.framework,
    };
    if (params.rootDirectory)    body.rootDirectory    = params.rootDirectory;
    if (params.buildCommand)     body.buildCommand     = params.buildCommand;
    if (params.outputDirectory)  body.outputDirectory  = params.outputDirectory;
    if (params.environmentVariables?.length) {
      body.environmentVariables = params.environmentVariables.map((v) => ({
        ...v,
        type: v.type ?? "encrypted",
      }));
    }

    try {
      const project = await this.request<VercelProject>("POST", "/v9/projects", body);
      logger.info("Vercel project created", { projectId: project.id, name: project.name });
      return project;
    } catch (err) {
      if (err instanceof Error && err.message.includes("409")) {
        const existing = await this.request<VercelProject>("GET", `/v9/projects/${encodeURIComponent(params.name)}`);
        logger.info("Vercel project already exists, reusing", { projectId: existing.id, name: existing.name });
        return existing;
      }
      throw err;
    }
  }

  /** Upload files and create a deployment inside the user's Vercel account. */
  async deployFromFiles(params: DeployFromFilesParams): Promise<VercelDeployment> {
    const eligible = params.files
      .filter((f) => !shouldExclude(f.path) && f.content.length <= MAX_FILE_BYTES)
      .slice(0, MAX_FILES);

    logger.info("Uploading files to Vercel", {
      projectId: params.projectId,
      fileCount: eligible.length,
    });

    const UPLOAD_BATCH = 10;
    const fileRefs: Array<{ file: string; sha: string; size: number }> = [];
    for (let i = 0; i < eligible.length; i += UPLOAD_BATCH) {
      const batch = eligible.slice(i, i + UPLOAD_BATCH);
      const refs = await Promise.all(
        batch.map(async (f) => {
          const sha = crypto.createHash("sha1").update(f.content).digest("hex");
          await this.uploadFile(sha, f.content);
          return { file: f.path, sha, size: f.content.length };
        }),
      );
      fileRefs.push(...refs);
    }

    const deployBody: Record<string, unknown> = {
      name: params.name,
      files: fileRefs,
      target: "production",
    };
    const projectSettings: Record<string, unknown> = {};
    if (params.framework)        projectSettings.framework        = params.framework;
    if (params.buildCommand)     projectSettings.buildCommand     = params.buildCommand;
    if (params.outputDirectory)  projectSettings.outputDirectory  = params.outputDirectory;
    if (Object.keys(projectSettings).length) deployBody.projectSettings = projectSettings;

    const deployment = await this.request<VercelDeployment>(
      "POST",
      `/v13/deployments?projectId=${encodeURIComponent(params.projectId)}`,
      deployBody,
    );
    logger.info("Vercel deployment triggered", { deploymentId: deployment.id, url: deployment.url });
    return deployment;
  }

  async uploadFile(sha1: string, content: Buffer): Promise<void> {
    const teamSuffix = this.teamId ? `?teamId=${this.teamId}` : "";
    const MAX_ATTEMPTS = 3;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(`${this.apiBase}/v2/files${teamSuffix}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/octet-stream",
            "Content-Length": String(content.length),
            "x-vercel-digest": sha1,
          },
          body: content,
        });
        if (!res.ok && res.status !== 409) {
          const text = await res.text().catch(() => "");
          throw AppError.externalService("Vercel", `File upload failed ${res.status}: ${text}`);
        }
        return;
      } catch (err) {
        lastErr = err;
        if (err instanceof Error && /^\d{3}:/.test(err.message)) throw err;
        if (attempt < MAX_ATTEMPTS) await sleep(1000 * attempt);
      }
    }
    throw lastErr;
  }

  async waitForDeployment(
    deploymentId: string,
    opts: { timeoutMs?: number } = {},
  ): Promise<{ url: string }> {
    const timeoutMs = opts.timeoutMs ?? 15 * 60 * 1_000;
    const deadline = Date.now() + timeoutMs;
    let delay = 5_000;

    while (Date.now() < deadline) {
      const deployment = await this.getDeployment(deploymentId);
      logger.info("Vercel deployment status", { deploymentId, readyState: deployment.readyState });

      if (deployment.readyState === "READY") return { url: `https://${deployment.url}` };

      if (deployment.readyState === "ERROR" || deployment.readyState === "CANCELED") {
        throw AppError.externalService(
          "Vercel",
          `Deployment ${deploymentId} ended with state: ${deployment.readyState}`,
        );
      }

      await sleep(delay);
      delay = Math.min(delay * 1.5, 30_000);
    }

    throw AppError.externalService("Vercel", `Deployment timed out after ${timeoutMs / 60_000} minutes`);
  }

  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    return this.request<VercelDeployment>("GET", `/v13/deployments/${deploymentId}`);
  }

  async upsertProjectEnvVars(
    projectId: string,
    vars: Array<{ key: string; value: string; target: Array<"production" | "preview" | "development"> }>,
  ): Promise<void> {
    if (!vars.length) return;

    const { envs } = await this.request<{ envs: Array<{ id: string; key: string }> }>(
      "GET", `/v9/projects/${projectId}/env`,
    );
    const existingMap = new Map(envs.map((e) => [e.key, e.id]));

    await Promise.all(
      vars.map(async (v) => {
        const existingId = existingMap.get(v.key);
        if (existingId) {
          await this.request("PATCH", `/v9/projects/${projectId}/env/${existingId}`, {
            value: v.value, target: v.target, type: "encrypted",
          });
        } else {
          await this.request("POST", `/v9/projects/${projectId}/env`, {
            key: v.key, value: v.value, target: v.target, type: "encrypted",
          });
        }
      }),
    );

    logger.info("Vercel project env vars upserted", { projectId, count: vars.length });
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.request("DELETE", `/v9/projects/${projectId}`);
  }

  private async request<T = void>(method: string, path: string, body?: unknown): Promise<T> {
    // Append teamId to all requests for team installs
    const sep = path.includes("?") ? "&" : "?";
    const teamQuery = this.teamId ? `${sep}teamId=${this.teamId}` : "";
    // Don't double-append teamId if the path already has projectId query param and we need to add teamId
    const url = `${this.apiBase}${path}${teamQuery}`;

    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);

    const res = await fetch(url, init);

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
