import { Worker, UnrecoverableError, type Job } from "bullmq";
import type IORedis from "ioredis";
import type { DeploymentOrchestrator } from "../../application/orchestration/DeploymentOrchestrator";
import {
  QUEUE_NAME,
  type DeploymentJobData,
  type DeploymentJobName,
  enqueueDeploy,
  getDeploymentQueue,
} from "./DeploymentQueue";
import { logger } from "../../shared/logger/logger";

// Errors that should never be retried: 4xx HTTP errors, and missing config.
function isNonRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // HTTP 4xx from Vercel/Render/GitHub
  const httpMatch = err.message.match(/:\s*(\d{3}):/);
  if (httpMatch) {
    const status = parseInt(httpMatch[1]!, 10);
    if (status >= 400 && status < 500) return true;
  }
  // Missing environment variable configuration
  if (err.message.includes("must be configured") || err.message.includes("not configured")) {
    return true;
  }
  return false;
}

export function createDeploymentWorker(
  connection: IORedis,
  orchestrator: DeploymentOrchestrator,
): Worker<DeploymentJobData, void, DeploymentJobName> {
  const worker = new Worker<DeploymentJobData, void, DeploymentJobName>(
    QUEUE_NAME,
    async (job: Job<DeploymentJobData, void, DeploymentJobName>) => {
      const { deploymentId, phase } = job.data;
      logger.info(`Processing deployment job`, { phase, deploymentId, jobId: job.id });

      try {
        if (phase === "analyze") {
          const { needsEnv } = await orchestrator.runAnalysis(deploymentId);
          if (!needsEnv) {
            const queue = getDeploymentQueue(connection);
            await enqueueDeploy(queue, deploymentId);
          }
        } else if (phase === "deploy") {
          await orchestrator.runDeploy(deploymentId);
        }
      } catch (err) {
        if (isNonRetryable(err)) {
          throw new UnrecoverableError(err instanceof Error ? err.message : String(err));
        }
        throw err;
      }
    },
    {
      connection,
      concurrency: 5,
      // BullMQ workers need maxRetriesPerRequest: null on the Redis connection
    },
  );

  worker.on("completed", (job) => {
    logger.info("Deployment job completed", {
      jobId: job.id,
      phase: job.data.phase,
      deploymentId: job.data.deploymentId,
    });
  });

  worker.on("failed", (job, err) => {
    logger.error("Deployment job failed", {
      jobId: job?.id,
      phase: job?.data.phase,
      deploymentId: job?.data.deploymentId,
      error: err.message,
    });
  });

  worker.on("error", (err) => {
    logger.error("Deployment worker error", { error: err.message });
  });

  return worker;
}
