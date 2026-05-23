import { Queue } from "bullmq";
import type IORedis from "ioredis";

export const QUEUE_NAME = "deployments";

export type DeploymentJobData =
  | { phase: "analyze"; deploymentId: string }
  | { phase: "deploy"; deploymentId: string };

export type DeploymentJobName = "analyze" | "deploy";

let _queue: Queue<DeploymentJobData, void, DeploymentJobName> | null = null;

export function getDeploymentQueue(
  connection: IORedis,
): Queue<DeploymentJobData, void, DeploymentJobName> {
  if (!_queue) {
    _queue = new Queue<DeploymentJobData, void, DeploymentJobName>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return _queue;
}

export async function enqueueAnalysis(
  queue: Queue<DeploymentJobData, void, DeploymentJobName>,
  deploymentId: string,
): Promise<void> {
  await queue.add("analyze", { phase: "analyze", deploymentId }, { jobId: `analyze-${deploymentId}` });
}

export async function enqueueDeploy(
  queue: Queue<DeploymentJobData, void, DeploymentJobName>,
  deploymentId: string,
): Promise<void> {
  await queue.add("deploy", { phase: "deploy", deploymentId }, { jobId: `deploy-${deploymentId}` });
}
