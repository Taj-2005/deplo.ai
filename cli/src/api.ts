import { resolveApiUrl, resolveToken } from "./config";

/**
 * Typed client for the deplo REST API (www.deplo.in/api/v1) — the same
 * contracts the dashboard consumes. Base URL overridable via DEPLO_API_URL.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export interface Me {
  userId: string;
  email: string;
  name: string;
  githubLogin: string;
  avatarUrl: string | null;
}

export interface Integration {
  provider: "VERCEL" | "RENDER";
  connected: boolean;
  accountName: string | null;
  teamName: string | null;
}

export interface Repo {
  id: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  url: string;
}

/** Result of GET /repos/:id/analyze — drives which providers a deploy needs. */
export interface StackAnalysis {
  stack: {
    frontend: string | null;
    backend: string | null;
    frontendPath: string;
    backendPath: string;
    buildCommand: string | null;
    packageManager: string;
  };
  envVars: Array<{ key: string; value: string; isRequired: boolean; source: string }>;
  defaultBranch: string;
}

export interface Deployment {
  id: string;
  repositoryId: string;
  repositoryName: string;
  repositoryFullName: string;
  status: string;
  branch: string;
  frontendUrl: string | null;
  backendUrl: string | null;
  detectedStack: { frontend: string | null; backend: string | null } | null;
  createdAt: string;
  updatedAt: string;
  duration: number | null;
}

export interface DeploymentDetail extends Deployment {
  logs: string[];
  error: string | null;
  envVariables: Array<{ key: string; isRequired: boolean }>;
}

async function request<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const token = init?.token ?? resolveToken();
  const res = await fetch(`${resolveApiUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  me: (token?: string) => request<Me>("/auth/me", token ? { token } : undefined),

  integrations: () => request<{ integrations: Integration[] }>("/integrations").then((r) => r.integrations),

  vercelInstallUrl: () =>
    request<{ url: string }>("/integrations/vercel/install-url?returnTo=integrations").then((r) => r.url),

  connectRender: (apiKey: string) =>
    request<{ connected: boolean; accountName: string | null; teamName: string | null }>("/integrations/render", {
      method: "POST",
      body: JSON.stringify({ apiKey }),
    }),

  repos: () => request<Repo[]>("/repos"),

  syncRepos: () => request<{ synced: number }>("/repos/sync", { method: "POST" }),

  analyze: (repositoryId: string) => request<StackAnalysis>(`/repos/${repositoryId}/analyze`),

  deployments: () => request<Deployment[]>("/deployments"),

  deployment: (id: string) => request<DeploymentDetail>(`/deployments/${id}`),

  startDeployment: (repositoryId: string, envVars?: Array<{ key: string; value: string }>) =>
    request<{ deploymentId: string; status: string }>("/deployments", {
      method: "POST",
      body: JSON.stringify({ repositoryId, ...(envVars?.length ? { envVars } : {}) }),
    }),

  provideEnv: (deploymentId: string, envVars: Array<{ key: string; value: string }>) =>
    request<{ deploymentId: string; status: string }>(`/deployments/${deploymentId}/env`, {
      method: "POST",
      body: JSON.stringify({ envVars }),
    }),
};
