import type { Request, Response } from "express";
import type { IDeploymentRepository } from "../../../domain/deployment/DeploymentRepository.interface";
import type { Queue } from "bullmq";
import type { DeploymentJobData, DeploymentJobName } from "../../../infrastructure/queue/DeploymentQueue";
import { env } from "../../../config/env";
import { logger } from "../../../shared/logger/logger";
import crypto from "crypto";

export class WebhooksController {
  constructor(
    private readonly deploymentRepository: IDeploymentRepository,
    private readonly queue: Queue<DeploymentJobData, void, DeploymentJobName>,
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
      payload?: { deploymentId?: string; readyState?: string; projectId?: string };
    };

    logger.info("Vercel webhook received", {
      type: event.type,
      readyState: event.payload?.readyState,
    });

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

  // ── Signature verification ────────────────────────────────────────────────

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
