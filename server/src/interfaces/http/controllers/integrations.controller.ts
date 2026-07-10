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
    const clientUrl = env.ALLOWED_ORIGINS[0] ?? "http://localhost:3000";

    // Log whether Vercel actually reached us and with which params (no secrets).
    logger.info("Vercel OAuth callback received", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasTeamId: Boolean(teamId),
      hasConfigurationId: Boolean(configurationId),
    });

    const failRedirect = (reason: string): void => {
      // Redirect to onboarding (not the dashboard) so the reason isn't lost to
      // the dashboard's "not connected → onboarding" bounce, and surface it.
      res.redirect(`${clientUrl}/onboarding?vercel=error&reason=${encodeURIComponent(reason.slice(0, 200))}`);
    };

    if (!code || !state) {
      logger.warn("Vercel callback missing params", { hasCode: Boolean(code), hasState: Boolean(state) });
      failRedirect("Vercel did not return a code/state. Check the integration's Redirect URL configuration.");
      return;
    }

    try {
      const result = await this.integrationService.handleVercelCallback(
        code,
        state,
        teamId ?? null,
        configurationId ?? "",
      );

      const returnPath = result.returnTo === "onboarding" ? "/onboarding" : "/dashboard/integrations";
      res.redirect(`${clientUrl}${returnPath}?vercel=connected`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.error("Vercel OAuth callback failed", { error: reason });
      failRedirect(reason);
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
