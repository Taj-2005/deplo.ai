import { getToken, getApiBaseUrl } from "@/lib/auth";
import type { Repository, Deployment, DeploymentDetail, DashboardStats } from "@/types/dashboard";

// ─── Request helpers ──────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl();
  const url = base ? `${base}/api/v1${path}` : `/api/v1${path}`;

  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    let message = text;
    try {
      const json = JSON.parse(text) as { error?: { message?: string } };
      message = json.error?.message ?? text;
    } catch {
      // not JSON — use raw text
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── API types (server response shapes) ───────────────────────────────────────
// These mirror what the server REST controllers return. The client types in
// @/types/dashboard are the canonical shapes used in UI components.

interface ApiRepository {
  id: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  updatedAt: string;
  language: string | null;
  description: string | null;
  url: string;
}

interface ApiDeployment {
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

interface ApiStats {
  totalDeployments: number;
  activeDeployments: number;
  failedDeployments: number;
  connectedRepos: number;
}

// ─── Public API functions ─────────────────────────────────────────────────────

export async function fetchRepositories(): Promise<Repository[]> {
  const data = await apiFetch<ApiRepository[]>("/repos");
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.fullName,
    isPrivate: r.isPrivate,
    defaultBranch: r.defaultBranch,
    updatedAt: r.updatedAt,
    language: r.language,
    url: r.url,
  }));
}

export async function syncRepositories(): Promise<{ synced: number }> {
  return apiFetch<{ synced: number }>("/repos/sync", { method: "POST" });
}

export async function fetchDeployments(): Promise<Deployment[]> {
  const data = await apiFetch<ApiDeployment[]>("/deployments");
  return data.map((d) => ({
    id: d.id,
    repositoryId: d.repositoryId,
    repositoryName: d.repositoryName,
    repositoryFullName: d.repositoryFullName,
    status: d.status as Deployment["status"],
    branch: d.branch,
    frontendUrl: d.frontendUrl,
    backendUrl: d.backendUrl,
    detectedStack: d.detectedStack,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    duration: d.duration,
  }));
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<ApiStats>("/stats");
}

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

export async function analyzeRepository(repositoryId: string): Promise<StackAnalysis> {
  return apiFetch<StackAnalysis>(`/repos/${repositoryId}/analyze`);
}

export async function initiateDeployment(
  repositoryId: string,
  envVars?: Array<{ key: string; value: string }>,
): Promise<{ deploymentId: string }> {
  const data = await apiFetch<{ deploymentId: string; status: string }>("/deployments", {
    method: "POST",
    body: JSON.stringify({ repositoryId, ...(envVars?.length ? { envVars } : {}) }),
  });
  return { deploymentId: data.deploymentId };
}

export async function fetchDeployment(deploymentId: string): Promise<DeploymentDetail> {
  const d = await apiFetch<ApiDeployment & { logs: string[]; error: string | null; envVariables: Array<{ key: string; isRequired: boolean }> }>(`/deployments/${deploymentId}`);
  return {
    id: d.id,
    repositoryId: d.repositoryId,
    repositoryName: d.repositoryName,
    repositoryFullName: d.repositoryFullName,
    status: d.status as Deployment["status"],
    branch: d.branch,
    frontendUrl: d.frontendUrl,
    backendUrl: d.backendUrl,
    detectedStack: d.detectedStack,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    duration: d.duration,
    logs: d.logs,
    error: d.error,
    envVariables: d.envVariables,
  };
}

export async function provideEnvVariables(
  deploymentId: string,
  envVars: Array<{ key: string; value: string }>,
): Promise<{ deploymentId: string; status: string }> {
  return apiFetch(`/deployments/${deploymentId}/env`, {
    method: "POST",
    body: JSON.stringify({ envVars }),
  });
}

export async function cancelDeployment(
  deploymentId: string,
): Promise<{ deploymentId: string; status: string }> {
  return apiFetch(`/deployments/${deploymentId}`, { method: "DELETE" });
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export interface IntegrationStatus {
  provider: "VERCEL" | "RENDER";
  connected: boolean;
  accountName: string | null;
  teamName: string | null;
  teamId: string | null;
  connectedAt: string | null;
}

export async function getIntegrations(): Promise<IntegrationStatus[]> {
  const data = await apiFetch<{ integrations: IntegrationStatus[] }>("/integrations");
  return data.integrations;
}

export async function disconnectVercel(): Promise<void> {
  await apiFetch("/integrations/vercel", { method: "DELETE" });
}

export async function getVercelInstallUrl(returnTo: "onboarding" | "integrations" = "integrations"): Promise<string> {
  const data = await apiFetch<{ url: string }>(`/integrations/vercel/install-url?returnTo=${returnTo}`);
  return data.url;
}

/**
 * Connect Render by validating + storing a Personal API Key.
 * The key is sent once over HTTPS, validated server-side against the Render
 * API, stored encrypted, and never returned again.
 */
export async function connectRender(apiKey: string): Promise<{
  connected: boolean;
  accountName: string | null;
  teamName: string | null;
}> {
  return apiFetch("/integrations/render", {
    method: "POST",
    body: JSON.stringify({ apiKey }),
  });
}

export async function disconnectRender(): Promise<void> {
  await apiFetch("/integrations/render", { method: "DELETE" });
}

// ─── Project monitoring & analytics ───────────────────────────────────────────

export interface UptimePoint {
  t: string;
  ok: boolean;
  latencyMs: number | null;
}

export interface TargetHealth {
  url: string | null;
  current: { ok: boolean; httpStatus: number | null; latencyMs: number | null; checkedAt: string } | null;
  uptime24h: number | null;
  series: UptimePoint[];
}

export interface ProjectMonitoring {
  project: { id: string; name: string; fullName: string };
  frontend: TargetHealth;
  backend: TargetHealth;
  server: {
    state: string;
    cpu: Array<{ timestamp: string; value: number }>;
    memory: Array<{ timestamp: string; value: number }>;
  } | null;
  lastDeployment: { id: string; at: string | null; branch: string } | null;
  latestAttempt: {
    id: string;
    status: string;
    error: string | null;
    branch: string;
    at: string;
    isNewerThanLive: boolean;
  } | null;
}

export interface ProjectAnalytics {
  days: number;
  totals: { views: number; visitors: number };
  daily: Array<{ day: string; views: number; visitors: number }>;
  topPaths: Array<{ path: string; views: number }>;
  topReferrers: Array<{ referrer: string; views: number }>;
  snippet: string;
}

export async function getProjectMonitoring(repoId: string): Promise<ProjectMonitoring> {
  return apiFetch<ProjectMonitoring>(`/projects/${repoId}/monitoring`);
}

export async function getProjectAnalytics(repoId: string, days = 7): Promise<ProjectAnalytics> {
  return apiFetch<ProjectAnalytics>(`/projects/${repoId}/analytics?days=${days}`);
}
