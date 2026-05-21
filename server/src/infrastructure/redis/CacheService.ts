import type { Redis } from "ioredis";
import { logger } from "../../shared/logger/logger";

export class CacheService {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.warn("Cache GET failed", { key, error: (err as Error).message });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds !== undefined) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (err) {
      logger.warn("Cache SET failed", { key, error: (err as Error).message });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      logger.warn("Cache DEL failed", { key, error: (err as Error).message });
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) await this.redis.del(...keys);
    } catch (err) {
      logger.warn("Cache DEL pattern failed", {
        pattern,
        error: (err as Error).message,
      });
    }
  }

  buildKey(...parts: string[]): string {
    return parts.join(":");
  }
}

export const CACHE_TTL = {
  GITHUB_REPOS: 300,
  DEPLOYMENT: 30,
  USER_PROFILE: 3600,
} as const;
