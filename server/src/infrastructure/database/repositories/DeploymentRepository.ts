import type { PrismaClient } from "@prisma/client";
import type { IDeploymentRepository } from "../../../domain/deployment/DeploymentRepository.interface";
import type {
  Deployment,
  CreateDeploymentInput,
  UpdateDeploymentInput,
  DetectedStack,
  EnvVariable,
} from "../../../domain/deployment/Deployment";

export class DeploymentRepository implements IDeploymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapRow(row: {
    id: string;
    userId: string;
    repositoryId: string;
    status: string;
    detectedStack: unknown;
    envVariables: unknown;
    frontendUrl: string | null;
    backendUrl: string | null;
    logs: unknown;
    vercelProjectId: string | null;
    renderServiceId: string | null;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Deployment {
    return {
      ...row,
      status: row.status as Deployment["status"],
      detectedStack: row.detectedStack as DetectedStack | null,
      envVariables: (row.envVariables as EnvVariable[]) ?? [],
      logs: (row.logs as string[]) ?? [],
    };
  }

  async findById(id: string): Promise<Deployment | null> {
    const row = await this.prisma.deployment.findUnique({ where: { id } });
    return row ? this.mapRow(row) : null;
  }

  async findByUserId(userId: string): Promise<Deployment[]> {
    const rows = await this.prisma.deployment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapRow(r));
  }

  async findByRepositoryId(repositoryId: string): Promise<Deployment[]> {
    const rows = await this.prisma.deployment.findMany({
      where: { repositoryId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapRow(r));
  }

  async create(input: CreateDeploymentInput): Promise<Deployment> {
    const row = await this.prisma.deployment.create({
      data: {
        userId: input.userId,
        repositoryId: input.repositoryId,
        status: "PENDING",
        envVariables: [],
        logs: [],
      },
    });
    return this.mapRow(row);
  }

  async update(id: string, input: UpdateDeploymentInput): Promise<Deployment> {
    const row = await this.prisma.deployment.update({
      where: { id },
      data: {
        ...input,
        detectedStack: input.detectedStack ?? undefined,
        envVariables: input.envVariables ?? undefined,
        logs: input.logs ?? undefined,
      },
    });
    return this.mapRow(row);
  }

  async appendLog(id: string, line: string): Promise<void> {
    const existing = await this.prisma.deployment.findUniqueOrThrow({
      where: { id },
      select: { logs: true },
    });
    const logs = (existing.logs as string[]) ?? [];
    await this.prisma.deployment.update({
      where: { id },
      data: { logs: [...logs, `[${new Date().toISOString()}] ${line}`] },
    });
  }
}
