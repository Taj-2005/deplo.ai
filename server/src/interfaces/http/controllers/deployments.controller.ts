import type { Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import type { DeploymentService } from "../../../application/services/DeploymentService";
import type { IDeploymentRepository } from "../../../domain/deployment/DeploymentRepository.interface";
import type { Deployment, DetectedStack } from "../../../domain/deployment/Deployment";
import { z } from "zod";

// ─── Formatters ──────────────────────────────────────────────────────────────

const STACK_LABELS: Record<string, string> = {
  NEXTJS: "Next.js",
  REACT_VITE: "React (Vite)",
  EXPRESS: "Express.js",
  FASTIFY: "Fastify",
  UNKNOWN: "Unknown",
};

function formatStack(stack: DetectedStack | null): { frontend: string | null; backend: string | null } | null {
  if (!stack) return null;
  return {
    frontend: stack.frontend ? (STACK_LABELS[stack.frontend] ?? stack.frontend) : null,
    backend: stack.backend ? (STACK_LABELS[stack.backend] ?? stack.backend) : null,
  };
}

function calcDuration(dep: Deployment): number | null {
  if (!dep.completedAt) return null;
  return Math.round((dep.completedAt.getTime() - dep.createdAt.getTime()) / 1000);
}

// ─── Controller ──────────────────────────────────────────────────────────────

const StartDeploymentSchema = z.object({
  repositoryId: z.string().min(1),
});

const ProvideEnvSchema = z.object({
  envVars: z.array(
    z.object({ key: z.string().min(1), value: z.string() }),
  ),
});

export class DeploymentsController {
  constructor(
    private readonly deploymentService: DeploymentService,
    private readonly deploymentRepository: IDeploymentRepository,
    private readonly prisma: PrismaClient,
  ) {}

  /** GET /api/v1/deployments — list all deployments for the authed user */
  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const deployments = await this.deploymentService.listUserDeployments(userId);

    // Batch-load repository names in one query
    const repoIds = [...new Set(deployments.map((d) => d.repositoryId))];
    const repos = await this.prisma.repository.findMany({
      where: { id: { in: repoIds } },
      select: { id: true, name: true, fullName: true },
    });
    const repoMap = new Map(repos.map((r) => [r.id, r]));

    res.json(
      deployments.map((dep) => {
        const repo = repoMap.get(dep.repositoryId);
        return {
          id: dep.id,
          repositoryName: repo?.name ?? dep.repositoryId,
          repositoryFullName: repo?.fullName ?? dep.repositoryId,
          status: dep.status,
          branch: dep.branch,
          frontendUrl: dep.frontendUrl,
          backendUrl: dep.backendUrl,
          detectedStack: formatStack(dep.detectedStack),
          createdAt: dep.createdAt,
          updatedAt: dep.updatedAt,
          duration: calcDuration(dep),
        };
      }),
    );
  };

  /** GET /api/v1/deployments/:id — single deployment with logs */
  get = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const id = req.params["id"] as string;

    const dep = await this.deploymentService.getDeployment(id, userId);
    const repo = await this.prisma.repository.findUnique({
      where: { id: dep.repositoryId },
      select: { name: true, fullName: true },
    });

    res.json({
      id: dep.id,
      repositoryName: repo?.name ?? dep.repositoryId,
      repositoryFullName: repo?.fullName ?? dep.repositoryId,
      status: dep.status,
      branch: dep.branch,
      frontendUrl: dep.frontendUrl,
      backendUrl: dep.backendUrl,
      detectedStack: formatStack(dep.detectedStack),
      envVariables: dep.envVariables.map((v) => ({ key: v.key, isRequired: v.isRequired })),
      logs: dep.logs,
      error: dep.error,
      createdAt: dep.createdAt,
      updatedAt: dep.updatedAt,
      duration: calcDuration(dep),
    });
  };

  /** POST /api/v1/deployments — start a new deployment */
  start = async (req: Request, res: Response): Promise<void> => {
    const parsed = StartDeploymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsed.error.flatten() } });
      return;
    }

    const userId = req.userId!;
    const deployment = await this.deploymentService.startDeployment({
      userId,
      repositoryId: parsed.data.repositoryId,
    });

    res.status(201).json({ deploymentId: deployment.id, status: deployment.status });
  };

  /** POST /api/v1/deployments/:id/env — provide environment variables */
  provideEnv = async (req: Request, res: Response): Promise<void> => {
    const parsed = ProvideEnvSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsed.error.flatten() } });
      return;
    }

    const userId = req.userId!;
    const id = req.params["id"] as string;

    const deployment = await this.deploymentService.provideEnvVariables(
      id,
      userId,
      parsed.data.envVars.map((v) => ({
        key: v.key,
        value: v.value,
        isRequired: false,
        source: "dotenv" as const,
      })),
    );

    res.json({ deploymentId: deployment.id, status: deployment.status });
  };

  /** DELETE /api/v1/deployments/:id — cancel a deployment */
  cancel = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const id = req.params["id"] as string;
    const deployment = await this.deploymentService.cancelDeployment(id, userId);
    res.json({ deploymentId: deployment.id, status: deployment.status });
  };
}
