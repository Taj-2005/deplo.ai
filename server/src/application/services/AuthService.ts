import jwt from "jsonwebtoken";
import type { GitHubAdapter } from "../../infrastructure/github/GitHubAdapter";
import type { IUserRepository } from "../../domain/user/UserRepository.interface";
import type { IRepositoryRepository } from "../../domain/repository/Repository";
import type { User } from "../../domain/user/User";
import type { CacheService } from "../../infrastructure/redis/CacheService";
import { encrypt } from "../../shared/utils/crypto";
import { decrypt } from "../../shared/utils/crypto";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";
import { logger } from "../../shared/logger/logger";

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly repositoryRepository: IRepositoryRepository,
    private readonly github: GitHubAdapter,
    private readonly cache: CacheService,
  ) {}

  async loginWithGithub(code: string): Promise<{ token: string; user: User }> {
    const accessToken = await this.github.exchangeCodeForToken(code);
    const profile = await this.github.getUserProfile(accessToken);

    const email = profile.email ?? `${profile.login}@github.local`;
    const encryptedToken = encrypt(accessToken);

    let user = await this.userRepository.findByGithubId(String(profile.id));

    if (!user) {
      logger.info("Creating new user from GitHub OAuth", { githubLogin: profile.login });
      user = await this.userRepository.create({
        githubId: String(profile.id),
        githubLogin: profile.login,
        githubAccessToken: encryptedToken,
        email,
        name: profile.name ?? profile.login,
        avatarUrl: profile.avatar_url,
      });
    } else {
      user = await this.userRepository.update(user.id, {
        githubAccessToken: encryptedToken,
        avatarUrl: profile.avatar_url,
        name: profile.name ?? user.name,
      });
    }

    // Sync repos in background — never block the login response
    this.syncRepositories(user.id, encryptedToken).catch((err: unknown) => {
      logger.warn("Background repo sync failed", {
        userId: user!.id,
        error: (err as Error).message,
      });
    });

    const token = this.signToken(user);
    return { token, user };
  }

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw AppError.unauthorized("Invalid or expired token");
    }
  }

  private async syncRepositories(userId: string, encryptedToken: string): Promise<void> {
    const plainToken = decrypt(encryptedToken);
    const ghRepos = await this.github.listRepositories(plainToken);

    const ops = ghRepos.map((repo) =>
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

    await Promise.allSettled(ops);

    // Bust cache so next API call gets fresh list
    const cacheKey = this.cache.buildKey("repos", userId);
    await this.cache.del(cacheKey);

    logger.info("Repository sync complete", { userId, count: ghRepos.length });
  }

  private signToken(user: User): string {
    return jwt.sign(
      { sub: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
    );
  }
}
