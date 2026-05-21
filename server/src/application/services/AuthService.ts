import jwt from "jsonwebtoken";
import { GitHubAdapter } from "../../infrastructure/github/GitHubAdapter";
import type { IUserRepository } from "../../domain/user/UserRepository.interface";
import type { User } from "../../domain/user/User";
import { encrypt } from "../../shared/utils/crypto";
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
    private readonly github: GitHubAdapter,
  ) {}

  async loginWithGithub(code: string): Promise<{ token: string; user: User }> {
    const accessToken = await this.github.exchangeCodeForToken(code);
    const profile = await this.github.getUserProfile(accessToken);

    const email = profile.email ?? `${profile.login}@github.local`;

    let user = await this.userRepository.findByGithubId(String(profile.id));

    if (!user) {
      logger.info("Creating new user from GitHub OAuth", {
        githubLogin: profile.login,
      });
      user = await this.userRepository.create({
        githubId: String(profile.id),
        githubLogin: profile.login,
        githubAccessToken: encrypt(accessToken),
        email,
        name: profile.name ?? profile.login,
        avatarUrl: profile.avatar_url,
      });
    } else {
      user = await this.userRepository.update(user.id, {
        githubAccessToken: encrypt(accessToken),
        avatarUrl: profile.avatar_url,
        name: profile.name ?? user.name,
      });
    }

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

  private signToken(user: User): string {
    return jwt.sign(
      { sub: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
    );
  }
}
