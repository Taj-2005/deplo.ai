import jwt from "jsonwebtoken";
import { AppError } from "../../shared/errors/AppError";
import { encrypt, decrypt } from "../../shared/utils/crypto";
import { logger } from "../../shared/logger/logger";
import { VercelAdapter } from "../../infrastructure/vercel/VercelAdapter";
import type { IProviderConnectionRepository } from "../../domain/provider/ProviderConnectionRepository.interface";
import type { ProviderConnection } from "../../domain/provider/ProviderConnection";

interface VercelOAuthTokenResponse {
  access_token: string;
  token_type: string;
  installation_id: string;
  user_id: string;
  team_id: string | null;
}

export class IntegrationService {
  constructor(
    private readonly providerConnectionRepository: IProviderConnectionRepository,
    private readonly config: {
      vercelClientId: string;
      vercelClientSecret: string;
      vercelIntegrationSlug: string;
      publicUrl: string;
      jwtSecret: string;
    },
  ) {}

  // ── Vercel OAuth ───────────────────────────────────────────────────────────

  /**
   * Generate the Vercel integration install URL.
   * Embeds a short-lived signed JWT as the CSRF state param so we can
   * identify the user on callback without a server-side session.
   */
  getVercelInstallUrl(userId: string): string {
    const state = jwt.sign({ userId }, this.config.jwtSecret, { expiresIn: "15m" });
    return `https://vercel.com/integrations/${this.config.vercelIntegrationSlug}/new?state=${encodeURIComponent(state)}`;
  }

  /**
   * Handle the OAuth callback from Vercel.
   * Verifies CSRF state, exchanges the code for a long-lived token,
   * fetches account info, then stores the encrypted token.
   */
  async handleVercelCallback(
    code: string,
    state: string,
    teamId: string | null,
    installationId: string,
  ): Promise<ProviderConnection> {
    // Verify CSRF state
    let userId: string;
    try {
      const payload = jwt.verify(state, this.config.jwtSecret) as { userId: string };
      userId = payload.userId;
    } catch {
      throw AppError.unauthorized("Invalid or expired integration state. Please try connecting again.");
    }

    // Exchange code for long-lived access token
    const redirectUri = `${this.config.publicUrl}/api/v1/integrations/vercel/callback`;
    const tokenRes = await fetch("https://api.vercel.com/v2/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.vercelClientId,
        client_secret: this.config.vercelClientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => "");
      throw AppError.externalService("Vercel", `OAuth token exchange failed: ${tokenRes.status} ${text}`);
    }

    const tokenData = await tokenRes.json() as VercelOAuthTokenResponse;
    const resolvedTeamId = teamId ?? tokenData.team_id ?? null;

    // Fetch human-readable account/team name
    const vercel = new VercelAdapter(tokenData.access_token, resolvedTeamId);
    const accountInfo = await vercel.getAccountInfo();

    // Encrypt and persist
    const accessTokenEncrypted = encrypt(tokenData.access_token);
    const connection = await this.providerConnectionRepository.upsert({
      userId,
      provider: "VERCEL",
      providerUserId: tokenData.user_id,
      providerTeamId: resolvedTeamId,
      providerTeamName: accountInfo.teamName,
      providerAccountName: accountInfo.accountName,
      installationId,
      accessTokenEncrypted,
      status: "ACTIVE",
    });

    logger.info("Vercel integration connected", {
      userId,
      providerUserId: tokenData.user_id,
      teamId: resolvedTeamId,
    });

    return connection;
  }

  /** List all provider connections for a user (statuses, no tokens). */
  async listConnections(userId: string): Promise<ProviderConnection[]> {
    return this.providerConnectionRepository.findByUserId(userId);
  }

  /** Get a single provider connection — used by the orchestrator to load credentials. */
  async getConnection(userId: string, provider: "VERCEL"): Promise<ProviderConnection | null> {
    return this.providerConnectionRepository.findByUserAndProvider(userId, provider);
  }

  /** Mark a Vercel connection as disconnected (called from UI or webhook). */
  async disconnectVercel(userId: string): Promise<void> {
    await this.providerConnectionRepository.updateStatus(userId, "VERCEL", "DISCONNECTED");
    logger.info("Vercel integration disconnected", { userId });
  }

  /** Disconnect by installation ID — called from the Vercel webhook. */
  async disconnectByInstallationId(installationId: string): Promise<void> {
    const connection = await this.providerConnectionRepository.findByInstallationId(installationId);
    if (!connection) return;
    await this.providerConnectionRepository.updateStatus(connection.userId, "VERCEL", "DISCONNECTED");
    logger.info("Vercel integration removed via webhook", { installationId, userId: connection.userId });
  }

  /**
   * Resolve and decrypt the Vercel token for a user.
   * Returns the token + teamId ready to construct a VercelAdapter.
   * Throws if the user has not connected Vercel or the connection is inactive.
   */
  async resolveVercelCredentials(userId: string): Promise<{ token: string; teamId: string | null }> {
    const connection = await this.providerConnectionRepository.findByUserAndProvider(userId, "VERCEL");
    if (!connection || connection.status !== "ACTIVE") {
      throw AppError.conflict(
        "Vercel account not connected. Please connect your Vercel account from the Integrations page.",
      );
    }
    return {
      token: decrypt(connection.accessTokenEncrypted),
      teamId: connection.providerTeamId,
    };
  }
}
