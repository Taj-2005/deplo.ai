import { Queue, Worker } from "bullmq";
import type IORedis from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { MobileNotificationService } from "../../application/notifications/MobileNotificationService";
import { logger } from "../../shared/logger/logger";

const QUEUE_NAME = "mobile-notification-receipts";
const SCAN_INTERVAL_MS = 5 * 60_000;

export function startMobileReceiptWorker(connection: IORedis, prisma: PrismaClient): { queue: Queue; worker: Worker } {
  const queue = new Queue(QUEUE_NAME, { connection });
  void queue.upsertJobScheduler("receipt-scan", { every: SCAN_INTERVAL_MS }, { name: "scan" });
  const notifications = new MobileNotificationService(prisma);
  const worker = new Worker(
    QUEUE_NAME,
    async () => notifications.checkReceipts(),
    { connection, concurrency: 1, drainDelay: 60, stalledInterval: 300_000 },
  );
  worker.on("error", (error) => logger.error("Mobile receipt worker error", { error: error.message }));
  return { queue, worker };
}
