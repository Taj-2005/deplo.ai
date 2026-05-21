import { AppError } from "../../shared/errors/AppError";
import { env } from "../../config/env";

interface RenderService {
  id: string;
  name: string;
  serviceDetails: { url: string };
  state: "live" | "failed" | "build_failed" | "suspended" | "not_suspended";
}

interface RenderDeploy {
  id: string;
  status: "live" | "failed" | "build_failed" | "in_progress" | "pending";
}

export class RenderAdapter {
  private readonly apiBase = "https://api.render.com/v1";

  async createWebService(params: {
    name: string;
    repoUrl: string;
    branch: string;
    buildCommand: string;
    startCommand: string;
    envVars: Array<{ key: string; value: string }>;
    plan?: "starter" | "standard" | "pro";
  }): Promise<RenderService> {
    return this.request<RenderService>("POST", "/services", {
      type: "web_service",
      name: params.name,
      repo: params.repoUrl,
      branch: params.branch,
      buildCommand: params.buildCommand,
      startCommand: params.startCommand,
      plan: params.plan ?? "starter",
      envVars: params.envVars,
    });
  }

  async getService(serviceId: string): Promise<RenderService> {
    return this.request<RenderService>("GET", `/services/${serviceId}`);
  }

  async triggerDeploy(serviceId: string): Promise<RenderDeploy> {
    return this.request<RenderDeploy>("POST", `/services/${serviceId}/deploys`, {
      clearCache: false,
    });
  }

  async getDeploy(serviceId: string, deployId: string): Promise<RenderDeploy> {
    return this.request<RenderDeploy>(
      "GET",
      `/services/${serviceId}/deploys/${deployId}`,
    );
  }

  async suspendService(serviceId: string): Promise<void> {
    await this.request("POST", `/services/${serviceId}/suspend`);
  }

  private async request<T = void>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!env.RENDER_API_KEY) {
      throw AppError.externalService("Render", "RENDER_API_KEY not configured");
    }
    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env.RENDER_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw AppError.externalService("Render", `${res.status}: ${text}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
