export type ProviderType = "VERCEL" | "RENDER" | "RAILWAY" | "CLOUDFLARE";
export type ConnectionStatus = "ACTIVE" | "DISCONNECTED";

export interface ProviderConnection {
  id: string;
  userId: string;
  provider: ProviderType;
  providerUserId: string | null;
  providerTeamId: string | null;      // null = personal account
  providerTeamName: string | null;
  providerAccountName: string | null;
  installationId: string | null;
  accessTokenEncrypted: string;
  metadata: Record<string, unknown>;
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertProviderConnectionInput {
  userId: string;
  provider: ProviderType;
  providerUserId?: string | null;
  providerTeamId?: string | null;
  providerTeamName?: string | null;
  providerAccountName?: string | null;
  installationId?: string | null;
  accessTokenEncrypted: string;
  metadata?: Record<string, unknown>;
  status?: ConnectionStatus;
}
