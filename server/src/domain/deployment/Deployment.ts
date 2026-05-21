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

export type StackType = "NEXTJS" | "REACT_VITE" | "EXPRESS" | "FASTIFY" | "UNKNOWN";

export interface DetectedStack {
  frontend: StackType | null;
  backend: StackType | null;
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
  detectedStack: DetectedStack | null;
  envVariables: EnvVariable[];
  frontendUrl: string | null;
  backendUrl: string | null;
  logs: string[];
  vercelProjectId: string | null;
  renderServiceId: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateDeploymentInput = {
  userId: string;
  repositoryId: string;
};

export type UpdateDeploymentInput = Partial<
  Pick<
    Deployment,
    | "status"
    | "detectedStack"
    | "envVariables"
    | "frontendUrl"
    | "backendUrl"
    | "logs"
    | "vercelProjectId"
    | "renderServiceId"
    | "error"
  >
>;
