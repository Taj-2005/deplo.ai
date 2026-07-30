import { AppError } from "../../shared/errors/AppError";
import { logger } from "../../shared/logger/logger";

// ─── Response shapes ────────────────────────────────────────────────────────

export interface RenderService {
  id: string;
  name: string;
  type: string;
  serviceDetails: {
    url: string | null;
    env: string;
    region: string;
    plan: string;
    envSpecificDetails?: {
      buildCommand: string;
      startCommand: string;
    };
  };
  state: "live" | "failed" | "build_failed" | "suspended" | "not_suspended" | "in_progress";
}

export interface RenderDeploy {
  id: string;
  status: "live" | "build_failed" | "deactivated" | "in_progress" | "update_in_progress" | "pre_deploy_in_progress" | "created";
}

// ─── Params ─────────────────────────────────────────────────────────────────

/** Native runtimes deplo.ai can deploy to Render (Docker intentionally excluded). */
export type RenderRuntime = "node" | "python" | "go";

export interface CreateWebServiceParams {
  name: string;
  repoUrl: string;
  branch: string;
  runtime: RenderRuntime;
  buildCommand: string;
  startCommand: string;
  envVars: Array<{ key: string; value: string }>;
  plan?: "free" | "starter" | "standard" | "pro";
  ownerId: string;
  /** Subdirectory within the repo to use as the service root (monorepo support). */
  rootDir?: string;
}

// ─── Adapter ────────────────────────────────────────────────────────────────

export class RenderAdapter {
  private readonly apiBase = "https://api.render.com/v1";

  /**
   * Instantiated with a user's own Render API key (resolved from their
   * encrypted ProviderConnection) — deployments run inside the user's Render
   * account, never a global deplo.ai account.
   */
  constructor(private readonly apiKey: string) {}

  /**
   * Create a new web service on Render.
   * Returns the created service along with the initial deploy ID.
   */
  async createWebService(params: CreateWebServiceParams): Promise<{
    service: RenderService;
    deployId: string;
  }> {
    const body = {
      type: "web_service",
      name: params.name,
      ownerId: params.ownerId,
      repo: params.repoUrl,
      branch: params.branch,
      autoDeploy: "yes",
      // rootDir is a TOP-LEVEL service field. Nesting it in serviceDetails is
      // silently ignored by the API (verified live: service came back with
      // rootDir "" and built at the repo root → exit 254 on monorepos).
      ...(params.rootDir ? { rootDir: params.rootDir } : {}),
      serviceDetails: {
        // Modern API field — `env` is deprecated (verified against current docs).
        runtime: params.runtime,
        region: "oregon",
        plan: params.plan ?? "starter",
        envSpecificDetails: {
          buildCommand: params.buildCommand,
          startCommand: params.startCommand,
        },
        envVars: params.envVars.map((v) => ({ key: v.key, value: v.value })),
      },
    };

    const raw = await this.request<{ service: RenderService; deployId: string }>(
      "POST",
      "/services",
      body,
    );

    logger.info("Render service created", {
      serviceId: raw.service.id,
      name: raw.service.name,
      deployId: raw.deployId,
    });

    return raw;
  }

  /** Poll service state until live or failed (max ~15 min with backoff). */
  async waitForDeploy(
    serviceId: string,
    deployId: string,
    opts: { timeoutMs?: number } = {},
  ): Promise<{ url: string }> {
    const timeoutMs = opts.timeoutMs ?? 15 * 60 * 1_000;
    const deadline = Date.now() + timeoutMs;
    let delay = 5_000;

    while (Date.now() < deadline) {
      const deploy = await this.getDeploy(serviceId, deployId);
      logger.info("Render deploy status", { serviceId, deployId, status: deploy.status });

      if (deploy.status === "live") {
        // URL is predictable based on service name (set at creation time)
        const service = await this.getService(serviceId);
        const url = service.serviceDetails.url ?? `https://${service.name}.onrender.com`;
        return { url };
      }

      if (deploy.status === "build_failed") {
        throw AppError.externalService("Render", `Deploy ${deployId} build failed`);
      }

      await sleep(delay);
      delay = Math.min(delay * 1.5, 30_000);
    }

    throw AppError.externalService("Render", `Deploy timed out after ${timeoutMs / 60_000} minutes`);
  }

  async getService(serviceId: string): Promise<RenderService> {
    return this.request<RenderService>("GET", `/services/${serviceId}`);
  }

  /**
   * Update an existing service's config (rootDir / build / start). Used by the
   * idempotent reuse path so a retried deployment also REPAIRS services that
   * were created with stale or wrong settings.
   */
  async updateService(
    serviceId: string,
    params: { rootDir?: string; buildCommand?: string; startCommand?: string },
  ): Promise<void> {
    const body: Record<string, unknown> = {};
    if (params.rootDir !== undefined) body["rootDir"] = params.rootDir;
    if (params.buildCommand !== undefined || params.startCommand !== undefined) {
      body["serviceDetails"] = {
        envSpecificDetails: {
          ...(params.buildCommand !== undefined ? { buildCommand: params.buildCommand } : {}),
          ...(params.startCommand !== undefined ? { startCommand: params.startCommand } : {}),
        },
      };
    }
    if (Object.keys(body).length === 0) return;
    await this.request("PATCH", `/services/${serviceId}`, body);
  }

  /** Find a service by exact name in the given workspace (null if absent). */
  async findServiceByName(name: string, ownerId: string): Promise<RenderService | null> {
    const results = await this.request<Array<{ service: RenderService }>>(
      "GET",
      `/services?name=${encodeURIComponent(name)}&ownerId=${encodeURIComponent(ownerId)}&limit=20`,
    );
    return results.find((r) => r.service.name === name)?.service ?? null;
  }

  /**
   * Replace the service's FULL environment variable set. Only call with the
   * complete intended list (deplo.ai composes runtime + wiring + user vars) —
   * this endpoint deletes anything not included.
   */
  async replaceEnvVars(serviceId: string, vars: Array<{ key: string; value: string }>): Promise<void> {
    await this.request("PUT", `/services/${serviceId}/env-vars`, vars.map((v) => ({ key: v.key, value: v.value })));
  }

  async getDeploy(serviceId: string, deployId: string): Promise<RenderDeploy> {
    return this.request<RenderDeploy>(
      "GET",
      `/services/${serviceId}/deploys/${deployId}`,
    );
  }

  async triggerDeploy(serviceId: string): Promise<RenderDeploy> {
    // clearCache is a string enum ("clear" | "do_not_clear") — a boolean gets
    // rejected with 400 "invalid JSON" (verified live).
    return this.request<RenderDeploy>("POST", `/services/${serviceId}/deploys`, {
      clearCache: "do_not_clear",
    });
  }

  /**
   * Upsert a SINGLE env var via the per-key endpoint.
   * Never use PUT /services/{id}/env-vars with a partial list — that endpoint
   * REPLACES the entire variable set and would wipe user-provided vars.
   */
  async upsertEnvVar(serviceId: string, key: string, value: string): Promise<void> {
    await this.request("PUT", `/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, { value });
  }

  async suspendService(serviceId: string): Promise<void> {
    await this.request("POST", `/services/${serviceId}/suspend`);
  }

  private async request<T = void>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);

    const res = await fetch(`${this.apiBase}${path}`, init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw AppError.externalService("Render", `${res.status}: ${text}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
