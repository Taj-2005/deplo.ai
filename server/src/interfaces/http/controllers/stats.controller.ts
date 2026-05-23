import type { Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";

export class StatsController {
  constructor(private readonly prisma: PrismaClient) {}

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
