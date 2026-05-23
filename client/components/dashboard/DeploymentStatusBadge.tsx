"use client";

import { CheckCircle2, XCircle, Clock, Loader2, Ban, AlertTriangle } from "lucide-react";
import type { DeploymentStatus } from "@/types/dashboard";

interface StatusConfig {
  label: string;
  className: string;
  icon: React.ReactNode;
  pulse: boolean;
}

function getConfig(status: DeploymentStatus): StatusConfig {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Live",
        className:
          "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400",
        icon: <CheckCircle2 size={11} strokeWidth={2} />,
        pulse: false,
      };
    case "FAILED":
      return {
        label: "Failed",
        className:
          "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-400",
        icon: <XCircle size={11} strokeWidth={2} />,
        pulse: false,
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        className:
          "bg-ds-surface-mid border-ds-outline-variant text-ds-on-variant",
        icon: <Ban size={11} strokeWidth={2} />,
        pulse: false,
      };
    case "PENDING":
      return {
        label: "Queued",
        className:
          "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400",
        icon: <Clock size={11} strokeWidth={2} />,
        pulse: true,
      };
    case "WAITING_FOR_ENV":
      return {
        label: "Needs Env",
        className:
          "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400",
        icon: <AlertTriangle size={11} strokeWidth={2} />,
        pulse: true,
      };
    case "ANALYZING":
    case "DEPLOYING_BACKEND":
    case "BACKEND_READY":
    case "DEPLOYING_FRONTEND":
      return {
        label:
          status === "ANALYZING"
            ? "Analyzing"
            : status === "DEPLOYING_FRONTEND"
            ? "Deploying"
            : "Building",
        className: "bg-ds-surface-mid border-ds-outline-variant text-ds-on-variant",
        icon: <Loader2 size={11} strokeWidth={2} className="animate-spin" />,
        pulse: true,
      };
  }
}

export function DeploymentStatusBadge({ status }: { status: DeploymentStatus }) {
  const cfg = getConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-[0.08em] border ${cfg.className}`}
    >
      {cfg.pulse ? (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
      ) : (
        <span className="shrink-0">{cfg.icon}</span>
      )}
      {cfg.label}
    </span>
  );
}
