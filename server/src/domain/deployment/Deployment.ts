export type DeploymentStatus =
  | "PENDING"
  | "ANALYZING"
  | "WAITING_FOR_ENV"
  | "DEPLOYING_BACKEND"
  | "BACKEND_READY"
  | "DEPLOYING_FRONTEND"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export const ACTIVE_STATUSES: DeploymentStatus[] = [
  "PENDING",
  "ANALYZING",
  "WAITING_FOR_ENV",
  "DEPLOYING_BACKEND",
  "BACKEND_READY",
  "DEPLOYING_FRONTEND",
];

export const TERMINAL_STATUSES: DeploymentStatus[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

export function isActiveStatus(status: DeploymentStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export type StackType =
  | "NEXTJS"
  | "REACT_VITE"
  | "VUE"
  | "NUXT"
  | "ASTRO"
  | "SVELTE"
  | "SVELTEKIT"
  | "REMIX"
  | "GATSBY"
  | "ANGULAR"
  | "STATIC"
  | "EXPRESS"
  | "FASTIFY"
  | "FASTAPI"
  | "FLASK"
  | "DJANGO"
  | "UNKNOWN";

export interface DetectedStack {
  frontend: StackType | null;
  backend: StackType | null;
  /** Relative path within the repo root, e.g. "" | "frontend" | "client" | "shopsmart-client" */
  frontendPath: string;
  /** Relative path within the repo root, e.g. "" | "backend" | "server" | "api" */
  backendPath: string;
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
  buildCommand: string | null;
  outputDir: string | null;
  nodeVersion: string | null;
  /**
   * Frontend env keys that reference the backend URL (e.g. NEXT_PUBLIC_API_URL,
   * VITE_API_URL) — auto-injected with the live backend URL at deploy time.
   */
  frontendApiKeys?: string[];
  /** Backend runtime for the Render service (node backends re-derive commands live). */
  backendRuntime?: "node" | "python" | "go";
  /** Install/build/start resolved from the repo by the analysis engine (non-Node backends). */
  backendInstallCommand?: string | null;
  backendBuildCommand?: string | null;
  backendStartCommand?: string | null;
  /** Language version (e.g. "3.12.1") when detected — drives PYTHON_VERSION etc. */
  backendRuntimeVersion?: string | null;
}

/** Which side of the app a variable belongs to — drives per-provider injection. */
export type EnvScope = "frontend" | "backend" | "shared";

export interface EnvVariable {
  key: string;
  value: string;
  isRequired: boolean;
  source: "process_env" | "import_meta" | "dotenv" | "inferred";
  /** Optional (older records lack it) — absent means "shared". */
  scope?: EnvScope;
}

export interface Deployment {
  id: string;
  userId: string;
  repositoryId: string;
  status: DeploymentStatus;
  branch: string;
  detectedStack: DetectedStack | null;
  envVariables: EnvVariable[];
  frontendUrl: string | null;
  backendUrl: string | null;
  logs: string[];
  vercelProjectId: string | null;
  vercelDeployId: string | null;
  renderServiceId: string | null;
  renderDeployId: string | null;
  error: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateDeploymentInput = {
  userId: string;
  repositoryId: string;
  branch: string;
};

export type UpdateDeploymentInput = Partial<
  Pick<
    Deployment,
    | "status"
    | "branch"
    | "detectedStack"
    | "envVariables"
    | "frontendUrl"
    | "backendUrl"
    | "logs"
    | "vercelProjectId"
    | "vercelDeployId"
    | "renderServiceId"
    | "renderDeployId"
    | "error"
    | "completedAt"
  >
>;
