"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_VERSION, COPYRIGHT_YEARS } from "@/lib/version";
import { Activity,
  TrendingUp,
  Server,
  Zap,
  CheckCircle2,
  ExternalLink,
  GitBranch,
} from "lucide-react";
import { useDeployments, useDashboardStats } from "@/hooks/useDashboardData";
import { DeploymentStatusBadge } from "@/components/dashboard/DeploymentStatusBadge";
import { SkeletonStatCard, SkeletonRow } from "@/components/dashboard/SkeletonCard";
import { formatRelativeTime, formatDuration } from "@/lib/format";
import type { Deployment } from "@/types/dashboard";
import { isActiveStatus } from "@/types/dashboard";

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: string;
  meta: string;
  metaClass?: string;
  icon: React.ReactNode;
}

function KpiTile({ label, value, meta, metaClass = "text-ds-on-variant", icon }: KpiTileProps) {
  return (
    <div className="bg-ds-surface border border-ds-outline-variant p-6 hover:border-ds-primary transition-colors">
      <p className="text-[11px] font-mono font-medium text-ds-on-variant uppercase tracking-[0.08em] mb-1">
        {label}
      </p>
      <h3 className="text-[32px] font-bold text-ds-on-surface tracking-[-0.04em] leading-none mb-4">
        {value}
      </h3>
      <div className={`flex items-center gap-1.5 text-[12px] font-mono ${metaClass}`}>
        {icon}
        {meta}
      </div>
    </div>
  );
}

// ─── Derive projects from latest deployment per repo ──────────────────────────

function deriveProjects(deps: Deployment[]) {
  const map = new Map<string, Deployment>();
  for (const d of deps) {
    const existing = map.get(d.repositoryName);
    if (!existing || new Date(d.createdAt) > new Date(existing.createdAt)) {
      map.set(d.repositoryName, d);
    }
  }
  return Array.from(map.values());
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ dep }: { dep: Deployment }) {
  const stack = [dep.detectedStack?.frontend, dep.detectedStack?.backend]
    .filter(Boolean)
    .join(" + ");
  const isBuilding = isActiveStatus(dep.status);
  const isFailed = dep.status === "FAILED";

  const router = useRouter();
  return (
    <div
      onClick={() => router.push(`/dashboard/deployments/${dep.id}?from=overview`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/dashboard/deployments/${dep.id}?from=overview`)}
      className="bg-ds-surface border border-ds-outline-variant p-6 hover:shadow-lg transition-shadow relative overflow-hidden cursor-pointer"
    >
      <div
        className={`absolute top-0 inset-x-0 h-[2px] ${
          dep.status === "COMPLETED"
            ? "bg-green-500"
            : isBuilding
            ? "bg-ds-on-variant"
            : isFailed
            ? "bg-red-500"
            : "bg-ds-outline-variant"
        }`}
      />
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-ds-surface-mid border border-ds-outline-variant flex items-center justify-center shrink-0">
            <GitBranch size={14} strokeWidth={1.5} className="text-ds-on-variant" />
          </div>
          <h4 className="text-[15px] font-semibold text-ds-on-surface leading-tight">
            {dep.repositoryName}
          </h4>
        </div>
        <DeploymentStatusBadge status={dep.status} />
      </div>

      <p className="text-[13px] text-ds-on-variant mb-6 leading-relaxed">
        {stack || "Stack auto-detected on deploy"}
      </p>

      <div className="flex flex-col gap-2 text-[12px] font-mono">
        {dep.status === "COMPLETED" && (
          <>
            {dep.frontendUrl && (
              <div className="flex items-center justify-between">
                <span className="text-ds-outline">Frontend</span>
                <a
                  href={dep.frontendUrl}
                  onClick={(e) => e.stopPropagation()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-ds-on-surface hover:underline truncate max-w-[160px]"
                >
                  <ExternalLink size={10} strokeWidth={1.5} className="shrink-0" />
                  {dep.frontendUrl.replace("https://", "")}
                </a>
              </div>
            )}
            {dep.backendUrl && (
              <div className="flex items-center justify-between">
                <span className="text-ds-outline">Backend</span>
                <a
                  href={dep.backendUrl}
                  onClick={(e) => e.stopPropagation()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-ds-on-surface hover:underline truncate max-w-[160px]"
                >
                  <ExternalLink size={10} strokeWidth={1.5} className="shrink-0" />
                  {dep.backendUrl.replace("https://", "")}
                </a>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-ds-outline-variant mt-1">
              <span className="text-ds-outline">Last deploy</span>
              <span className="text-ds-on-surface">{formatRelativeTime(dep.updatedAt)}</span>
            </div>
            <a
              href={`/dashboard/monitoring/${dep.repositoryId}?from=overview`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-ds-primary hover:opacity-80 transition-opacity pt-1"
            >
              <Activity size={11} strokeWidth={1.5} />
              Monitoring &amp; analytics
            </a>
          </>
        )}
        {isBuilding && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-ds-outline">Step</span>
              <span className="text-ds-on-surface">Deploying…</span>
            </div>
            <div className="w-full bg-ds-surface-high h-1 mt-1">
              <div className="bg-ds-primary h-full w-2/3" />
            </div>
          </>
        )}
        {isFailed && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-ds-outline">Error</span>
              <span className="text-red-500">Deploy failed</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ds-outline">Time</span>
              <span className="text-ds-on-surface">{formatRelativeTime(dep.updatedAt)}</span>
            </div>
            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 pt-1">
              View log, AI diagnosis &amp; retry →
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Activity Table Row ───────────────────────────────────────────────────────

function ActivityRow({ dep }: { dep: Deployment }) {
  return (
    <tr className="hover:bg-ds-surface-low transition-colors">
      <td className="px-6 py-4 font-mono text-[13px] text-ds-on-surface">
        {dep.id.replace("dep_", "dpl_")}
      </td>
      <td className="px-6 py-4 text-[14px] font-medium text-ds-on-surface">
        {dep.repositoryName}
      </td>
      <td className="px-6 py-4 font-mono text-[13px] text-ds-on-variant">
        {dep.branch}
      </td>
      <td className="px-6 py-4">
        <DeploymentStatusBadge status={dep.status} />
      </td>
      <td className="px-6 py-4 text-[13px] text-ds-on-variant">
        {dep.duration
          ? `${formatRelativeTime(dep.createdAt)} · ${formatDuration(dep.duration)}`
          : formatRelativeTime(dep.createdAt)}
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STAGGER = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.05 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: stats, loading: statsLoading } = useDashboardStats();
  const { data: deployments, loading: depsLoading } = useDeployments();

  const projects = useMemo(() => deriveProjects(deployments ?? []), [deployments]);

  const avgDuration = useMemo(() => {
    const completed = (deployments ?? []).filter((d) => d.duration !== null);
    if (!completed.length) return "—";
    const avg = completed.reduce((s, d) => s + (d.duration ?? 0), 0) / completed.length;
    return formatDuration(Math.round(avg));
  }, [deployments]);

  return (
    <div className="p-6 space-y-6">
      {/* KPI Strip */}
      <motion.section
        variants={STAGGER.container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
      >
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <motion.div key={i} variants={STAGGER.item}>
              <SkeletonStatCard />
            </motion.div>
          ))
        ) : (
          <>
            <motion.div variants={STAGGER.item}>
              <KpiTile
                label="Total Projects"
                value={String(stats?.connectedRepos ?? 0)}
                meta="+2 this month"
                metaClass="text-green-600 dark:text-green-400"
                icon={<TrendingUp size={13} strokeWidth={1.5} />}
              />
            </motion.div>
            <motion.div variants={STAGGER.item}>
              <Link href="/dashboard/active" className="block">
                <KpiTile
                  label="Active Deployments"
                  value={String(stats?.activeDeployments ?? 0)}
                  meta="Watch them live →"
                  icon={<Server size={13} strokeWidth={1.5} />}
                />
              </Link>
            </motion.div>
            <motion.div variants={STAGGER.item}>
              <KpiTile
                label="Avg Deploy Time"
                value={avgDuration}
                meta="Auto-detected stack"
                metaClass="text-green-600 dark:text-green-400"
                icon={<Zap size={13} strokeWidth={1.5} />}
              />
            </motion.div>
            <motion.div variants={STAGGER.item}>
              <KpiTile
                label="System Uptime"
                value="99.99%"
                meta="All systems operational"
                metaClass="text-blue-600 dark:text-blue-400"
                icon={<CheckCircle2 size={13} strokeWidth={1.5} />}
              />
            </motion.div>
          </>
        )}
      </motion.section>

      {/* Projects header */}
      <section className="flex items-center justify-between">
        <h2 className="text-[22px] font-bold text-ds-on-surface tracking-[-0.02em]">
          Projects ({projects.length})
        </h2>
        <button
          onClick={() => router.push("/dashboard/repositories")}
          className="px-4 py-2 border border-ds-outline-variant hover:border-ds-primary text-[13px] font-mono font-medium text-ds-on-surface transition-colors"
        >
          New Deployment
        </button>
      </section>

      {/* Projects Grid */}
      {depsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-ds-surface border border-ds-outline-variant p-12 text-center">
          <p className="text-[14px] text-ds-on-variant">
            No projects yet.{" "}
            <button
              onClick={() => router.push("/dashboard/repositories")}
              className="text-ds-on-surface font-medium underline underline-offset-2"
            >
              Import a repository
            </button>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <motion.section
          variants={STAGGER.container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {projects.map((dep) => (
            <motion.div key={dep.id} variants={STAGGER.item}>
              <ProjectCard dep={dep} />
            </motion.div>
          ))}
        </motion.section>
      )}

      {/* Recent Activity */}
      <section className="space-y-4">
        <h2 className="text-[22px] font-bold text-ds-on-surface tracking-[-0.02em]">
          Recent Activity
        </h2>
        <div className="w-full overflow-x-auto border border-ds-outline-variant bg-ds-surface">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ds-bg border-b border-ds-outline-variant">
                {["Deployment ID", "Project", "Branch", "Status", "Time"].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-4 text-[11px] font-mono font-medium text-ds-on-variant uppercase tracking-[0.08em]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ds-surface-mid">
              {depsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="p-0"><SkeletonRow /></td></tr>
                ))
              ) : (
                (deployments ?? []).slice(0, 8).map((dep) => (
                  <ActivityRow key={dep.id} dep={dep} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ds-outline-variant grid grid-cols-1 md:grid-cols-4 gap-4 bg-ds-surface px-6 py-6 -mx-6">
        <div>
          <p className="text-[11px] font-mono text-ds-on-variant mb-2">Status</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-[14px] font-medium text-ds-on-surface">Operational</span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-mono text-ds-on-variant mb-2">Region</p>
          <p className="text-[14px] font-medium text-ds-on-surface">Global (Vercel + Render)</p>
        </div>
        <div>
          <p className="text-[11px] font-mono text-ds-on-variant mb-2">Frameworks</p>
          <Link
            href="/docs/getting-started/introduction"
            className="text-[14px] font-medium text-ds-on-surface hover:text-ds-on-variant transition-colors"
          >
            11 frontend · 6 backend
          </Link>
        </div>
        <div className="md:text-right md:flex md:flex-col md:items-end justify-end">
          <p suppressHydrationWarning className="text-[11px] font-mono text-ds-on-variant">
            © {COPYRIGHT_YEARS} deplo.ai
          </p>
          <p className="text-[10px] font-mono text-ds-on-variant">v{APP_VERSION}-beta</p>
        </div>
      </footer>
    </div>
  );
}
