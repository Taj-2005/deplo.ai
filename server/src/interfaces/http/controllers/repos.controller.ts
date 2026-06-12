import type { Request, Response } from "express";
import type { RepositoryService } from "../../../application/services/RepositoryService";
import type { IUserRepository } from "../../../domain/user/UserRepository.interface";
import type { IRepositoryRepository } from "../../../domain/repository/Repository";
import type { AnalysisService } from "../../../application/services/AnalysisService";
import { logger } from "../../../shared/logger/logger";

export class ReposController {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly userRepository: IUserRepository,
    private readonly repositoryRepository: IRepositoryRepository,
    private readonly analysisService: AnalysisService,
  ) {}

  /** GET /api/v1/repos — list user's synced repositories */
  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const repos = await this.repositoryService.listUserRepositories(userId);

    res.json(
      repos.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.fullName,
        isPrivate: r.isPrivate,
        defaultBranch: r.defaultBranch,
        updatedAt: r.updatedAt,
        language: r.language,
        description: r.description,
        url: r.htmlUrl,
      })),
    );
  };

  /**
   * GET /api/v1/repos/:id/analyze
   * Runs stack analysis on the repo and returns detected vars + stack info.
   * No deployment is created — this is purely for the Configure step UI.
   */
  analyzeStack = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const repoId = req.params["id"] as string;

    const user = await this.userRepository.findById(userId);
    if (!user) { res.status(404).json({ error: { message: "User not found" } }); return; }

    const repo = await this.repositoryRepository.findById(repoId);
    if (!repo) { res.status(404).json({ error: { message: "Repository not found" } }); return; }
    if (repo.userId !== userId) { res.status(403).json({ error: { message: "Forbidden" } }); return; }

    const { stack, envVars } = await this.analysisService.analyzeRepository(user.githubAccessToken, repo.fullName);

    logger.info("Stack analysis complete", { userId, repoId, frontend: stack.frontend, backend: stack.backend });

    res.json({
      stack: {
        frontend: stack.frontend,
        backend: stack.backend,
        frontendPath: stack.frontendPath,
        backendPath: stack.backendPath,
        buildCommand: stack.buildCommand,
        packageManager: stack.packageManager,
      },
      envVars: envVars.map((v) => ({
        key: v.key,
        value: v.value,
        isRequired: v.isRequired,
        source: v.source,
      })),
      defaultBranch: repo.defaultBranch,
    });
  };

  /** POST /api/v1/repos/sync — force a fresh sync from GitHub */
  sync = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const user = await this.userRepository.findById(userId);
    if (!user) {
      res.status(404).json({ error: { message: "User not found" } });
      return;
    }

    await this.repositoryService.syncUserRepositories(userId, user.githubAccessToken);
    const repos = await this.repositoryService.listUserRepositories(userId);

    logger.info("Manual repo sync triggered", { userId, count: repos.length });

    res.json({ synced: repos.length });
  };
}
