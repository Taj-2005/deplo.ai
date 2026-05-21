import Redis from "ioredis";
import { env } from "../../config/env";
import { logger } from "../../shared/logger/logger";

let _client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!_client) {
    _client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    _client.on("connect", () => logger.info("Redis: connected"));
    _client.on("error", (err: Error) =>
      logger.error("Redis error", { error: err.message }),
    );
    _client.on("reconnecting", () => logger.warn("Redis: reconnecting..."));
  }
  return _client;
}

export async function closeRedisClient(): Promise<void> {
  if (_client) {
    await _client.quit();
    _client = null;
  }
}
