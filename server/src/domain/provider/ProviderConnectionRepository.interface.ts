import type { ProviderConnection, ProviderType, UpsertProviderConnectionInput, ConnectionStatus } from "./ProviderConnection";

export interface IProviderConnectionRepository {
  findByUserId(userId: string): Promise<ProviderConnection[]>;
  findByUserAndProvider(userId: string, provider: ProviderType): Promise<ProviderConnection | null>;
  findByInstallationId(installationId: string): Promise<ProviderConnection | null>;
  upsert(input: UpsertProviderConnectionInput): Promise<ProviderConnection>;
  updateStatus(userId: string, provider: ProviderType, status: ConnectionStatus): Promise<void>;
  delete(userId: string, provider: ProviderType): Promise<void>;
}
