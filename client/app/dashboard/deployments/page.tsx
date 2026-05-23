"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { RefreshCw, GitBranch, Clock, ExternalLink, Rocket, Unplug, KeyRound } from "lucide-react";
import { useDeployments } from "@/hooks/useDashboardData";
import { DeploymentStatusBadge } from "@/components/dashboard/DeploymentStatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SkeletonRow } from "@/components/dashboard/SkeletonCard";
import { formatRelativeTime, formatDuration } from "@/lib/format";
import type { Deployment, DeploymentStatus } from "@/types/dashboard";
import { isActiveStatus } from "@/types/dashboard";

function classifyError(err: string | null) {
  if (!err) return "unknown";
  const msg = err.toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("econnrefused"))
    return "offline";
  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("forbidden"))
    return "auth";
  return "unknown";
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

type FilterTab = "all" | "active" | "completed" | "failed";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

function filterDeployments(deps: Deployment[], tab: FilterTab): Deployment[] {
  switch (tab) {
    case "active":
      return deps.filter((d) => isActiveStatus(d.status));
    case "completed":
      return deps.filter((d) => d.status === "COMPLETED");
    case "failed":
      return deps.filter((d) => d.status === "FAILED");
    default:
      return deps;
  }
}

function getEnvironment(branch: string) {
  const isProd = branch === "main" || branch === "master";
  return isProd
    ? { label: "Production", dotClass: "bg-green-500" }
    : { label: "Preview", dotClass: "bg-amber-400" };
}

// ─── Deployment Row ───────────────────────────────────────────────────────────

function DeploymentRow({ dep }: { dep: Deployment }) {
  const router = useRouter();
  const active = isActiveStatus(dep.status);
  const env = getEnvironment(dep.branch);
  const url = dep.frontendUrl ?? dep.backendUrl;
  const stackStr = [dep.detectedStack?.frontend, dep.detectedStack?.backend]
    .filter(Boolean)
    .join(" · ");

  const handleRowClick = useCallback(() => {
    router.push(`/dashboard/deployments/${dep.id}`);
  }, [router, dep.id]);

  const stopProp = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={handleRowClick}
      className="group flex items-center gap-4 px-6 py-4 border-b border-ds-outline-variant last:border-0 hover:bg-ds-surface-low transition-colors cursor-pointer"
    >
      {/* Status */}
      <div className="w-22 shrink-0">
        <DeploymentStatusBadge status={dep.status} />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-0.5">
          <span className="text-[14px] font-medium text-ds-on-surface">
            {dep.repositoryName}
          </span>
          <span className="flex items-center gap-1 text-[12px] font-mono text-ds-on-variant">
            <GitBranch size={10} strokeWidth={1.5} />
            {dep.branch}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${env.dotClass}`} />
            <span className="text-[11px] text-ds-on-variant">{env.label}</span>
          </span>
        </div>
        {stackStr && (
          <p className="text-[12px] font-mono text-ds-outline">{stackStr}</p>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stopProp}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-ds-primary hover:underline mt-0.5"
          >
            <ExternalLink size={10} strokeWidth={1.5} />
            {url.replace(/^https?:\/\//, "")}
          </a>
        )}
        {active && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-px bg-ds-outline-variant overflow-hidden">
              <div className="h-full bg-ds-primary animate-pulse" style={{ width: "60%" }} />
            </div>
            <span className="text-[11px] font-mono text-ds-on-variant shrink-0">
              in progress
            </span>
          </div>
        )}
      </div>

      {/* Right meta */}
      <div className="shrink-0 text-right">
        <div className="flex items-center gap-1.5 text-[12px] font-mono text-ds-on-variant justify-end">
          <Clock size={11} strokeWidth={1.5} />
          {formatRelativeTime(dep.createdAt)}
        </div>
        {dep.duration !== null && (
          <div className="text-[11px] font-mono text-ds-on-variant mt-0.5">
            {formatDuration(dep.duration)}
          </div>
        )}
        <div className="flex items-center gap-1 text-[11px] font-mono text-ds-on-variant mt-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          View details
          <ExternalLink size={9} strokeWidth={1.5} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeploymentsPage() {
  const router = useRouter();
  const { data, loading, error, refetch } = useDeployments();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered = useMemo(
    () => filterDeployments(data ?? [], activeTab),
    [data, activeTab]
  );

  const tabCounts = useMemo(() => {
    const deps = data ?? [];
    return {
      all: deps.length,
      active: deps.filter((d) => isActiveStatus(d.status)).length,
      completed: deps.filter((d) => d.status === "COMPLETED").length,
      failed: deps.filter((d) => d.status === "FAILED").length,
    };
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="max-w-4xl mx-auto px-6 py-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-ds-on-surface tracking-[-0.02em]">
            Deployment History
          </h1>
          <p className="text-[14px] text-ds-on-variant font-mono mt-1">
            {!loading && data ? `${data.length} total` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-mono text-ds-on-variant border border-ds-outline-variant hover:border-ds-primary transition-colors"
          >
            <RefreshCw size={12} strokeWidth={1.5} />
            Refresh
          </button>
          <button
            onClick={() => router.push("/dashboard/repositories")}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-mono font-semibold text-ds-on-primary bg-ds-primary hover:opacity-90 transition-opacity"
          >
            <Rocket size={12} strokeWidth={1.5} />
            New Deployment
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0 border-b border-ds-outline-variant mb-6">
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key;
          const count = tabCounts[key as FilterTab];
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative px-4 py-2.5 text-[13px] font-mono font-medium transition-colors ${
                isActive ? "text-ds-on-surface" : "text-ds-on-variant hover:text-ds-on-surface"
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`ml-1.5 text-[11px] font-mono ${
                    isActive ? "text-ds-on-variant" : "text-ds-outline"
                  }`}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="tab-line"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-ds-primary"
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="border border-ds-outline-variant bg-ds-surface">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : error ? (
          (() => {
            const kind = classifyError(error);
            if (kind === "offline")
              return (
                <EmptyState
                  icon={<Unplug size={18} strokeWidth={1.5} />}
                  title="Backend not reachable"
                  description="The deplo.ai server isn't running yet. Once the backend is live, your deployment history will appear here automatically."
                  action={{ label: "Retry", onClick: refetch }}
                />
              );
            if (kind === "auth")
              return (
                <EmptyState
                  icon={<KeyRound size={18} strokeWidth={1.5} />}
                  title="Session expired"
                  description="Your GitHub session has expired. Sign in again to see your deployment history."
                  action={{ label: "Retry", onClick: refetch }}
                />
              );
            return (
              <EmptyState
                icon={<Rocket size={18} strokeWidth={1.5} />}
                title="Couldn't load deployments"
                description="Something went wrong. Try refreshing in a moment."
                action={{ label: "Retry", onClick: refetch }}
              />
            );
          })()
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Rocket size={18} strokeWidth={1.5} />}
            title={activeTab === "all" ? "No deployments yet" : `No ${activeTab} deployments`}
            description={
              activeTab === "all"
                ? "Import a repository from Projects to trigger your first deployment. deplo.ai handles the rest."
                : `You don't have any ${activeTab} deployments right now.`
            }
            action={
              activeTab === "all"
                ? { label: "Import a Repository", onClick: () => router.push("/dashboard/repositories") }
                : undefined
            }
          />
        ) : (
          filtered.map((dep) => <DeploymentRow key={dep.id} dep={dep} />)
        )}
      </div>
    </motion.div>
  );
}
