"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Check,
  Copy,
  Globe,
  RefreshCw,
  Rocket,
  Server,
  Loader2,
} from "lucide-react";
import { useDeployments } from "@/hooks/useDashboardData";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SkeletonRepoCard } from "@/components/dashboard/SkeletonCard";
import { formatRelativeTime } from "@/lib/format";
import { getProjectMonitoring, type ProjectMonitoring } from "@/lib/dashboard-api";
import type { Deployment } from "@/types/dashboard";
import { isActiveStatus } from "@/types/dashboard";

const REFRESH_MS = 60_000;

// ─── Health primitives ────────────────────────────────────────────────────────

type Health = "up" | "down" | "unknown";

function healthOf(target: ProjectMonitoring["frontend"] | undefined): Health {
  if (!target?.current) return "unknown";
  return target.current.ok ? "up" : "down";
}

const HEALTH_DOT: Record<Health, string> = {
  up: "bg-green-500",
  down: "bg-red-500",
  unknown: "bg-ds-outline",
};

/** Latency history as a bar sparkline — shape matters more than exact values. */
function Sparkline({ series }: { series: Array<{ latencyMs: number | null; ok: boolean }> }) {
  const points = series.slice(-24);
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.latencyMs ?? 0), 1);

  return (
    <div className="flex h-6 items-end gap-[2px]" aria-hidden>
      {points.map((p, i) => (
        <div
          key={i}
          style={{ height: `${Math.max(8, ((p.latencyMs ?? 0) / max) * 100)}%` }}
          className={`w-full min-w-[2px] ${p.ok ? "bg-[#0891b2] dark:bg-[#22d3ee]" : "bg-red-500"}`}
        />
      ))}
    </div>
  );
}

// ─── URL row ──────────────────────────────────────────────────────────────────

function UrlRow({
  kind,
  url,
  health,
  latencyMs,
}: {
  kind: "Frontend" | "Backend";
  url: string;
  health: Health;
  latencyMs: number | null;
}) {
  const [copied, setCopied] = useState(false);
  const Icon = kind === "Frontend" ? Globe : Server;

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the link is still selectable
    }
  };

  return (
    <div className="flex items-center gap-2.5 border border-ds-outline-variant bg-ds-surface-low px-3 py-2.5">
      <Icon size={13} strokeWidth={1.5} className="shrink-0 text-ds-on-variant" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-ds-on-variant">{kind}</span>
          <span className={`h-1.5 w-1.5 rounded-full ${HEALTH_DOT[health]}`} />
          {latencyMs !== null && (
            <span className="text-[10px] font-mono text-ds-on-variant tabular-nums">{latencyMs}ms</span>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="block truncate text-[13px] font-mono text-ds-on-surface hover:underline"
        >
          {url.replace("https://", "")}
        </a>
      </div>
      <button
        onClick={copy}
        aria-label={`Copy ${kind} URL`}
        className="shrink-0 p-1.5 text-ds-on-variant hover:text-ds-on-surface transition-colors"
      >
        {copied ? <Check size={12} strokeWidth={1.5} className="text-green-600 dark:text-green-400" /> : <Copy size={12} strokeWidth={1.5} />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Open ${kind}`}
        className="shrink-0 p-1.5 text-ds-on-variant hover:text-ds-on-surface transition-colors"
      >
        <ArrowUpRight size={12} strokeWidth={1.5} />
      </a>
    </div>
  );
}

// ─── Live app card ────────────────────────────────────────────────────────────

function AppCard({ dep, monitoring }: { dep: Deployment; monitoring: ProjectMonitoring | null }) {
  const router = useRouter();
  const stack = [dep.detectedStack?.frontend, dep.detectedStack?.backend].filter(Boolean);

  const frontHealth = healthOf(monitoring?.frontend);
  const backHealth = healthOf(monitoring?.backend);
  const worst: Health =
    frontHealth === "down" || backHealth === "down"
      ? "down"
      : frontHealth === "up" || backHealth === "up"
        ? "up"
        : "unknown";

  const uptime = monitoring?.frontend.uptime24h ?? monitoring?.backend.uptime24h ?? null;
  const series = (monitoring?.frontend.series.length ? monitoring.frontend.series : monitoring?.backend.series) ?? [];
  const failedRedeploy = monitoring?.latestAttempt?.status === "FAILED" && monitoring.latestAttempt.isNewerThanLive;

  return (
    <div
      onClick={() => router.push(`/dashboard/monitoring/${dep.repositoryId}?from=live`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/dashboard/monitoring/${dep.repositoryId}?from=live`)}
      className="group relative flex flex-col overflow-hidden border border-ds-outline-variant bg-ds-surface p-5 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div
        className={`absolute inset-x-0 top-0 h-[2px] ${
          worst === "down" ? "bg-red-500" : worst === "up" ? "bg-green-500" : "bg-ds-outline-variant"
        }`}
      />

      {/* Identity */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-ds-on-surface">{dep.repositoryName}</h3>
          <p className="mt-0.5 truncate text-[12px] font-mono text-ds-on-variant">
            {dep.repositoryFullName} · {dep.branch}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-[0.08em] ${
            worst === "down"
              ? "border-red-300 text-red-600 dark:border-red-900 dark:text-red-400"
              : worst === "up"
                ? "border-green-300 text-green-700 dark:border-green-900 dark:text-green-400"
                : "border-ds-outline-variant text-ds-on-variant"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${HEALTH_DOT[worst]}`} />
          {worst === "down" ? "Down" : worst === "up" ? "Live" : "Live"}
        </span>
      </div>

      {/* Stack chips */}
      {stack.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stack.map((s) => (
            <span
              key={s}
              className="border border-ds-outline-variant px-1.5 py-0.5 text-[10.5px] font-mono text-ds-on-variant"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* The links — the reason this page exists */}
      <div className="mt-4 flex flex-col gap-2">
        {dep.frontendUrl && (
          <UrlRow
            kind="Frontend"
            url={dep.frontendUrl}
            health={frontHealth}
            latencyMs={monitoring?.frontend.current?.latencyMs ?? null}
          />
        )}
        {dep.backendUrl && (
          <UrlRow
            kind="Backend"
            url={dep.backendUrl}
            health={backHealth}
            latencyMs={monitoring?.backend.current?.latencyMs ?? null}
          />
        )}
      </div>

      {/* A newer attempt failed — the live site is still the previous deploy */}
      {failedRedeploy && (
        <Link
          href={`/dashboard/deployments/${monitoring?.latestAttempt?.id}?from=live`}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 block border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-relaxed text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
        >
          Latest deploy failed — this site is still serving the previous successful build.{" "}
          <span className="underline">View diagnosis →</span>
        </Link>
      )}

      {/* Vitals */}
      <div className="mt-auto flex items-end justify-between gap-4 pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-ds-on-variant">Uptime 24h</span>
          <span className="text-[16px] font-semibold text-ds-on-surface tabular-nums">
            {uptime !== null ? `${uptime}%` : "—"}
          </span>
        </div>
        <div className="min-w-0 flex-1 px-2">
          <Sparkline series={series} />
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-ds-on-variant">Deployed</span>
          <span className="text-[12px] font-mono text-ds-on-surface">{formatRelativeTime(dep.updatedAt)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-ds-outline-variant pt-3 text-[12px] font-mono">
        <span className="flex items-center gap-1.5 text-ds-on-variant group-hover:text-ds-on-surface transition-colors">
          <Activity size={11} strokeWidth={1.5} />
          Monitoring &amp; analytics →
        </span>
        <Link
          href={`/dashboard/deployments/${dep.id}?from=live`}
          onClick={(e) => e.stopPropagation()}
          className="ml-auto text-ds-on-variant hover:text-ds-on-surface transition-colors"
        >
          Build log
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiveAppsPage() {
  const router = useRouter();
  const { data, loading, error, refetch } = useDeployments();
  const [monitoring, setMonitoring] = useState<Record<string, ProjectMonitoring>>({});

  /** Latest successful deployment per repository — one card per live app. */
  const liveApps = useMemo(() => {
    const byRepo = new Map<string, Deployment>();
    for (const d of data ?? []) {
      if (d.status !== "COMPLETED") continue;
      if (!d.frontendUrl && !d.backendUrl) continue;
      const seen = byRepo.get(d.repositoryId);
      if (!seen || new Date(d.updatedAt) > new Date(seen.updatedAt)) byRepo.set(d.repositoryId, d);
    }
    return [...byRepo.values()].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [data]);

  const deployingNow = useMemo(() => (data ?? []).filter((d) => isActiveStatus(d.status)), [data]);

  // Health per app, fetched in parallel and merged as each lands. Failures are
  // silent: a card without monitoring still shows its links.
  const loadHealth = useCallback((repoIds: string[]) => {
    repoIds.forEach((id) => {
      getProjectMonitoring(id)
        .then((m) => setMonitoring((prev) => ({ ...prev, [id]: m })))
        .catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    if (liveApps.length === 0) return undefined;
    const ids = liveApps.map((d) => d.repositoryId);
    const t = setTimeout(() => loadHealth(ids), 0);
    const timer = setInterval(() => loadHealth(ids), REFRESH_MS);
    return () => {
      clearTimeout(t);
      clearInterval(timer);
    };
  }, [liveApps, loadHealth]);

  const downCount = liveApps.filter((d) => {
    const m = monitoring[d.repositoryId];
    return healthOf(m?.frontend) === "down" || healthOf(m?.backend) === "down";
  }).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ds-on-surface">Live apps</h1>
          <p className="mt-1 text-[14px] font-mono text-ds-on-variant">
            {liveApps.length > 0
              ? `${liveApps.length} running in production${downCount > 0 ? ` · ${downCount} unreachable` : ""}`
              : "Everything you've deployed, with its production URLs and health."}
          </p>
        </div>
        <button
          onClick={refetch}
          aria-label="Refresh"
          className="flex shrink-0 items-center gap-2 border border-ds-outline-variant px-3 py-1.5 text-[12px] font-mono text-ds-on-variant hover:border-ds-outline hover:text-ds-on-surface transition-colors"
        >
          <RefreshCw size={12} strokeWidth={1.5} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* In-flight strip — context without stealing the page */}
      {deployingNow.length > 0 && (
        <Link
          href={`/dashboard/deployments/${deployingNow[0]?.id}?from=live`}
          className="mb-6 flex items-center gap-2.5 border border-ds-outline-variant bg-ds-surface px-4 py-3 text-[13px] text-ds-on-surface hover:border-ds-outline transition-colors"
        >
          <Loader2 size={13} strokeWidth={1.5} className="animate-spin text-ds-on-variant" />
          {deployingNow.length === 1
            ? `${deployingNow[0]?.repositoryName} is deploying now`
            : `${deployingNow.length} deployments in progress`}
          <span className="ml-auto font-mono text-[12px] text-ds-on-variant">Follow the log →</span>
        </Link>
      )}

      {loading && !data && (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonRepoCard />
          <SkeletonRepoCard />
        </div>
      )}

      {error && !data && (
        <div className="border border-ds-outline-variant bg-ds-surface px-6 py-5 text-[13px] text-ds-on-variant">
          Couldn&apos;t load your apps — {error}
        </div>
      )}

      {data && liveApps.length === 0 && (
        <div className="border border-ds-outline-variant bg-ds-surface">
          <EmptyState
            icon={<Rocket size={18} strokeWidth={1.5} />}
            title="No live apps yet"
            description="Deploy a repository and its production URLs will appear here, monitored around the clock."
            action={{ label: "Deploy a project", onClick: () => router.push("/dashboard/repositories") }}
          />
        </div>
      )}

      {liveApps.length > 0 && (
        <div className="grid items-stretch gap-4 md:grid-cols-2">
          {liveApps.map((dep) => (
            <AppCard key={dep.repositoryId} dep={dep} monitoring={monitoring[dep.repositoryId] ?? null} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
