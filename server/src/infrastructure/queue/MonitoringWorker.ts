import { Queue, Worker } from "bullmq";
import type IORedis from "ioredis";
import type { PrismaClient } from "@prisma/client";
import { logger } from "../../shared/logger/logger";
import type { MobileNotificationService } from "../../application/notifications/MobileNotificationService";

const QUEUE_NAME = "monitoring";
const SCAN_INTERVAL_MS = 5 * 60 * 1000; // one probe round every 5 minutes
const PROBE_TIMEOUT_MS = 15_000;
const RETENTION_DAYS = 7;

interface ProbeTarget {
  repositoryId: string;
  target: "FRONTEND" | "BACKEND";
  url: string;
}

async function probe(url: string): Promise<{ ok: boolean; httpStatus: number | null; latencyMs: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    return { ok: res.status < 500, httpStatus: res.status, latencyMs: Date.now() - started };
  } catch {
    return { ok: false, httpStatus: null, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Repeatable uptime monitor: every 5 minutes, probe the live URLs of every
 * project with a completed deployment and store health samples. Free-tier
 * backends sleep when idle — a slow first response still counts as UP
 * (status < 500); only errors and timeouts count as DOWN.
 */
export function startMonitoring(
  connection: IORedis,
  prisma: PrismaClient,
  notifications?: MobileNotificationService,
): { queue: Queue; worker: Worker } {
  const queue = new Queue(QUEUE_NAME, { connection });

  void queue.upsertJobScheduler("monitor-scan", { every: SCAN_INTERVAL_MS }, { name: "scan" });

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      // Latest completed deployment per repository defines the live URLs.
      const deployments = await prisma.deployment.findMany({
        where: { status: "COMPLETED", OR: [{ frontendUrl: { not: null } }, { backendUrl: { not: null } }] },
        orderBy: { createdAt: "desc" },
        select: { repositoryId: true, frontendUrl: true, backendUrl: true },
      });

      const seen = new Set<string>();
      const targets: ProbeTarget[] = [];
      for (const d of deployments) {
        if (seen.has(d.repositoryId)) continue;
        seen.add(d.repositoryId);
        if (d.frontendUrl) targets.push({ repositoryId: d.repositoryId, target: "FRONTEND", url: d.frontendUrl });
        if (d.backendUrl) targets.push({ repositoryId: d.repositoryId, target: "BACKEND", url: d.backendUrl });
      }
      if (targets.length === 0) return;

      const results = await Promise.all(
        targets.map(async (t) => ({ ...t, ...(await probe(t.url)) })),
      );
      const previousSamples = await Promise.all(results.map((result) => prisma.uptimeSample.findFirst({
        where: { repositoryId: result.repositoryId, target: result.target },
        orderBy: { checkedAt: "desc" },
        select: { ok: true, checkedAt: true },
      })));
      await prisma.uptimeSample.createMany({
        data: results.map((r) => ({
          repositoryId: r.repositoryId,
          target: r.target,
          url: r.url,
          ok: r.ok,
          httpStatus: r.httpStatus,
          latencyMs: r.latencyMs,
        })),
      });

      if (notifications) {
        await Promise.all(results.map(async (result, index) => {
          const previous = previousSamples[index];
          if (!previous || previous.ok === result.ok) return;
          const repository = await prisma.repository.findUnique({
            where: { id: result.repositoryId },
            select: { id: true, userId: true, name: true },
          });
          if (!repository) return;
          const recovered = result.ok;
          await notifications.notify({
            userId: repository.userId,
            eventId: `uptime:${repository.id}:${result.target}:${previous.checkedAt.toISOString()}:${recovered ? "recovered" : "down"}`,
            type: recovered ? "project-recovered" : "project-down",
            title: `${repository.name} ${recovered ? "recovered" : "is down"}`,
            body: `${result.target.toLowerCase()} endpoint ${recovered ? "is responding again" : "is not responding"}.`,
            projectId: repository.id,
          });
        }));
      }

      // Retention: drop samples older than the window we ever display.
      await prisma.uptimeSample.deleteMany({
        where: { checkedAt: { lt: new Date(Date.now() - RETENTION_DAYS * 86_400_000) } },
      });

      logger.info("Monitoring scan complete", {
        projects: seen.size,
        probes: results.length,
        down: results.filter((r) => !r.ok).length,
      });
    },
    {
      connection,
      concurrency: 1,
      // Same idle-traffic hygiene as the deployment worker.
      drainDelay: 60,
      stalledInterval: 300_000,
    },
  );

  worker.on("error", (err) => logger.error("Monitoring worker error", { error: err.message }));
  return { queue, worker };
}
