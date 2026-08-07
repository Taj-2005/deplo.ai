import type { Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";

interface PublicStats {
  deployments: number;
  avgMinutesToProduction: number | null;
}

export class StatsController {
  constructor(private readonly prisma: PrismaClient) {}

  // Platform-wide numbers for the landing page. Cached in-process for
  // 5 minutes — the route is public and must stay cheap under crawl traffic.
  private publicCache: { data: PublicStats; expiresAt: number } | null = null;

  /** GET /api/v1/public/stats — live platform totals, no auth. */
  publicStats = async (_req: Request, res: Response): Promise<void> => {
    if (!this.publicCache || this.publicCache.expiresAt < Date.now()) {
      const [deployments, avgRows] = await Promise.all([
        this.prisma.deployment.count(),
        // duration isn't a column — it's completedAt - createdAt.
        this.prisma.$queryRaw<Array<{ avg_seconds: number | null }>>`
          SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt")))::float AS avg_seconds
          FROM "Deployment"
          WHERE "status" = 'COMPLETED' AND "completedAt" IS NOT NULL`,
      ]);
      const avgSeconds = avgRows[0]?.avg_seconds ?? null;
      this.publicCache = {
        data: {
          deployments,
          avgMinutesToProduction: avgSeconds ? Math.max(1, Math.ceil(avgSeconds / 60)) : null,
        },
        expiresAt: Date.now() + 5 * 60_000,
      };
    }
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(this.publicCache.data);
  };

  /** GET /api/v1/stats — dashboard metrics for the authed user */
  get = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;

    const [totalDeployments, activeDeployments, failedDeployments, connectedRepos] =
      await Promise.all([
        this.prisma.deployment.count({ where: { userId } }),
        this.prisma.deployment.count({
          where: {
            userId,
            status: {
              in: [
                "PENDING",
                "ANALYZING",
                "WAITING_FOR_ENV",
                "DEPLOYING_BACKEND",
                "BACKEND_READY",
                "DEPLOYING_FRONTEND",
              ],
            },
          },
        }),
        this.prisma.deployment.count({ where: { userId, status: "FAILED" } }),
        this.prisma.repository.count({ where: { userId } }),
      ]);

    res.json({ totalDeployments, activeDeployments, failedDeployments, connectedRepos });
  };
}
