import type { Request, Response, NextFunction } from "express";
import type { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import type { IntegrationService } from "../../../application/services/IntegrationService";
import { RenderAdapter } from "../../../infrastructure/render/RenderAdapter";
import { logger } from "../../../shared/logger/logger";

const BOT_RE = /bot|crawler|spider|preview|monitor|curl|wget/i;

/**
 * Per-project monitoring + product analytics.
 *
 * - GET  /projects/:repoId/monitoring  (auth)  health, latency, uptime, live Render metrics
 * - GET  /projects/:repoId/analytics   (auth)  pageviews, uniques, top pages/referrers
 * - POST|GET /public/insights/:repoId  (public) beacon ingest from the user's deployed site
 * - GET  /public/insights.js           (public) the opt-in tracking snippet
 */
export class MonitoringController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly integrationService: IntegrationService,
  ) {}

  /** Ownership guard: the repo must belong to the authenticated user. */
  private async ownedRepo(userId: string, repoId: string) {
    const repo = await this.prisma.repository.findUnique({ where: { id: repoId } });
    if (!repo || repo.userId !== userId) return null;
    return repo;
  }

  monitoring = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repo = await this.ownedRepo(req.userId!, req.params["repoId"] as string);
      if (!repo) {
        res.status(404).json({ error: { message: "Project not found" } });
        return;
      }

      const since = new Date(Date.now() - 24 * 3600_000);
      const [samples, latestDeployment, latestAttempt] = await Promise.all([
        this.prisma.uptimeSample.findMany({
          where: { repositoryId: repo.id, checkedAt: { gte: since } },
          orderBy: { checkedAt: "asc" },
        }),
        // Latest SUCCESSFUL deployment — defines the live URLs being monitored.
        this.prisma.deployment.findFirst({
          where: { repositoryId: repo.id, status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
        }),
        // Latest attempt of ANY status — surfaces failures/in-progress clearly.
        this.prisma.deployment.findFirst({
          where: { repositoryId: repo.id },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const byTarget = (target: "FRONTEND" | "BACKEND") => {
        const s = samples.filter((x) => x.target === target);
        const latest = s[s.length - 1] ?? null;
        const upCount = s.filter((x) => x.ok).length;
        return {
          url: latest?.url ?? (target === "FRONTEND" ? latestDeployment?.frontendUrl : latestDeployment?.backendUrl) ?? null,
          current: latest
            ? { ok: latest.ok, httpStatus: latest.httpStatus, latencyMs: latest.latencyMs, checkedAt: latest.checkedAt }
            : null,
          uptime24h: s.length ? Math.round((upCount / s.length) * 1000) / 10 : null,
          series: s.map((x) => ({ t: x.checkedAt, ok: x.ok, latencyMs: x.latencyMs })),
        };
      };

      // Live server metrics from the user's own Render service (best-effort).
      let server: {
        state: string;
        cpu: Array<{ timestamp: string; value: number }>;
        memory: Array<{ timestamp: string; value: number }>;
      } | null = null;
      if (latestDeployment?.renderServiceId) {
        try {
          const creds = await this.integrationService.resolveRenderCredentials(repo.userId);
          const render = new RenderAdapter(creds.apiKey);
          const end = new Date();
          const start = new Date(Date.now() - 3600_000);
          const [service, cpu, memory] = await Promise.all([
            render.getService(latestDeployment.renderServiceId),
            render.getMetric("cpu", latestDeployment.renderServiceId, start, end),
            render.getMetric("memory", latestDeployment.renderServiceId, start, end),
          ]);
          server = { state: service.serviceDetails?.url ? "deployed" : "unknown", cpu, memory };
        } catch (err) {
          logger.debug("Render metrics unavailable", { error: err instanceof Error ? err.message : String(err) });
        }
      }

      res.json({
        project: { id: repo.id, name: repo.name, fullName: repo.fullName },
        frontend: byTarget("FRONTEND"),
        backend: byTarget("BACKEND"),
        server,
        lastDeployment: latestDeployment
          ? { id: latestDeployment.id, at: latestDeployment.completedAt, branch: latestDeployment.branch }
          : null,
        latestAttempt: latestAttempt
          ? {
              id: latestAttempt.id,
              status: latestAttempt.status,
              error: latestAttempt.error,
              branch: latestAttempt.branch,
              at: latestAttempt.createdAt,
              isNewerThanLive: latestDeployment ? latestAttempt.id !== latestDeployment.id : true,
            }
          : null,
      });
    } catch (err) {
      next(err);
    }
  };

  analytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repo = await this.ownedRepo(req.userId!, req.params["repoId"] as string);
      if (!repo) {
        res.status(404).json({ error: { message: "Project not found" } });
        return;
      }
      const days = Math.min(30, Math.max(1, parseInt(String(req.query["days"] ?? "7"), 10) || 7));
      const since = new Date(Date.now() - days * 86_400_000);

      const [daily, topPaths, topReferrers, totals] = await Promise.all([
        this.prisma.$queryRaw<Array<{ day: Date; views: bigint; visitors: bigint }>>`
          SELECT date_trunc('day', "createdAt") AS day,
                 COUNT(*) AS views,
                 COUNT(DISTINCT "visitorHash") AS visitors
          FROM "AnalyticsEvent"
          WHERE "repositoryId" = ${repo.id} AND "createdAt" >= ${since}
          GROUP BY 1 ORDER BY 1`,
        this.prisma.$queryRaw<Array<{ path: string; views: bigint }>>`
          SELECT "path", COUNT(*) AS views FROM "AnalyticsEvent"
          WHERE "repositoryId" = ${repo.id} AND "createdAt" >= ${since}
          GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
        this.prisma.$queryRaw<Array<{ referrer: string; views: bigint }>>`
          SELECT COALESCE(NULLIF("referrer", ''), '(direct)') AS referrer, COUNT(*) AS views
          FROM "AnalyticsEvent"
          WHERE "repositoryId" = ${repo.id} AND "createdAt" >= ${since}
          GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
        this.prisma.$queryRaw<Array<{ views: bigint; visitors: bigint }>>`
          SELECT COUNT(*) AS views, COUNT(DISTINCT "visitorHash") AS visitors
          FROM "AnalyticsEvent"
          WHERE "repositoryId" = ${repo.id} AND "createdAt" >= ${since}`,
      ]);

      res.json({
        days,
        totals: { views: Number(totals[0]?.views ?? 0), visitors: Number(totals[0]?.visitors ?? 0) },
        daily: daily.map((d) => ({ day: d.day, views: Number(d.views), visitors: Number(d.visitors) })),
        topPaths: topPaths.map((p) => ({ path: p.path, views: Number(p.views) })),
        topReferrers: topReferrers.map((r) => ({ referrer: r.referrer, views: Number(r.views) })),
        snippet: `<script defer src="https://www.deplo.in/api/v1/public/insights.js" data-deplo-key="${repo.id}"></script>`,
      });
    } catch (err) {
      next(err);
    }
  };

  /** Public beacon ingest — accepts GET (image fallback) and POST (sendBeacon). */
  ingest = async (req: Request, res: Response): Promise<void> => {
    // Always answer fast and permissively; analytics must never block a page.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(204).end();

    try {
      const repoId = req.params["repoId"] as string;
      const ua = req.headers["user-agent"] ?? "";
      if (BOT_RE.test(String(ua))) return;
      if (req.headers["dnt"] === "1") return;

      const path = String(req.query["path"] ?? "/").slice(0, 512);
      const referrer = String(req.query["ref"] ?? "").slice(0, 512) || null;

      const repo = await this.prisma.repository.findUnique({ where: { id: repoId }, select: { id: true } });
      if (!repo) return;

      const ip = (String(req.headers["x-forwarded-for"] ?? "").split(",")[0] || req.socket.remoteAddress) ?? "";
      const day = new Date().toISOString().slice(0, 10);
      const visitorHash = createHash("sha256").update(`${ip}|${ua}|${day}|${repoId}`).digest("hex").slice(0, 32);

      await this.prisma.analyticsEvent.create({ data: { repositoryId: repoId, path, referrer, visitorHash } });
    } catch (err) {
      logger.debug("insights ingest dropped", { error: err instanceof Error ? err.message : String(err) });
    }
  };

  /** The opt-in snippet users add to their deployed site. */
  script = (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(`(function(){
var s=document.currentScript;if(!s)return;var k=s.getAttribute("data-deplo-key");if(!k)return;
var base=new URL(s.src).origin+"/api/v1/public/insights/"+encodeURIComponent(k);
function send(){try{
var u=base+"?path="+encodeURIComponent(location.pathname)+"&ref="+encodeURIComponent(document.referrer||"");
if(navigator.sendBeacon){navigator.sendBeacon(u);}else{(new Image()).src=u;}
}catch(e){}}
send();
var p=history.pushState;history.pushState=function(){p.apply(this,arguments);send();};
var r=history.replaceState;history.replaceState=function(){r.apply(this,arguments);send();};
addEventListener("popstate",send);
})();`);
  };
}
