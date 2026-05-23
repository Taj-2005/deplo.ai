import type {
  Deployment,
  CreateDeploymentInput,
  UpdateDeploymentInput,
} from "./Deployment";

export interface IDeploymentRepository {
  findById(id: string): Promise<Deployment | null>;
  findByUserId(userId: string): Promise<Deployment[]>;
  findByRepositoryId(repositoryId: string): Promise<Deployment[]>;
  findByVercelDeployId(vercelDeployId: string): Promise<Deployment | null>;
  findByRenderServiceId(renderServiceId: string): Promise<Deployment | null>;
  create(input: CreateDeploymentInput): Promise<Deployment>;
  update(id: string, input: UpdateDeploymentInput): Promise<Deployment>;
  appendLog(id: string, line: string): Promise<void>;
}
