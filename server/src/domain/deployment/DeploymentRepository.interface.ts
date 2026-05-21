import type {
  Deployment,
  CreateDeploymentInput,
  UpdateDeploymentInput,
} from "./Deployment";

export interface IDeploymentRepository {
  findById(id: string): Promise<Deployment | null>;
  findByUserId(userId: string): Promise<Deployment[]>;
  findByRepositoryId(repositoryId: string): Promise<Deployment[]>;
  create(input: CreateDeploymentInput): Promise<Deployment>;
  update(id: string, input: UpdateDeploymentInput): Promise<Deployment>;
  appendLog(id: string, line: string): Promise<void>;
}
