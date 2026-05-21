import type { IDeploymentRepository } from "../../domain/deployment/DeploymentRepository.interface";
import type { IUserRepository } from "../../domain/user/UserRepository.interface";
import type { IRepositoryRepository } from "../../domain/repository/Repository";
import type { Deployment, EnvVariable } from "../../domain/deployment/Deployment";
import { AnalysisService } from "./AnalysisService";
import { VercelAdapter } from "../../infrastructure/vercel/VercelAdapter";
import { RenderAdapter } from "../../infrastructure/render/RenderAdapter";
import { CacheService, CACHE_TTL } from "../../infrastructure/redis/CacheService";
import { AppError } from "../../shared/errors/AppError";
import { logger } from "../../shared/logger/logger";

export class DeploymentService {
  constructor(
    private readonly deploymentRepository: IDeploymentRepository,
    private readonly userRepository: IUserRepository,
    private readonly repositoryRepository: IRepositoryRepository,
    private readonly analysisService: AnalysisService,
    private readonly vercel: VercelAdapter,
    private readonly render: RenderAdapter,
    private readonly cache: CacheService,
  ) {}

  async getDeployment(id: string, userId: string): Promise<Deployment> {
    const cacheKey = this.cache.buildKey("deployment", id);
    const cached = await this.cache.get<Deployment>(cacheKey);
    if (cached) return cached;

    const deployment = await this.deploymentRepository.findById(id);
    if (!deployment) throw AppError.notFound("Deployment");
    if (deployment.userId !== userId) throw AppError.forbidden();

    if (deployment.status !== "COMPLETED" && deployment.status !== "FAILED") {
      await this.cache.set(cacheKey, deployment, CACHE_TTL.DEPLOYMENT);
    }

    return deployment;
  }

  async listUserDeployments(userId: string): Promise<Deployment[]> {
    return this.deploymentRepository.findByUserId(userId);
  }

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
    });

    this.runDeploymentPipeline(deployment.id, user.githubAccessToken, repository.fullName).catch(
      (err) => logger.error("Deployment pipeline error", { deploymentId: deployment.id, error: (err as Error).message }),
    );

    return deployment;
  }

  async provideEnvVariables(
    deploymentId: string,
    userId: string,
    envVars: EnvVariable[],
  ): Promise<Deployment> {
    const deployment = await this.getDeployment(deploymentId, userId);

    if (deployment.status !== "WAITING_FOR_ENV") {
      throw AppError.conflict("Deployment is not waiting for environment variables");
    }

    return this.deploymentRepository.update(deploymentId, {
      envVariables: envVars,
      status: "DEPLOYING_BACKEND",
    });
  }

  private async runDeploymentPipeline(
    deploymentId: string,
    encryptedToken: string,
    fullName: string,
  ): Promise<void> {
    try {
      await this.deploymentRepository.update(deploymentId, { status: "ANALYZING" });
      await this.deploymentRepository.appendLog(deploymentId, "Analyzing repository...");

      const repository = await this.repositoryRepository.findByGithubRepoId(fullName);
      if (!repository) throw AppError.notFound("Repository");

      const { stack, envVars } = await this.analysisService.analyzeRepository(
        encryptedToken,
        fullName,
      );

      await this.deploymentRepository.update(deploymentId, {
        detectedStack: stack,
        envVariables: envVars,
        status: "WAITING_FOR_ENV",
      });

      await this.deploymentRepository.appendLog(
        deploymentId,
        `Stack detected: frontend=${stack.frontend ?? "none"}, backend=${stack.backend ?? "none"}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await this.deploymentRepository.update(deploymentId, {
        status: "FAILED",
        error: message,
      });
      await this.deploymentRepository.appendLog(deploymentId, `FAILED: ${message}`);
    }
  }
}
