import type { Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { env } from "../../../config/env";

export class HealthController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  check = async (_req: Request, res: Response): Promise<void> => {
    const [dbOk, redisOk] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`
        .then(() => true)
        .catch(() => false),
      this.redis
        .ping()
        .then((r) => r === "PONG")
        .catch(() => false),
    ]);

    const status = dbOk && redisOk ? "healthy" : "degraded";
    const code = status === "healthy" ? 200 : 503;

    res.status(code).json({
      status,
      version: env.API_VERSION,
      environment: env.NODE_ENV,
      checks: {
        database: dbOk ? "ok" : "error",
        redis: redisOk ? "ok" : "error",
      },
      timestamp: new Date().toISOString(),
    });
  };
}
