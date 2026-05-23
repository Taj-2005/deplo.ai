"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  CheckCheck,
  Clock,
  GitBranch,
  Layers,
  Terminal,
  AlertCircle,
  RefreshCw,
  XCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info,
} from "lucide-react";
import { DeploymentStatusBadge } from "@/components/dashboard/DeploymentStatusBadge";
import {
  fetchDeployment,
  cancelDeployment,
  provideEnvVariables,
} from "@/lib/dashboard-api";
import { formatRelativeTime, formatDuration } from "@/lib/format";
import { isActiveStatus } from "@/types/dashboard";
import type { DeploymentDetail } from "@/types/dashboard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);
  return (
    <button
      onClick={copy}
      className="p-1 text-ds-on-variant hover:text-ds-on-surface transition-colors"
      title="Copy"
    >
      {copied ? <CheckCheck size={12} strokeWidth={1.5} /> : <Copy size={12} strokeWidth={1.5} />}
    </button>
  );
}

function UrlCard({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border border-ds-outline-variant bg-ds-surface-low">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-mono text-ds-on-variant uppercase tracking-[0.08em] mb-0.5">
          {label}
        </p>
        <p className="text-[13px] font-mono text-ds-primary truncate">{url.replace(/^https?:\/\//, "")}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <CopyButton value={url} />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-ds-on-variant hover:text-ds-on-surface transition-colors"
          title="Open"
        >
          <ExternalLink size={12} strokeWidth={1.5} />
        </a>
      </div>
    </div>
  );
}

// ─── Env Var Form ─────────────────────────────────────────────────────────────

interface EnvVar { key: string; isRequired: boolean }

function EnvVarForm({
  dep,
  onSubmitted,
}: {
  dep: DeploymentDetail;
  onSubmitted: () => void;
}) {
  const allVars = dep.envVariables;
  const required = allVars.filter((v) => v.isRequired);
  const optional = allVars.filter((v) => !v.isRequired);
  const hasBackendAndFrontend =
    dep.detectedStack?.backend && dep.detectedStack?.frontend;

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(allVars.map((v) => [v.key, ""])),
  );
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState("");

  const toggleReveal = (key: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  function applyPaste() {
    const parsed: Record<string, string> = {};
    for (const line of pasteContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key) parsed[key] = value;
    }
    setValues((prev) => ({ ...prev, ...parsed }));
    setPasteOpen(false);
    setPasteContent("");
  }

  async function handleSubmit() {
    const missing = new Set(
      required.filter((v) => !values[v.key]?.trim()).map((v) => v.key),
    );
    if (missing.size > 0) {
      setErrors(missing);
      return;
    }
    setErrors(new Set());
    setSubmitError(null);
    setSubmitting(true);
    try {
      await provideEnvVariables(
        dep.id,
        Object.entries(values)
          .filter(([, v]) => v.trim() !== "")
          .map(([key, value]) => ({ key, value })),
      );
      onSubmitted();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-mono font-medium text-ds-on-variant uppercase tracking-[0.08em]">
          Environment Variables Required
        </h2>
        <button
          onClick={() => setPasteOpen((o) => !o)}
          className="flex items-center gap-1 text-[11px] font-mono text-ds-on-variant hover:text-ds-on-surface border border-ds-outline-variant px-2.5 py-1 transition-colors"
        >
          {pasteOpen ? <ChevronUp size={10} strokeWidth={1.5} /> : <ChevronDown size={10} strokeWidth={1.5} />}
          Paste .env file
        </button>
      </div>

      {/* Paste area */}
      <AnimatePresence>
        {pasteOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mb-4"
          >
            <div className="border border-ds-outline-variant bg-ds-surface-highest p-3">
              <p className="text-[10px] font-mono text-ds-on-variant mb-2">
                Paste the contents of your .env file — matching keys will be filled automatically.
              </p>
              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder={"DATABASE_URL=postgresql://...\nJWT_SECRET=mysecret"}
                rows={5}
                className="w-full bg-transparent font-mono text-[12px] text-ds-on-surface resize-none outline-none placeholder:text-ds-on-variant/40"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={applyPaste}
                  disabled={!pasteContent.trim()}
                  className="text-[11px] font-mono border border-ds-outline-variant px-3 py-1.5 hover:bg-ds-surface-low transition-colors disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fields */}
      <div className="border border-ds-outline-variant divide-y divide-ds-outline-variant">
        {/* Required vars */}
        {required.map((v) => (
          <EnvField
            key={v.key}
            envVar={v}
            value={values[v.key] ?? ""}
            onChange={(val) => {
              setValues((p) => ({ ...p, [v.key]: val }));
              if (val.trim()) setErrors((p) => { const n = new Set(p); n.delete(v.key); return n; });
            }}
            revealed={revealed.has(v.key)}
            onToggleReveal={() => toggleReveal(v.key)}
            hasError={errors.has(v.key)}
          />
        ))}

        {/* Optional vars */}
        {optional.map((v) => (
          <EnvField
            key={v.key}
            envVar={v}
            value={values[v.key] ?? ""}
            onChange={(val) => setValues((p) => ({ ...p, [v.key]: val }))}
            revealed={revealed.has(v.key)}
            onToggleReveal={() => toggleReveal(v.key)}
            hasError={false}
          />
        ))}
      </div>

      {/* Auto-inject notice */}
      {hasBackendAndFrontend && (
        <div className="flex items-start gap-2 mt-3 px-3 py-2.5 bg-ds-surface-low border border-ds-outline-variant">
          <Info size={12} strokeWidth={1.5} className="text-ds-primary shrink-0 mt-0.5" />
          <p className="text-[11px] font-mono text-ds-on-variant leading-relaxed">
            Your backend URL will be automatically injected as{" "}
            <code className="text-ds-primary">NEXT_PUBLIC_API_URL</code>{" "}
            in the frontend — no need to add it manually.
          </p>
        </div>
      )}

      {/* Error */}
      {submitError && (
        <p className="mt-2 text-[11px] font-mono text-red-500">{submitError}</p>
      )}
      {errors.size > 0 && (
        <p className="mt-2 text-[11px] font-mono text-amber-600 dark:text-amber-400">
          Fill in all required fields before continuing.
        </p>
      )}

      {/* Submit */}
      <div className="flex justify-end mt-4">
        <button
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 text-[12px] font-mono border border-ds-primary text-ds-primary hover:bg-ds-primary hover:text-white transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Continue Deployment"}
          {!submitting && <ArrowRight size={12} strokeWidth={1.5} />}
        </button>
      </div>
    </section>
  );
}

function EnvField({
  envVar,
  value,
  onChange,
  revealed,
  onToggleReveal,
  hasError,
}: {
  envVar: EnvVar;
  value: string;
  onChange: (v: string) => void;
  revealed: boolean;
  onToggleReveal: () => void;
  hasError: boolean;
}) {
  return (
    <div className={`px-4 py-3 ${hasError ? "bg-red-50 dark:bg-red-950/30" : ""}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <code className="text-[12px] font-mono text-ds-on-surface">{envVar.key}</code>
        {envVar.isRequired ? (
          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700 px-1 py-px">
            required
          </span>
        ) : (
          <span className="text-[10px] font-mono text-ds-on-variant">optional</span>
        )}
      </div>
      <div className={`flex items-center gap-1 border ${hasError ? "border-red-400 dark:border-red-600" : "border-ds-outline-variant"} bg-ds-surface-highest`}>
        <input
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={envVar.isRequired ? "Enter value…" : "Leave blank to skip"}
          className="flex-1 min-w-0 bg-transparent font-mono text-[12px] text-ds-on-surface px-3 py-2 outline-none placeholder:text-ds-on-variant/40"
        />
        <button
          type="button"
          onClick={onToggleReveal}
          className="px-2 py-2 text-ds-on-variant hover:text-ds-on-surface transition-colors shrink-0"
          tabIndex={-1}
        >
          {revealed
            ? <EyeOff size={12} strokeWidth={1.5} />
            : <Eye size={12} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeploymentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params["id"] as string;

  const [dep, setDep] = useState<DeploymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeployment(id);
      setDep(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deployment");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchDeployment(id);
        if (cancelled) return;
        setDep(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load deployment");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Auto-refresh while active
  useEffect(() => {
    if (!dep || !isActiveStatus(dep.status)) return;
    const timer = setInterval(() => { void load(); }, 3000);
    return () => clearInterval(timer);
  }, [dep, load]);

  async function handleCancel() {
    if (!dep) return;
    setCancelling(true);
    try {
      await cancelDeployment(dep.id);
      await load();
    } finally {
      setCancelling(false);
    }
  }

  if (loading && !dep) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="h-8 w-48 bg-ds-surface-low animate-pulse mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-ds-surface-low animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !dep) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <button
          onClick={() => router.push("/dashboard/deployments")}
          className="flex items-center gap-1.5 text-[13px] font-mono text-ds-on-variant hover:text-ds-on-surface mb-6 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to deployments
        </button>
        <div className="border border-ds-outline-variant p-8 text-center">
          <AlertCircle size={24} strokeWidth={1.5} className="mx-auto mb-3 text-ds-on-variant" />
          <p className="text-[14px] text-ds-on-surface mb-1">Failed to load deployment</p>
          <p className="text-[12px] font-mono text-ds-on-variant mb-4">{error}</p>
          <button
            onClick={load}
            className="text-[12px] font-mono border border-ds-outline-variant px-4 py-2 hover:bg-ds-surface-low transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const active = isActiveStatus(dep.status);
  const waitingForEnv = dep.status === "WAITING_FOR_ENV";
  const hasFailed = dep.status === "FAILED";
  const hasUrls = dep.frontendUrl || dep.backendUrl;
  const stackStr = [dep.detectedStack?.frontend, dep.detectedStack?.backend]
    .filter(Boolean)
    .join(" + ");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl mx-auto px-6 py-8"
    >
      {/* Back */}
      <button
        onClick={() => router.push("/dashboard/deployments")}
        className="flex items-center gap-1.5 text-[13px] font-mono text-ds-on-variant hover:text-ds-on-surface mb-6 transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back to deployments
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-ds-on-surface tracking-[-0.02em]">
            {dep.repositoryName}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[12px] font-mono text-ds-on-variant">
              <GitBranch size={11} strokeWidth={1.5} />
              {dep.branch}
            </span>
            {stackStr && (
              <span className="flex items-center gap-1 text-[12px] font-mono text-ds-on-variant">
                <Layers size={11} strokeWidth={1.5} />
                {stackStr}
              </span>
            )}
            <span className="flex items-center gap-1 text-[12px] font-mono text-ds-on-variant">
              <Clock size={11} strokeWidth={1.5} />
              {formatRelativeTime(dep.createdAt)}
              {dep.duration !== null && ` · ${formatDuration(dep.duration)}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DeploymentStatusBadge status={dep.status} />
          {(active || waitingForEnv) && (
            <button
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-ds-on-variant border border-ds-outline-variant hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <XCircle size={11} strokeWidth={1.5} />
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-ds-on-variant border border-ds-outline-variant hover:border-ds-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} strokeWidth={1.5} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Active progress bar */}
      {active && (
        <div className="mb-6 h-px bg-ds-outline-variant overflow-hidden">
          <div className="h-full bg-ds-primary animate-pulse w-2/3" />
        </div>
      )}

      {/* Waiting for env — full form */}
      {waitingForEnv && dep.envVariables.length > 0 && (
        <EnvVarForm dep={dep} onSubmitted={() => void load()} />
      )}

      {/* Deployment URLs */}
      {hasUrls ? (
        <section className="mb-6">
          <h2 className="text-[11px] font-mono font-medium text-ds-on-variant uppercase tracking-[0.08em] mb-3">
            Live URLs
          </h2>
          <div className="space-y-2">
            {dep.frontendUrl && <UrlCard label="Frontend" url={dep.frontendUrl} />}
            {dep.backendUrl && <UrlCard label="Backend API" url={dep.backendUrl} />}
          </div>
        </section>
      ) : dep.status === "COMPLETED" && (
        <section className="mb-6">
          <div className="px-4 py-3 border border-ds-outline-variant bg-ds-surface-low text-[12px] font-mono text-ds-on-variant">
            No deployable stack detected in this repository. deplo.ai supports Next.js, React (Vite), Express, and Fastify projects.
          </div>
        </section>
      )}

      {/* Error */}
      {hasFailed && dep.error && (
        <section className="mb-6">
          <h2 className="text-[11px] font-mono font-medium text-ds-on-variant uppercase tracking-[0.08em] mb-3">
            Error
          </h2>
          <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3">
            <p className="text-[12px] font-mono text-red-700 dark:text-red-400 whitespace-pre-wrap break-all">
              {dep.error}
            </p>
          </div>
        </section>
      )}

      {/* Build logs */}
      <section>
        <h2 className="text-[11px] font-mono font-medium text-ds-on-variant uppercase tracking-[0.08em] mb-3 flex items-center gap-2">
          <Terminal size={12} strokeWidth={1.5} />
          Build Logs
        </h2>
        <div className="bg-ds-surface-highest border border-ds-outline-variant p-4 font-mono text-[12px] min-h-[120px] max-h-[480px] overflow-y-auto">
          {dep.logs.length === 0 ? (
            <span className="text-ds-on-variant">No logs yet.</span>
          ) : (
            dep.logs.map((line, i) => (
              <div key={i} className="flex gap-3 leading-relaxed">
                <span className="text-ds-outline shrink-0 select-none">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={
                  line.startsWith("FAILED")
                    ? "text-red-500"
                    : line.startsWith("Stack detected") || line.includes("live at")
                    ? "text-green-500 dark:text-green-400"
                    : line.startsWith("Waiting for")
                    ? "text-amber-500 dark:text-amber-400"
                    : "text-ds-on-surface"
                }>
                  {line}
                </span>
              </div>
            ))
          )}
          {(active || waitingForEnv) && (
            <div className="flex gap-3 mt-1">
              <span className="text-ds-outline select-none">
                {String(dep.logs.length + 1).padStart(2, "0")}
              </span>
              <span className="text-ds-on-variant animate-pulse">▋</span>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
