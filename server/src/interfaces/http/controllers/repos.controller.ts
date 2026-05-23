import type { Request, Response } from "express";
import type { RepositoryService } from "../../../application/services/RepositoryService";
import type { IUserRepository } from "../../../domain/user/UserRepository.interface";
import { logger } from "../../../shared/logger/logger";

export class ReposController {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly userRepository: IUserRepository,
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
