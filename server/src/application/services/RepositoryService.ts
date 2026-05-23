import type { IRepositoryRepository, Repository } from "../../domain/repository/Repository";
import type { GitHubAdapter } from "../../infrastructure/github/GitHubAdapter";
import type { CacheService } from "../../infrastructure/redis/CacheService";
import { decrypt } from "../../shared/utils/crypto";
import { logger } from "../../shared/logger/logger";

export class RepositoryService {
  constructor(
    private readonly repositoryRepository: IRepositoryRepository,
    private readonly github: GitHubAdapter,
    private readonly cache: CacheService,
  ) {}

  /**
   * Fetch user's GitHub repos and upsert them into the database.
   * Called after OAuth login to keep the repo list fresh.
   */
  async syncUserRepositories(userId: string, encryptedToken: string): Promise<void> {
    const token = decrypt(encryptedToken);
    const ghRepos = await this.github.listRepositories(token);

    logger.info("Syncing repositories from GitHub", {
      userId,
      count: ghRepos.length,
    });

    const upsertOps = ghRepos.map((repo) =>
      this.repositoryRepository.upsert({
        userId,
        githubRepoId: String(repo.id),
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
        isPrivate: repo.private,
        language: repo.language ?? null,
        description: repo.description ?? null,
      }),
    );

    await Promise.allSettled(upsertOps);

    // Invalidate cached repo list
    const cacheKey = this.cache.buildKey("repos", userId);
    await this.cache.del(cacheKey);

    logger.info("Repository sync complete", { userId, synced: ghRepos.length });
  }

  async listUserRepositories(userId: string): Promise<Repository[]> {
    const cacheKey = this.cache.buildKey("repos", userId);
    const cached = await this.cache.get<Repository[]>(cacheKey);
    if (cached) return cached;

    const repos = await this.repositoryRepository.findByUserId(userId);
    await this.cache.set(cacheKey, repos, 300);
    return repos;
  }
}
