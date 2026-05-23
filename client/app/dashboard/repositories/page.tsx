"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search,
  Folder,
  Terminal,
  Globe,
  Database,
  Lock,
  Filter,
  Loader2,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  ArrowRight,
  Unplug,
  KeyRound,
} from "lucide-react";
import { useRepositories } from "@/hooks/useDashboardData";
import { initiateDeployment } from "@/lib/dashboard-api";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SkeletonRepoCard } from "@/components/dashboard/SkeletonCard";
import { formatRelativeTime } from "@/lib/format";
import type { Repository } from "@/types/dashboard";

function classifyError(err: string | null) {
  if (!err) return "unknown";
  const msg = err.toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("econnrefused"))
    return "offline";
  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("forbidden"))
    return "auth";
  return "unknown";
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ active }: { active: 1 | 2 | 3 }) {
  const steps = ["Import Project", "Configure", "Deploy"] as const;
  return (
    <div className="flex items-center gap-4 mb-6">
      {steps.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const isActive = step === active;
        return (
          <div key={label} className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono font-medium px-2 py-0.5 ${
                  isActive
                    ? "bg-ds-primary text-ds-on-primary"
                    : "border border-ds-outline-variant text-ds-on-variant"
                }`}
              >
                0{step}
              </span>
              <span
                className={`text-[12px] font-mono font-medium ${
                  isActive ? "text-ds-on-surface font-bold" : "text-ds-on-variant"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="h-px w-12 bg-ds-outline-variant" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Language tag ─────────────────────────────────────────────────────────────

function LanguageTag({ language }: { language: string | null }) {
  if (!language) return null;
  return (
    <span className="hidden md:inline text-[11px] font-mono text-ds-on-variant border border-ds-outline-variant px-2 py-0.5">
      {language}
    </span>
  );
}

function RepoIcon({ language }: { language: string | null }) {
  const lang = language?.toLowerCase() ?? "";
  if (lang === "rust") return <Terminal size={18} strokeWidth={1.5} className="text-ds-on-variant" />;
  if (lang === "python") return <Database size={18} strokeWidth={1.5} className="text-ds-on-variant" />;
  if (lang.includes("next") || lang === "typescript" || lang === "javascript")
    return <Globe size={18} strokeWidth={1.5} className="text-ds-on-variant" />;
  return <Folder size={18} strokeWidth={1.5} className="text-ds-on-variant" />;
}

// ─── Repo Row ─────────────────────────────────────────────────────────────────

type ImportState = "idle" | "importing" | "done";

interface RepoRowProps {
  repo: Repository;
  importState: ImportState;
  onImport: (repo: Repository) => void;
}

function RepoRow({ repo, importState, onImport }: RepoRowProps) {
  return (
    <div className="group bg-ds-surface p-4 flex items-center justify-between hover:bg-ds-surface-low transition-colors border-b border-ds-outline-variant last:border-0">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 flex items-center justify-center border border-ds-outline-variant bg-ds-surface-mid shrink-0">
          <RepoIcon language={repo.language} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-mono font-bold text-ds-on-surface group-hover:underline">
              {repo.fullName}
            </h3>
            {repo.isPrivate && (
              <Lock size={10} strokeWidth={1.5} className="text-ds-on-variant" />
            )}
          </div>
          <p className="text-[12px] text-ds-on-variant">
            Updated {formatRelativeTime(repo.updatedAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <LanguageTag language={repo.language} />
        {importState === "idle" && (
          <button
            onClick={() => onImport(repo)}
            className="bg-ds-primary text-ds-on-primary text-[13px] font-mono font-medium px-6 py-2 hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            Import
          </button>
        )}
        {importState === "importing" && (
          <div className="flex items-center gap-2 px-6 py-2 text-[13px] font-mono text-ds-on-variant border border-ds-outline-variant">
            <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
            Linking…
          </div>
        )}
        {importState === "done" && (
          <div className="flex items-center gap-2 px-6 py-2 text-[13px] font-mono text-green-700 bg-green-50 border border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800">
            <CheckCircle2 size={12} strokeWidth={1.5} />
            Initiated
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RepositoriesPage() {
  const router = useRouter();
  const { data: repos, loading, error, refetch } = useRepositories();
  const [query, setQuery] = useState("");
  const [importStates, setImportStates] = useState<Record<string, ImportState>>({});

  const filtered = useMemo(() => {
    if (!repos) return [];
    if (!query.trim()) return repos;
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.fullName.toLowerCase().includes(query.toLowerCase())
    );
  }, [repos, query]);

  async function handleImport(repo: Repository) {
    setImportStates((s) => ({ ...s, [repo.id]: "importing" }));
    try {
      const { deploymentId } = await initiateDeployment(repo.id);
      setImportStates((s) => ({ ...s, [repo.id]: "done" }));
      setTimeout(() => router.push(`/dashboard/deployments/${deploymentId}`), 1000);
    } catch {
      setImportStates((s) => ({ ...s, [repo.id]: "idle" }));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="max-w-[1200px] mx-auto px-6 py-8"
    >
      <Stepper active={1} />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Repo Selection */}
        <div className="md:col-span-8 bg-ds-surface border border-ds-outline-variant p-6 shadow-[4px_4px_0px_0px_rgba(207,196,197,0.4)] dark:shadow-[4px_4px_0px_0px_rgba(42,42,64,0.8)]">
          <div className="mb-6">
            <h1 className="text-[28px] font-bold text-ds-on-surface tracking-[-0.02em] mb-1">
              Import Project
            </h1>
            <p className="text-[15px] text-ds-on-variant">
              Select a repository from your GitHub account to get started.
            </p>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search
                size={16}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-on-variant pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search repositories..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-ds-surface border border-ds-outline-variant pl-10 pr-4 py-2.5 text-[14px] font-mono text-ds-on-surface placeholder:text-ds-on-variant focus:border-ds-primary outline-none transition-colors"
              />
            </div>
            <button className="flex items-center gap-2 border border-ds-outline-variant px-4 py-2 hover:bg-ds-surface-mid transition-colors text-[13px] font-mono font-medium text-ds-on-variant">
              <Filter size={14} strokeWidth={1.5} />
              All Repositories
            </button>
          </div>

          {/* Repo list */}
          <div className="border border-ds-outline-variant divide-y-0">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRepoCard key={i} />)
            ) : error ? (
              (() => {
                const kind = classifyError(error);
                if (kind === "offline")
                  return (
                    <EmptyState
                      icon={<Unplug size={18} strokeWidth={1.5} />}
                      title="Backend not reachable"
                      description="The deplo.ai server isn't running yet. Start the backend locally or deploy the server, then come back to import your first project."
                      action={{ label: "Retry", onClick: refetch }}
                    />
                  );
                if (kind === "auth")
                  return (
                    <EmptyState
                      icon={<KeyRound size={18} strokeWidth={1.5} />}
                      title="GitHub connection required"
                      description="Your session has expired or GitHub access was revoked. Sign in again to reconnect your repositories."
                      action={{ label: "Retry", onClick: refetch }}
                    />
                  );
                return (
                  <EmptyState
                    icon={<Search size={18} strokeWidth={1.5} />}
                    title="Couldn't load repositories"
                    description="Something went wrong on our end. Try again in a moment."
                    action={{ label: "Retry", onClick: refetch }}
                  />
                );
              })()
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={query ? <Search size={18} strokeWidth={1.5} /> : <KeyRound size={18} strokeWidth={1.5} />}
                title={query ? "No repositories match" : "No repositories yet"}
                description={
                  query
                    ? `No repositories found for "${query}". Try a different name.`
                    : "Connect a GitHub repository to get started. deplo.ai will auto-detect your stack and deploy it in minutes."
                }
              />
            ) : (
              filtered.map((repo) => (
                <RepoRow
                  key={repo.id}
                  repo={repo}
                  importState={importStates[repo.id] ?? "idle"}
                  onImport={handleImport}
                />
              ))
            )}
          </div>

          {/* Load more */}
          {!loading && filtered.length > 0 && (
            <div className="mt-6 flex justify-center">
              <button className="text-[13px] font-mono font-medium border border-ds-outline-variant px-8 py-2 hover:bg-ds-surface-mid transition-colors text-ds-on-variant">
                Load More Repositories
              </button>
            </div>
          )}
        </div>

        {/* Right: Guide cards */}
        <div className="md:col-span-4 space-y-6">
          {/* Help card */}
          <div className="bg-ds-surface-low border border-ds-outline-variant p-6">
            <h4 className="text-[13px] font-mono font-bold text-ds-on-surface mb-3 flex items-center gap-2">
              <HelpCircle size={16} strokeWidth={1.5} />
              Can&apos;t find your repo?
            </h4>
            <p className="text-[13px] text-ds-on-variant mb-4 leading-relaxed">
              Make sure you have granted deplo.ai access to your repositories in
              your GitHub settings.
            </p>
            <a
              href="https://github.com/settings/installations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-mono font-bold text-ds-on-surface hover:underline inline-flex items-center gap-1"
            >
              Configure GitHub App
              <ExternalLink size={12} strokeWidth={1.5} />
            </a>
          </div>

          {/* Template card */}
          <div className="border border-ds-outline-variant p-6 group hover:border-ds-primary transition-colors cursor-pointer bg-ds-surface">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-[13px] font-mono font-bold text-ds-on-surface">
                Start with a Template
              </h4>
              <ArrowRight
                size={16}
                strokeWidth={1.5}
                className="text-ds-on-variant group-hover:text-ds-on-surface transition-colors"
              />
            </div>
            <p className="text-[13px] text-ds-on-variant leading-relaxed">
              Don&apos;t have a repository ready? Launch a pre-configured
              starter in seconds.
            </p>
          </div>

          {/* CLI snippet */}
          <div className="bg-ds-surface-highest border border-ds-outline-variant p-6">
            <label className="text-[11px] font-mono font-medium text-ds-on-variant uppercase tracking-[0.08em] block mb-3">
              CLI Import
            </label>
            <div className="bg-ds-primary text-ds-on-primary p-4 font-mono text-[12px] overflow-x-auto leading-relaxed">
              <span className="opacity-50">$</span> deplo import &lt;url&gt;
              <br />
              <span className="opacity-50"># Fetching metadata...</span>
              <br />
              <span className="opacity-50"># Link established.</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
