import { AppError } from "../../shared/errors/AppError";
import { env } from "../../config/env";

interface VercelProject {
  id: string;
  name: string;
  url: string;
}

interface VercelDeployment {
  id: string;
  url: string;
  readyState: "READY" | "ERROR" | "CANCELED" | "BUILDING" | "QUEUED";
}

export class VercelAdapter {
  private readonly apiBase = "https://api.vercel.com";

  async createProject(params: {
    name: string;
    framework: string;
    gitRepository: { type: "github"; repo: string };
    buildCommand?: string;
    outputDirectory?: string;
    environmentVariables?: Array<{ key: string; value: string; target: string[] }>;
  }): Promise<VercelProject> {
    const body: Record<string, unknown> = {
      name: params.name,
      framework: params.framework,
      gitRepository: params.gitRepository,
    };
    if (params.buildCommand) body.buildCommand = params.buildCommand;
    if (params.outputDirectory) body.outputDirectory = params.outputDirectory;
    if (params.environmentVariables) {
      body.environmentVariables = params.environmentVariables;
    }

    return this.request<VercelProject>("POST", "/v9/projects", body);
  }

  async triggerDeployment(projectId: string, ref: string): Promise<VercelDeployment> {
    return this.request<VercelDeployment>("POST", `/v13/deployments`, {
      name: projectId,
      gitSource: { ref, type: "github" },
    });
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
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
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
