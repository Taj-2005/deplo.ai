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

export type StackType = "NEXTJS" | "REACT_VITE" | "EXPRESS" | "FASTIFY" | "UNKNOWN";

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
}

export interface EnvVariable {
  key: string;
  value: string;
  isRequired: boolean;
  source: "process_env" | "import_meta" | "dotenv" | "inferred";
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
