"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, AlertCircle, ArrowLeft, Check, Copy, ExternalLink, Globe, Loader2, Server } from "lucide-react";
import Link from "next/link";
import {
  getProjectAnalytics,
  getProjectMonitoring,
  type ProjectAnalytics,
  type ProjectMonitoring,
  type TargetHealth,
} from "@/lib/dashboard-api";

// Series palette — validated (dataviz six checks) for BOTH light & dark surfaces.
const SERIES = { a: "#0891B2", b: "#7C3AED" } as const;

// Line-chart padding — module constant so hooks don't depend on a fresh object.
const PAD = { l: 44, r: 76, t: 10, b: 20 } as const;

// ─── Tiny chart primitives (SVG, no deps) ─────────────────────────────────────

interface TipState {
  x: number;
  y: number;
  lines: Array<{ color?: string; text: string }>;
}

function Tooltip({ tip }: { tip: TipState | null }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 border border-ds-outline-variant bg-ds-surface px-3 py-2 shadow-lg"
      style={{ left: Math.max(0, tip.x - 80), top: Math.max(0, tip.y - 8) }}
    >
      {tip.lines.map((l, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px] font-mono text-ds-on-surface whitespace-nowrap">
          {l.color && <span className="inline-block w-2 h-2 rounded-full" style={{ background: l.color }} />}
          {l.text}
        </div>
      ))}
    </div>
  );
}

interface LinePoint {
  t: number;
  y: number | null;
}

/** Multi-series line chart: 2px lines, crosshair hover, legend + end labels. */
function LineChart({
  series,
  height = 160,
  unit,
  fmt = (v: number) => String(Math.round(v)),
}: {
  series: Array<{ name: string; color: string; points: LinePoint[] }>;
  height?: number;
  unit: string;
  fmt?: (v: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [tip, setTip] = useState<TipState | null>(null);
  const [hoverT, setHoverT] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const all = series.flatMap((s) => s.points.filter((p) => p.y !== null));
  const ts = series.flatMap((s) => s.points.map((p) => p.t));
  const tMin = ts.length ? Math.min(...ts) : 0;
  const tMax = ts.length ? Math.max(...ts) : 1;
  const yMax = Math.max(...all.map((p) => p.y as number), 1) * 1.15;
  const W = Math.max(width, 280);
  const H = height;
  const x = (t: number) => PAD.l + ((t - tMin) / Math.max(tMax - tMin, 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);

  const path = (pts: LinePoint[]) => {
    let d = "";
    let pen = false;
    for (const p of pts) {
      if (p.y === null) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.y).toFixed(1)}`;
      pen = true;
    }
    return d;
  };

  const onMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const t = tMin + ((px - PAD.l) / Math.max(W - PAD.l - PAD.r, 1)) * (tMax - tMin);
      // nearest sample time across series
      let best: number | null = null;
      for (const p of series[0]?.points ?? []) {
        if (best === null || Math.abs(p.t - t) < Math.abs(best - t)) best = p.t;
      }
      if (best === null) return;
      setHoverT(best);
      const lines: TipState["lines"] = [{ text: new Date(best).toLocaleTimeString() }];
      for (const s of series) {
        const p = s.points.find((q) => q.t === best);
        lines.push({ color: s.color, text: `${s.name}: ${p?.y === null || p?.y === undefined ? "down" : fmt(p.y) + unit}` });
      }
      setTip({ x: px, y: 0, lines });
    },
    [series, tMin, tMax, W, unit, fmt],
  );

  return (
    <div ref={ref} className="relative">
      <Tooltip tip={tip} />
      <svg
        width={W}
        height={H}
        onMouseMove={onMove}
        onMouseLeave={() => {
          setTip(null);
          setHoverT(null);
        }}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(yMax * f)} y2={y(yMax * f)} className="stroke-ds-outline-variant" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(yMax * f) + 3} textAnchor="end" className="fill-ds-on-variant" fontSize="9" fontFamily="monospace">
              {fmt(yMax * f)}
            </text>
          </g>
        ))}
        {hoverT !== null && (
          <line x1={x(hoverT)} x2={x(hoverT)} y1={PAD.t} y2={H - PAD.b} className="stroke-ds-outline" strokeWidth="1" strokeDasharray="3,3" />
        )}
        {series.map((s) => (
          <path key={s.name} d={path(s.points)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
        ))}
        {/* direct labels at line ends */}
        {series.map((s) => {
          const last = [...s.points].reverse().find((p) => p.y !== null);
          if (!last) return null;
          return (
            <text key={s.name} x={W - PAD.r + 6} y={y(last.y as number) + 3} fontSize="10" fontFamily="monospace" fill={s.color}>
              {s.name}
            </text>
          );
        })}
      </svg>
      <div className="flex gap-4 mt-1">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-[11px] font-mono text-ds-on-variant">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Grouped bars for daily views/visitors — 2px gaps, hover tooltip, legend. */
function DailyBars({ daily }: { daily: ProjectAnalytics["daily"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [tip, setTip] = useState<TipState | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const H = 150;
  const PAD = { l: 34, r: 8, t: 8, b: 22 };
  const W = Math.max(width, 280);
  const max = Math.max(...daily.map((d) => d.views), 1) * 1.15;
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const groupW = (W - PAD.l - PAD.r) / Math.max(daily.length, 1);
  const barW = Math.max(3, Math.min(18, groupW / 2 - 3));

  return (
    <div ref={ref} className="relative">
      <Tooltip tip={tip} />
      <svg width={W} height={H} onMouseLeave={() => setTip(null)}>
        {[0.5, 1].map((f) => (
          <line key={f} x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} className="stroke-ds-outline-variant" strokeWidth="1" />
        ))}
        {daily.map((d, i) => {
          const gx = PAD.l + i * groupW + groupW / 2;
          const day = new Date(d.day);
          return (
            <g
              key={d.day}
              onMouseEnter={() =>
                setTip({
                  x: gx,
                  y: 0,
                  lines: [
                    { text: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }) },
                    { color: SERIES.a, text: `views: ${d.views}` },
                    { color: SERIES.b, text: `visitors: ${d.visitors}` },
                  ],
                })
              }
            >
              {/* oversized hit target */}
              <rect x={gx - groupW / 2} y={PAD.t} width={groupW} height={H - PAD.t - PAD.b} fill="transparent" />
              <rect x={gx - barW - 1} y={y(d.views)} width={barW} height={Math.max(1, y(0) - y(d.views))} rx="2" fill={SERIES.a} />
              <rect x={gx + 1} y={y(d.visitors)} width={barW} height={Math.max(1, y(0) - y(d.visitors))} rx="2" fill={SERIES.b} />
              {(i === 0 || i === daily.length - 1) && (
                <text x={gx} y={H - 8} textAnchor="middle" fontSize="9" fontFamily="monospace" className="fill-ds-on-variant">
                  {day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </text>
              )}
            </g>
          );
        })}
        <text x={PAD.l - 6} y={y(max) + 3} textAnchor="end" fontSize="9" fontFamily="monospace" className="fill-ds-on-variant">
          {Math.round(max)}
        </text>
      </svg>
      <div className="flex gap-4 mt-1">
        <span className="flex items-center gap-1.5 text-[11px] font-mono text-ds-on-variant">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: SERIES.a }} /> views
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-mono text-ds-on-variant">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: SERIES.b }} /> visitors
        </span>
      </div>
    </div>
  );
}

/** Ranked list with proportional fills — doubles as the table view. */
function RankList({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="divide-y divide-ds-surface-mid">
      {rows.map((r) => (
        <div key={r.label} className="relative px-3 py-2">
          <div className="absolute inset-y-1 left-0 opacity-[0.12]" style={{ width: `${(r.value / max) * 100}%`, background: SERIES.a }} />
          <div className="relative flex justify-between gap-3 text-[12px] font-mono">
            <span className="truncate text-ds-on-surface">{r.label}</span>
            <span className="text-ds-on-variant">{r.value}</span>
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="px-3 py-4 text-[12px] font-mono text-ds-on-variant">No data yet</p>}
    </div>
  );
}

// ─── Status pieces ────────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean | null }) {
  const cls = ok === null ? "bg-ds-outline" : ok ? "bg-green-500" : "bg-red-500";
  const label = ok === null ? "No data" : ok ? "Up" : "Down";
  return (
    <span className="flex items-center gap-2 text-[13px] font-mono">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />
      <span className={ok === false ? "text-red-600 dark:text-red-400" : "text-ds-on-surface"}>{label}</span>
    </span>
  );
}

function HealthCard({ title, icon, health }: { title: string; icon: React.ReactNode; health: TargetHealth }) {
  return (
    <div className="bg-ds-surface border border-ds-outline-variant p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-ds-on-variant">
          {icon}
          {title}
        </span>
        <StatusDot ok={health.current ? health.current.ok : null} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-[12px] font-mono">
        <div>
          <div className="text-ds-on-variant">Latency</div>
          <div className="text-[18px] text-ds-on-surface">{health.current?.latencyMs != null ? `${health.current.latencyMs}ms` : "—"}</div>
        </div>
        <div>
          <div className="text-ds-on-variant">Uptime 24h</div>
          <div className="text-[18px] text-ds-on-surface">{health.uptime24h != null ? `${health.uptime24h}%` : "—"}</div>
        </div>
      </div>
      {health.url && (
        <a
          href={health.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1 text-[11px] font-mono text-ds-on-variant hover:text-ds-on-surface truncate"
        >
          {health.url.replace(/^https?:\/\//, "")}
          <ExternalLink size={10} strokeWidth={1.5} className="shrink-0" />
        </a>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const params = useParams<{ repoId: string }>();
  const repoId = params.repoId;
  const [mon, setMon] = useState<ProjectMonitoring | null>(null);
  const [ana, setAna] = useState<ProjectAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    const loadMon = () =>
      getProjectMonitoring(repoId)
        .then((d) => alive && setMon(d))
        .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Failed to load"));
    const loadAna = () => getProjectAnalytics(repoId).then((d) => alive && setAna(d)).catch(() => undefined);
    loadMon();
    loadAna();
    const m = setInterval(loadMon, 30_000); // real-time: refresh health every 30s
    const a = setInterval(loadAna, 60_000);
    return () => {
      alive = false;
      clearInterval(m);
      clearInterval(a);
    };
  }, [repoId]);

  const latencySeries = useMemo(() => {
    if (!mon) return [];
    const toPoints = (t: TargetHealth) =>
      t.series.map((p) => ({ t: new Date(p.t).getTime(), y: p.ok ? p.latencyMs : null }));
    return [
      { name: "frontend", color: SERIES.a, points: toPoints(mon.frontend) },
      { name: "backend", color: SERIES.b, points: toPoints(mon.backend) },
    ].filter((s) => s.points.length > 0);
  }, [mon]);

  const cpuPoints = useMemo(
    () => (mon?.server?.cpu ?? []).map((v) => ({ t: new Date(v.timestamp).getTime(), y: v.value * 100 })),
    [mon],
  );
  const memPoints = useMemo(
    () => (mon?.server?.memory ?? []).map((v) => ({ t: new Date(v.timestamp).getTime(), y: v.value / (1024 * 1024) })),
    [mon],
  );

  function copySnippet() {
    if (!ana) return;
    void navigator.clipboard.writeText(ana.snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="max-w-[1100px] mx-auto px-6 py-8">
      <Link href="/dashboard/deployments" className="flex items-center gap-1.5 text-[12px] font-mono text-ds-on-variant hover:text-ds-on-surface mb-4">
        <ArrowLeft size={12} strokeWidth={1.5} /> Back to deployments
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-ds-on-surface tracking-[-0.02em]">{mon?.project.name ?? "Monitoring"}</h1>
          <p className="text-[13px] font-mono text-ds-on-variant">
            {mon?.project.fullName ?? repoId}
            {mon?.lastDeployment && ` · last deploy ${new Date(mon.lastDeployment.at ?? "").toLocaleString()}`}
          </p>
        </div>
        <span className="flex items-center gap-2 text-[11px] font-mono text-ds-on-variant border border-ds-outline-variant px-3 py-1.5">
          <Activity size={12} strokeWidth={1.5} className="text-green-500" /> live · 30s refresh
        </span>
      </div>

      {error && <p className="mb-6 text-[13px] font-mono text-red-600 dark:text-red-400">{error}</p>}

      {/* Latest attempt — failures and in-progress runs must be unmissable */}
      {mon?.latestAttempt?.status === "FAILED" && (
        <div className="mb-6 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={14} strokeWidth={1.5} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-mono font-semibold text-red-700 dark:text-red-300">
                Last deployment failed
                {mon.latestAttempt.isNewerThanLive && mon.lastDeployment
                  ? " — the site below is still running the previous successful deploy"
                  : ""}
              </p>
              {mon.latestAttempt.error && (
                <p className="mt-1 text-[12px] font-mono text-red-600 dark:text-red-400 break-words">
                  {mon.latestAttempt.error}
                </p>
              )}
              <Link
                href={`/dashboard/deployments/${mon.latestAttempt.id}`}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-mono text-red-700 dark:text-red-300 underline underline-offset-2"
              >
                View log, AI diagnosis &amp; retry →
              </Link>
            </div>
          </div>
        </div>
      )}
      {mon?.latestAttempt && !["FAILED", "COMPLETED", "CANCELLED"].includes(mon.latestAttempt.status) && (
        <div className="mb-6 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Loader2 size={14} strokeWidth={1.5} className="text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
            <p className="text-[13px] font-mono text-amber-700 dark:text-amber-300">
              A deployment is currently {mon.latestAttempt.status === "WAITING_FOR_ENV" ? "waiting for environment variables" : "in progress"} ·{" "}
              <Link href={`/dashboard/deployments/${mon.latestAttempt.id}`} className="underline underline-offset-2">
                view {mon.latestAttempt.status === "WAITING_FOR_ENV" ? "and provide them" : "progress"} →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Health cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {mon && <HealthCard title="Client · Frontend" icon={<Globe size={12} strokeWidth={1.5} />} health={mon.frontend} />}
        {mon && <HealthCard title="Server · Backend" icon={<Server size={12} strokeWidth={1.5} />} health={mon.backend} />}
      </div>

      {/* Latency */}
      <div className="bg-ds-surface border border-ds-outline-variant p-5 mb-6">
        <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-ds-on-variant mb-3">Response time · last 24h</h2>
        {latencySeries.length ? (
          <LineChart series={latencySeries} unit="ms" />
        ) : (
          <p className="text-[12px] font-mono text-ds-on-variant py-6">Collecting samples — first data appears within 5 minutes of a completed deployment.</p>
        )}
      </div>

      {/* Server metrics */}
      {mon?.server && (cpuPoints.length > 0 || memPoints.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-ds-surface border border-ds-outline-variant p-5">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-ds-on-variant mb-3">CPU · last hour</h2>
            <LineChart series={[{ name: "cpu", color: SERIES.b, points: cpuPoints }]} unit="%" height={120} fmt={(v) => v.toFixed(2)} />
          </div>
          <div className="bg-ds-surface border border-ds-outline-variant p-5">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-ds-on-variant mb-3">Memory · last hour</h2>
            <LineChart series={[{ name: "memory", color: SERIES.a, points: memPoints }]} unit="MB" height={120} />
          </div>
        </div>
      )}

      {/* Analytics */}
      <div className="bg-ds-surface border border-ds-outline-variant p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-ds-on-variant">Product analytics · last {ana?.days ?? 7} days</h2>
          {ana && (
            <span className="text-[12px] font-mono text-ds-on-variant">
              {ana.totals.views} views · {ana.totals.visitors} visitors
            </span>
          )}
        </div>

        {ana && ana.totals.views > 0 ? (
          <>
            <DailyBars daily={ana.daily} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <div>
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-ds-on-variant mb-2">Top pages</h3>
                <div className="border border-ds-outline-variant">
                  <RankList rows={ana.topPaths.map((p) => ({ label: p.path, value: p.views }))} />
                </div>
              </div>
              <div>
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-ds-on-variant mb-2">Top referrers</h3>
                <div className="border border-ds-outline-variant">
                  <RankList rows={ana.topReferrers.map((r) => ({ label: r.referrer, value: r.views }))} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div>
            <p className="text-[13px] text-ds-on-variant mb-3">
              No analytics yet. Add this one-line snippet to your deployed site (e.g. in your layout&apos;s{" "}
              <code className="text-[12px]">&lt;head&gt;</code>) to start measuring pageviews, visitors, top pages and referrers — privacy-first, no
              cookies, no personal data stored:
            </p>
            {ana && (
              <div className="flex items-stretch gap-2">
                <pre className="flex-1 overflow-x-auto bg-[#0A0A0A] text-[#E6EDF3] text-[11.5px] font-mono px-4 py-3">{ana.snippet}</pre>
                <button
                  onClick={copySnippet}
                  className="flex items-center gap-1.5 px-4 text-[12px] font-mono border border-ds-outline-variant text-ds-on-variant hover:text-ds-on-surface transition-colors"
                >
                  {copied ? <Check size={13} strokeWidth={1.5} className="text-green-500" /> : <Copy size={13} strokeWidth={1.5} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
