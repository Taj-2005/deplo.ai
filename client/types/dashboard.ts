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

export function isActiveStatus(status: DeploymentStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export interface DetectedStack {
  frontend: string | null;
  backend: string | null;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  updatedAt: string;
  language: string | null;
  url: string;
}

export interface Deployment {
  id: string;
  repositoryId: string;
  repositoryName: string;
  repositoryFullName: string;
  status: DeploymentStatus;
  branch: string;
  frontendUrl: string | null;
  backendUrl: string | null;
  detectedStack: DetectedStack | null;
  createdAt: string;
  updatedAt: string;
  duration: number | null;
}

export interface DeploymentDetail extends Deployment {
  logs: string[];
  error: string | null;
  envVariables: Array<{ key: string; isRequired: boolean }>;
}

export interface DashboardStats {
  totalDeployments: number;
  activeDeployments: number;
  failedDeployments: number;
  connectedRepos: number;
}

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}
