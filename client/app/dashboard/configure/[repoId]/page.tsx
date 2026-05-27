"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Globe,
  Terminal,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Rocket,
  GitBranch,
} from "lucide-react";
import { analyzeRepository, initiateDeployment } from "@/lib/dashboard-api";
import type { StackAnalysis } from "@/lib/dashboard-api";

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

// ─── Env var field ────────────────────────────────────────────────────────────

const SENSITIVE_PATTERN = /secret|password|token|key|api|auth|credential|private/i;

function isSensitive(key: string): boolean {
  return SENSITIVE_PATTERN.test(key);
}

interface EnvFieldProps {
  envKey: string;
  value: string;
  isRequired: boolean;
  onChange: (val: string) => void;
}

function EnvField({ envKey, value, isRequired, onChange }: EnvFieldProps) {
  const [visible, setVisible] = useState(false);
  const sensitive = isSensitive(envKey);
  const empty = value.trim() === "";

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[12px] font-mono font-bold text-ds-on-surface flex items-center gap-1.5">
          {envKey}
          {isRequired && (
            <span className="text-[10px] font-mono text-red-500 border border-red-300 dark:border-red-800 px-1">
              required
            </span>
          )}
        </label>
      </div>
      <div className="relative">
        <input
          type={sensitive && !visible ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isRequired ? "Required" : "Optional"}
          className={`w-full bg-ds-surface border px-3 py-2 text-[13px] font-mono text-ds-on-surface placeholder:text-ds-on-variant focus:outline-none transition-colors pr-10 ${
            isRequired && empty
              ? "border-red-400 dark:border-red-700 focus:border-red-500"
              : "border-ds-outline-variant focus:border-ds-primary"
          }`}
        />
        {sensitive && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-on-variant hover:text-ds-on-surface transition-colors"
          >
            {visible ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Stack badge ──────────────────────────────────────────────────────────────

const STACK_LABELS: Record<string, string> = {
  NEXTJS: "Next.js",
  REACT_VITE: "React (Vite)",
  EXPRESS: "Express.js",
  FASTIFY: "Fastify",
  UNKNOWN: "Unknown",
};

function StackBadge({ label, type }: { label: string | null; type: "frontend" | "backend" }) {
  if (!label) return null;
  const name = STACK_LABELS[label] ?? label;
  return (
    <div className="flex items-center gap-2 text-[13px] font-mono text-ds-on-surface">
      {type === "frontend"
        ? <Globe size={14} strokeWidth={1.5} className="text-ds-on-variant" />
        : <Terminal size={14} strokeWidth={1.5} className="text-ds-on-variant" />
      }
      <span className="font-bold">{name}</span>
      <span className="text-ds-on-variant text-[11px]">{type}</span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-ds-surface-mid ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfigurePage({
  params,
}: {
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = use(params);
  const router = useRouter();

  const [analysis, setAnalysis] = useState<StackAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // env var values keyed by var key
  const [values, setValues] = useState<Record<string, string>>({});
  const [showOptional, setShowOptional] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  useEffect(() => {
    analyzeRepository(repoId)
      .then((data) => {
        setAnalysis(data);
        // Pre-populate fields with any default values the analysis detected
        const init: Record<string, string> = {};
        for (const v of data.envVars) {
          init[v.key] = v.value ?? "";
        }
        setValues(init);
      })
      .catch((err: unknown) => {
        setAnalyzeError(err instanceof Error ? err.message : "Analysis failed");
      });
  }, [repoId]);

  const required = analysis?.envVars.filter((v) => v.isRequired) ?? [];
  const optional = analysis?.envVars.filter((v) => !v.isRequired) ?? [];

  const allRequiredFilled = required.every((v) => (values[v.key] ?? "").trim() !== "");

  async function handleDeploy() {
    if (!analysis) return;
    setDeploying(true);
    setDeployError(null);
    try {
      const envVars = Object.entries(values)
        .filter(([k, v]) => k.trim() !== "" && v.trim() !== "")
        .map(([key, value]) => ({ key, value }));

      const { deploymentId } = await initiateDeployment(repoId, envVars);
      router.push(`/dashboard/deployments/${deploymentId}`);
    } catch (err: unknown) {
      setDeployError(err instanceof Error ? err.message : "Deploy failed");
      setDeploying(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="max-w-[1200px] mx-auto px-6 py-8"
    >
      <Stepper active={2} />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Env vars form */}
        <div className="md:col-span-8 bg-ds-surface border border-ds-outline-variant p-6 shadow-[4px_4px_0px_0px_rgba(207,196,197,0.4)] dark:shadow-[4px_4px_0px_0px_rgba(42,42,64,0.8)]">
          <div className="mb-6">
            <h1 className="text-[28px] font-bold text-ds-on-surface tracking-[-0.02em] mb-1">
              Configure Project
            </h1>
            <p className="text-[15px] text-ds-on-variant">
              Set environment variables before deploying. Required vars must be filled.
            </p>
          </div>

          {analyzeError ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <AlertCircle size={16} strokeWidth={1.5} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-mono font-bold text-red-700 dark:text-red-400 mb-1">
                  Analysis failed
                </p>
                <p className="text-[12px] text-red-600 dark:text-red-500">{analyzeError}</p>
              </div>
            </div>
          ) : !analysis ? (
            /* Skeleton while analyzing */
            <div className="space-y-6">
              <div className="space-y-1">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-px w-full mb-4" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="mb-4">
                    <Skeleton className="h-3 w-32 mb-2" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[13px] font-mono text-ds-on-variant">
                <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                Analyzing repository…
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Required vars */}
              {required.length > 0 ? (
                <div>
                  <h2 className="text-[11px] font-mono font-bold text-ds-on-variant uppercase tracking-[0.08em] mb-4">
                    Required Variables ({required.length})
                  </h2>
                  <div className="space-y-4">
                    {required.map((v) => (
                      <EnvField
                        key={v.key}
                        envKey={v.key}
                        value={values[v.key] ?? ""}
                        isRequired={true}
                        onChange={(val) => setValues((s) => ({ ...s, [v.key]: val }))}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-[13px] font-mono text-green-700 dark:text-green-400">
                  No required environment variables detected.
                </div>
              )}

              {/* Optional vars (collapsible) */}
              {optional.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowOptional((s) => !s)}
                    className="flex items-center gap-2 text-[11px] font-mono font-bold text-ds-on-variant uppercase tracking-[0.08em] hover:text-ds-on-surface transition-colors mb-4"
                  >
                    {showOptional
                      ? <ChevronUp size={12} strokeWidth={2} />
                      : <ChevronDown size={12} strokeWidth={2} />
                    }
                    Optional Variables ({optional.length})
                  </button>
                  {showOptional && (
                    <div className="space-y-4">
                      {optional.map((v) => (
                        <EnvField
                          key={v.key}
                          envKey={v.key}
                          value={values[v.key] ?? ""}
                          isRequired={false}
                          onChange={(val) => setValues((s) => ({ ...s, [v.key]: val }))}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Deploy error */}
              {deployError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                  <AlertCircle size={14} strokeWidth={1.5} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <p className="text-[12px] font-mono text-red-700 dark:text-red-400">{deployError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-ds-outline-variant">
                <button
                  onClick={handleDeploy}
                  disabled={deploying || !allRequiredFilled}
                  className="flex items-center gap-2 bg-ds-primary text-ds-on-primary text-[13px] font-mono font-bold px-8 py-2.5 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deploying ? (
                    <>
                      <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                      Starting…
                    </>
                  ) : (
                    <>
                      <Rocket size={14} strokeWidth={1.5} />
                      Deploy
                    </>
                  )}
                </button>
                <button
                  onClick={() => router.back()}
                  className="text-[13px] font-mono text-ds-on-variant hover:text-ds-on-surface transition-colors px-4 py-2.5"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Stack summary */}
        <div className="md:col-span-4 space-y-4">
          <div className="bg-ds-surface border border-ds-outline-variant p-5">
            <h4 className="text-[11px] font-mono font-bold text-ds-on-variant uppercase tracking-[0.08em] mb-4">
              Detected Stack
            </h4>
            {!analysis ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-28" />
              </div>
            ) : (
              <div className="space-y-3">
                <StackBadge label={analysis.stack.frontend} type="frontend" />
                <StackBadge label={analysis.stack.backend} type="backend" />
                {!analysis.stack.frontend && !analysis.stack.backend && (
                  <p className="text-[13px] font-mono text-ds-on-variant">No stack detected</p>
                )}
                <div className="pt-3 border-t border-ds-outline-variant space-y-2 text-[12px] font-mono text-ds-on-variant">
                  <div className="flex items-center gap-2">
                    <GitBranch size={12} strokeWidth={1.5} />
                    <span>{analysis.defaultBranch}</span>
                  </div>
                  {analysis.stack.packageManager && (
                    <div className="flex items-center gap-2">
                      <Terminal size={12} strokeWidth={1.5} />
                      <span>{analysis.stack.packageManager}</span>
                    </div>
                  )}
                  {analysis.stack.buildCommand && (
                    <div className="text-[11px] bg-ds-surface-highest px-2 py-1 font-mono">
                      {analysis.stack.buildCommand}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-ds-surface-low border border-ds-outline-variant p-5">
            <h4 className="text-[11px] font-mono font-bold text-ds-on-variant uppercase tracking-[0.08em] mb-2">
              What happens next
            </h4>
            <ol className="space-y-2 text-[12px] text-ds-on-variant">
              <li className="flex items-start gap-2">
                <span className="text-ds-primary font-mono font-bold">01</span>
                Deploy backend to Vercel (serverless)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ds-primary font-mono font-bold">02</span>
                Deploy frontend to Vercel
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ds-primary font-mono font-bold">03</span>
                Register GitHub webhook for auto-redeploy on push
              </li>
            </ol>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
