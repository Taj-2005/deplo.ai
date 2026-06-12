import type { Prisma, PrismaClient } from "@prisma/client";
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
    branch: string;
    detectedStack: unknown;
    envVariables: unknown;
    frontendUrl: string | null;
    backendUrl: string | null;
    logs: unknown;
    vercelProjectId: string | null;
    vercelDeployId: string | null;
    renderServiceId: string | null;
    renderDeployId: string | null;
    error: string | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Deployment {
    return {
      ...row,
      status: row.status as Deployment["status"],
      detectedStack: row.detectedStack as DetectedStack | null,
      envVariables: (row.envVariables as EnvVariable[]) ?? [],
      logs: (row.logs as string[]) ?? [],
      // Neon driver can return DateTime as ISO strings — always coerce to Date
      completedAt: row.completedAt ? new Date(row.completedAt) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
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

  async findByVercelDeployId(vercelDeployId: string): Promise<Deployment | null> {
    const row = await this.prisma.deployment.findFirst({
      where: { vercelDeployId },
    });
    return row ? this.mapRow(row) : null;
  }

  async findByRenderServiceId(renderServiceId: string): Promise<Deployment | null> {
    const row = await this.prisma.deployment.findFirst({
      where: { renderServiceId },
    });
    return row ? this.mapRow(row) : null;
  }

  async findLatestByRepoFullNameAndBranch(
    fullName: string,
    branch: string,
  ): Promise<Deployment | null> {
    const row = await this.prisma.deployment.findFirst({
      where: { branch, status: "COMPLETED", repository: { fullName } },
      orderBy: { createdAt: "desc" },
    });
    return row ? this.mapRow(row) : null;
  }

  async create(input: CreateDeploymentInput): Promise<Deployment> {
    const row = await this.prisma.deployment.create({
      data: {
        userId: input.userId,
        repositoryId: input.repositoryId,
        branch: input.branch,
        status: "PENDING",
        envVariables: [],
        logs: [],
      },
    });
    return this.mapRow(row);
  }

  async update(id: string, input: UpdateDeploymentInput): Promise<Deployment> {
    const data: Prisma.DeploymentUpdateInput = {};

    if (input.status !== undefined) data.status = input.status;
    if (input.branch !== undefined) data.branch = input.branch;
    if (input.detectedStack !== undefined) {
      data.detectedStack = input.detectedStack as unknown as Prisma.InputJsonValue;
    }
    if (input.envVariables !== undefined) {
      data.envVariables = input.envVariables as unknown as Prisma.InputJsonValue;
    }
    if (input.frontendUrl !== undefined) data.frontendUrl = input.frontendUrl;
    if (input.backendUrl !== undefined) data.backendUrl = input.backendUrl;
    if (input.logs !== undefined) {
      data.logs = input.logs as unknown as Prisma.InputJsonValue;
    }
    if (input.vercelProjectId !== undefined) data.vercelProjectId = input.vercelProjectId;
    if (input.vercelDeployId !== undefined) data.vercelDeployId = input.vercelDeployId;
    if (input.renderServiceId !== undefined) data.renderServiceId = input.renderServiceId;
    if (input.renderDeployId !== undefined) data.renderDeployId = input.renderDeployId;
    if (input.error !== undefined) data.error = input.error;
    if (input.completedAt !== undefined) data.completedAt = input.completedAt;

    const row = await this.prisma.deployment.update({ where: { id }, data });
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
