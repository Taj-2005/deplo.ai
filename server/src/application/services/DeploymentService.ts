import type { IDeploymentRepository } from "../../domain/deployment/DeploymentRepository.interface";
import type { IUserRepository } from "../../domain/user/UserRepository.interface";
import type { IRepositoryRepository } from "../../domain/repository/Repository";
import type { Deployment, EnvVariable } from "../../domain/deployment/Deployment";
import type { Queue } from "bullmq";
import type { DeploymentJobData, DeploymentJobName } from "../../infrastructure/queue/DeploymentQueue";
import { enqueueAnalysis, enqueueDeploy } from "../../infrastructure/queue/DeploymentQueue";
import { CacheService, CACHE_TTL } from "../../infrastructure/redis/CacheService";
import { AppError } from "../../shared/errors/AppError";
import { logger } from "../../shared/logger/logger";

export class DeploymentService {
  constructor(
    private readonly deploymentRepository: IDeploymentRepository,
    private readonly userRepository: IUserRepository,
    private readonly repositoryRepository: IRepositoryRepository,
    private readonly queue: Queue<DeploymentJobData, void, DeploymentJobName>,
    private readonly cache: CacheService,
  ) {}

  async getDeployment(id: string, userId: string): Promise<Deployment> {
    const cacheKey = this.cache.buildKey("deployment", id);
    const cached = await this.cache.get<Deployment>(cacheKey);
    if (cached && cached.userId === userId) return cached;

    const deployment = await this.deploymentRepository.findById(id);
    if (!deployment) throw AppError.notFound("Deployment");
    if (deployment.userId !== userId) throw AppError.forbidden();

    // Only cache non-terminal deployments briefly
    if (deployment.status !== "COMPLETED" && deployment.status !== "FAILED") {
      await this.cache.set(cacheKey, deployment, CACHE_TTL.DEPLOYMENT);
    }

    return deployment;
  }

  async listUserDeployments(userId: string): Promise<Deployment[]> {
    return this.deploymentRepository.findByUserId(userId);
  }

  /**
   * Kick off a new deployment for a repository.
   * Creates the record immediately (status=PENDING) and enqueues the analysis job.
   */
  async startDeployment(params: {
    userId: string;
    repositoryId: string;
  }): Promise<Deployment> {
    const user = await this.userRepository.findById(params.userId);
    if (!user) throw AppError.notFound("User");

    const repository = await this.repositoryRepository.findById(params.repositoryId);
    if (!repository) throw AppError.notFound("Repository");
    if (repository.userId !== params.userId) throw AppError.forbidden();

    const deployment = await this.deploymentRepository.create({
      userId: params.userId,
      repositoryId: params.repositoryId,
      branch: repository.defaultBranch,
    });

    await this.deploymentRepository.appendLog(deployment.id, "Deployment queued.");

    await enqueueAnalysis(this.queue, deployment.id);
    logger.info("Deployment queued", { deploymentId: deployment.id, repositoryId: params.repositoryId });

    return deployment;
  }

  /**
   * User supplies environment variable values.
   * Transitions WAITING_FOR_ENV → DEPLOYING_BACKEND and enqueues the deploy job.
   */
  async provideEnvVariables(
    deploymentId: string,
    userId: string,
    envVars: EnvVariable[],
  ): Promise<Deployment> {
    const deployment = await this.getDeployment(deploymentId, userId);

    if (deployment.status !== "WAITING_FOR_ENV") {
      throw AppError.conflict("Deployment is not waiting for environment variables");
    }

    // Merge provided values into the existing env var list
    const existingMap = new Map(deployment.envVariables.map((v) => [v.key, v]));
    for (const provided of envVars) {
      const existing = existingMap.get(provided.key);
      existingMap.set(provided.key, {
        ...(existing ?? { isRequired: false, source: "dotenv" as const }),
        key: provided.key,
        value: provided.value,
      });
    }

    const updated = await this.deploymentRepository.update(deploymentId, {
      envVariables: Array.from(existingMap.values()),
      status: "DEPLOYING_BACKEND",
    });

    await enqueueDeploy(this.queue, deploymentId);
    logger.info("Env vars provided, deploy queued", { deploymentId });

    return updated;
  }

  async cancelDeployment(deploymentId: string, userId: string): Promise<Deployment> {
    const deployment = await this.getDeployment(deploymentId, userId);

    if (deployment.status === "COMPLETED" || deployment.status === "FAILED" || deployment.status === "CANCELLED") {
      throw AppError.conflict("Cannot cancel a finished deployment");
    }

    const updated = await this.deploymentRepository.update(deploymentId, {
      status: "CANCELLED",
      completedAt: new Date(),
    });

    await this.deploymentRepository.appendLog(deploymentId, "Deployment cancelled by user.");
    logger.info("Deployment cancelled", { deploymentId });

    return updated;
  }
}
