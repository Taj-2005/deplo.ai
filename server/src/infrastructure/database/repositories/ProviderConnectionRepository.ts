import type { PrismaClient } from "@prisma/client";
import type { IProviderConnectionRepository } from "../../../domain/provider/ProviderConnectionRepository.interface";
import type {
  ProviderConnection,
  ProviderType,
  UpsertProviderConnectionInput,
  ConnectionStatus,
} from "../../../domain/provider/ProviderConnection";

export class ProviderConnectionRepository implements IProviderConnectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapRow(row: {
    id: string;
    userId: string;
    provider: string;
    providerUserId: string | null;
    providerTeamId: string | null;
    providerTeamName: string | null;
    providerAccountName: string | null;
    installationId: string | null;
    accessTokenEncrypted: string;
    metadata: unknown;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): ProviderConnection {
    return {
      ...row,
      provider: row.provider as ProviderType,
      status: row.status as ConnectionStatus,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async findByUserId(userId: string): Promise<ProviderConnection[]> {
    const rows = await this.prisma.providerConnection.findMany({ where: { userId } });
    return rows.map((r) => this.mapRow(r));
  }

  async findByUserAndProvider(userId: string, provider: ProviderType): Promise<ProviderConnection | null> {
    const row = await this.prisma.providerConnection.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    return row ? this.mapRow(row) : null;
  }

  async findByInstallationId(installationId: string): Promise<ProviderConnection | null> {
    const row = await this.prisma.providerConnection.findFirst({ where: { installationId } });
    return row ? this.mapRow(row) : null;
  }

  async upsert(input: UpsertProviderConnectionInput): Promise<ProviderConnection> {
    const row = await this.prisma.providerConnection.upsert({
      where: { userId_provider: { userId: input.userId, provider: input.provider } },
      create: {
        userId: input.userId,
        provider: input.provider,
        providerUserId: input.providerUserId ?? null,
        providerTeamId: input.providerTeamId ?? null,
        providerTeamName: input.providerTeamName ?? null,
        providerAccountName: input.providerAccountName ?? null,
        installationId: input.installationId ?? null,
        accessTokenEncrypted: input.accessTokenEncrypted,
        metadata: (input.metadata ?? {}) as object,
        status: input.status ?? "ACTIVE",
      },
      update: {
        providerUserId: input.providerUserId ?? null,
        providerTeamId: input.providerTeamId ?? null,
        providerTeamName: input.providerTeamName ?? null,
        providerAccountName: input.providerAccountName ?? null,
        installationId: input.installationId ?? null,
        accessTokenEncrypted: input.accessTokenEncrypted,
        metadata: (input.metadata ?? {}) as object,
        status: input.status ?? "ACTIVE",
      },
    });
    return this.mapRow(row);
  }

  async updateStatus(userId: string, provider: ProviderType, status: ConnectionStatus): Promise<void> {
    await this.prisma.providerConnection.updateMany({
      where: { userId, provider },
      data: { status },
    });
  }

  async delete(userId: string, provider: ProviderType): Promise<void> {
    await this.prisma.providerConnection.deleteMany({ where: { userId, provider } });
  }
}
