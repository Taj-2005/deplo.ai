import type { Request, Response, NextFunction } from "express";
import type { IntegrationService } from "../../../application/services/IntegrationService";
import { env } from "../../../config/env";
import { logger } from "../../../shared/logger/logger";

export class IntegrationsController {
  constructor(private readonly integrationService: IntegrationService) {}

  /**
   * GET /api/v1/integrations
   * List all provider connection statuses for the authenticated user.
   * Tokens are never returned — only status + display metadata.
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const connections = await this.integrationService.listConnections(userId);

      // Shape the response — never expose tokens
      const providers = ["VERCEL"] as const;
      const result = providers.map((provider) => {
        const conn = connections.find((c) => c.provider === provider);
        return {
          provider,
          connected: conn?.status === "ACTIVE",
          accountName: conn?.providerAccountName ?? null,
          teamName: conn?.providerTeamName ?? null,
          teamId: conn?.providerTeamId ?? null,
          connectedAt: conn?.createdAt ?? null,
        };
      });

      res.json({ integrations: result });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/integrations/vercel/install-url
   * Returns the Vercel integration install URL as JSON.
   * Called by the frontend with the auth header, then the client does the redirect.
   */
  vercelInstallUrl = (req: Request, res: Response): void => {
    const userId = req.userId!;
    if (!env.PUBLIC_URL) {
      res.status(503).json({ error: { message: "PUBLIC_URL not configured — Vercel integration requires a public HTTPS URL" } });
      return;
    }
    const returnTo = req.query["returnTo"] === "onboarding" ? "onboarding" : "integrations";
    const url = this.integrationService.getVercelInstallUrl(userId, returnTo);
    res.json({ url });
  };

  /**
   * GET /api/v1/integrations/vercel/callback  (PUBLIC — no auth middleware)
   * Vercel redirects here after the user grants access.
   * The user is identified via the signed JWT in the `state` param.
   */
  vercelCallback = async (req: Request, res: Response): Promise<void> => {
    const { code, state, teamId, configurationId } = req.query as Record<string, string | undefined>;

    if (!code || !state) {
      res.status(400).send("Missing code or state parameter.");
      return;
    }

    try {
      const result = await this.integrationService.handleVercelCallback(
        code,
        state,
        teamId ?? null,
        configurationId ?? "",
      );

      const clientUrl = env.ALLOWED_ORIGINS[0] ?? "http://localhost:3000";
      const returnPath = result.returnTo === "onboarding" ? "/onboarding" : "/dashboard/integrations";
      res.redirect(`${clientUrl}${returnPath}?vercel=connected`);
    } catch (err) {
      logger.error("Vercel OAuth callback failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      const clientUrl = env.ALLOWED_ORIGINS[0] ?? "http://localhost:3000";
      res.redirect(`${clientUrl}/dashboard/integrations?vercel=error`);
    }
  };

  /**
   * DELETE /api/v1/integrations/vercel
   * User-initiated disconnect from the dashboard.
   */
  vercelDisconnect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      await this.integrationService.disconnectVercel(userId);
      res.json({ disconnected: true });
    } catch (err) {
      next(err);
    }
  };
}
