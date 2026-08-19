import type { Request, Response } from "express";
import type { IDeploymentRepository } from "../../../domain/deployment/DeploymentRepository.interface";
import type { IRepositoryRepository } from "../../../domain/repository/Repository";
import type { IntegrationService } from "../../../application/services/IntegrationService";
import type { Queue } from "bullmq";
import type { DeploymentJobData, DeploymentJobName } from "../../../infrastructure/queue/DeploymentQueue";
import { enqueueAnalysis, enqueueDeploy } from "../../../infrastructure/queue/DeploymentQueue";
import { env } from "../../../config/env";
import { logger } from "../../../shared/logger/logger";
import type { CacheService } from "../../../infrastructure/redis/CacheService";
import { analysisCacheKey } from "../../../application/services/AnalysisService";
import crypto from "crypto";

export class WebhooksController {
  constructor(
    private readonly deploymentRepository: IDeploymentRepository,
    private readonly repositoryRepository: IRepositoryRepository,
    private readonly queue: Queue<DeploymentJobData, void, DeploymentJobName>,
    private readonly integrationService: IntegrationService,
    /** Optional — used to drop the cached analysis when the repo changes. */
    private readonly cache: CacheService | null = null,
  ) {}

  /**
   * POST /api/v1/webhooks/vercel
   * Vercel sends deployment state change events.
   * Payload: { type: "deployment", payload: { deploymentId, readyState, ... } }
   */
  vercel = async (req: Request, res: Response): Promise<void> => {
    if (!this.verifyVercelSignature(req)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const event = req.body as {
      type?: string;
      payload?: {
        deploymentId?: string;
        readyState?: string;
        projectId?: string;
        // integration-configuration.removed
        configurationId?: string;
        installationId?: string;
      };
    };

    logger.info("Vercel webhook received", { type: event.type });

    // Deployment state changes
    if (event.type === "deployment" && event.payload?.deploymentId) {
      const { deploymentId: vercelDeployId, readyState } = event.payload;
      const deployment = await this.deploymentRepository.findByVercelDeployId(vercelDeployId);
      if (deployment) {
        if (readyState === "READY") {
          await this.deploymentRepository.update(deployment.id, {
            status: "COMPLETED",
            completedAt: new Date(),
          });
          await this.deploymentRepository.appendLog(
            deployment.id,
            `Vercel webhook: deployment READY (${vercelDeployId})`,
          );
        } else if (readyState === "ERROR" || readyState === "CANCELED") {
          await this.deploymentRepository.update(deployment.id, {
            status: "FAILED",
            error: `Vercel deployment ${readyState.toLowerCase()}`,
            completedAt: new Date(),
          });
        }
      }
    }

    // User uninstalled the deplo.ai integration from their Vercel dashboard
    if (event.type === "integration-configuration.removed") {
      const installationId =
        event.payload?.configurationId ?? event.payload?.installationId;
      if (installationId) {
        await this.integrationService.disconnectByInstallationId(installationId);
      }
    }

    res.json({ received: true });
  };

  /**
   * POST /api/v1/webhooks/render
   * Render sends service deploy state change events.
   */
  render = async (req: Request, res: Response): Promise<void> => {
    if (!this.verifyRenderSignature(req)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const event = req.body as {
      type?: string;
      data?: {
        deploy?: {
          id?: string;
          status?: string;
          serviceId?: string;
        };
      };
    };

    logger.info("Render webhook received", {
      type: event.type,
      status: event.data?.deploy?.status,
    });

    if (event.data?.deploy?.id && event.data.deploy.serviceId) {
      const { id: renderDeployId, serviceId, status } = event.data.deploy;

      const deployment = await this.deploymentRepository.findByRenderServiceId(serviceId);
      if (deployment && deployment.renderDeployId === renderDeployId) {
        if (status === "live") {
          await this.deploymentRepository.appendLog(
            deployment.id,
            `Render webhook: service live (${serviceId})`,
          );
        } else if (status === "build_failed") {
          await this.deploymentRepository.update(deployment.id, {
            status: "FAILED",
            error: "Render build failed",
            completedAt: new Date(),
          });
        }
      }
    }

    res.json({ received: true });
  };

  /**
   * POST /api/v1/webhooks/github
   * GitHub push events → auto-redeploy with the same configuration as the last successful run.
   */
  github = async (req: Request, res: Response): Promise<void> => {
    const rawBody = JSON.stringify(req.body);
    if (!this.verifyGitHubSignature(req, rawBody)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const event = req.headers["x-github-event"] as string | undefined;
    if (event !== "push") {
      res.json({ received: true });
      return;
    }

    const payload = req.body as {
      ref?: string;
      repository?: { full_name?: string };
    };
    const fullName = payload.repository?.full_name;
    const ref = payload.ref;

    if (!fullName || !ref) {
      res.json({ received: true });
      return;
    }

    const branch = ref.replace(/^refs\/heads\//, "");
    logger.info("GitHub push webhook received", { fullName, branch });

    // The repo just changed, so any cached analysis for this ref is stale.
    // Dropping it here is what makes the cache safe to serve elsewhere.
    if (this.cache) {
      await this.cache.del(analysisCacheKey(fullName, branch));
      await this.cache.del(analysisCacheKey(fullName, "HEAD"));
    }

    const repository = await this.repositoryRepository.findByFullName(fullName);
    if (!repository) {
      res.json({ received: true });
      return;
    }

    // Find the latest completed deployment to reuse its stack/env vars
    const previous = await this.deploymentRepository.findLatestByRepoFullNameAndBranch(
      fullName,
      branch,
    );

    const deployment = await this.deploymentRepository.create({
      userId: repository.userId,
      repositoryId: repository.id,
      branch,
    });

    if (previous?.detectedStack && previous.envVariables.length > 0) {
      // Reuse configuration — skip straight to deploy
      await this.deploymentRepository.update(deployment.id, {
        detectedStack: previous.detectedStack,
        envVariables: previous.envVariables,
        status: "DEPLOYING_BACKEND",
      });
      await this.deploymentRepository.appendLog(
        deployment.id,
        "Auto-redeployment triggered by GitHub push — reusing previous configuration.",
      );
      await enqueueDeploy(this.queue, deployment.id);
    } else {
      // Fresh deploy — run full analysis first
      await this.deploymentRepository.appendLog(
        deployment.id,
        "Auto-redeployment triggered by GitHub push.",
      );
      await enqueueAnalysis(this.queue, deployment.id);
    }

    logger.info("Auto-redeployment queued", { deploymentId: deployment.id, fullName, branch });
    res.json({ received: true, deploymentId: deployment.id });
  };

  // ── Signature verification ────────────────────────────────────────────────

  private verifyGitHubSignature(req: Request, body: string): boolean {
    if (!env.WEBHOOK_SECRET) return true; // skip verification in dev
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    if (!signature) return false;
    const expected = `sha256=${crypto.createHmac("sha256", env.WEBHOOK_SECRET).update(body).digest("hex")}`;
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  private verifyVercelSignature(req: Request): boolean {
    if (!env.WEBHOOK_SECRET) return true; // not configured — skip in dev
    const signature = req.headers["x-vercel-signature"] as string | undefined;
    if (!signature) return false;
    const body = JSON.stringify(req.body);
    const expected = crypto.createHmac("sha1", env.WEBHOOK_SECRET).update(body).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  private verifyRenderSignature(req: Request): boolean {
    if (!env.WEBHOOK_SECRET) return true; // not configured — skip in dev
    const signature = req.headers["render-signature"] as string | undefined;
    if (!signature) return false;
    const body = JSON.stringify(req.body);
    const expected = crypto
      .createHmac("sha256", env.WEBHOOK_SECRET)
      .update(body)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(`sha256=${expected}`), Buffer.from(signature));
  }
}
