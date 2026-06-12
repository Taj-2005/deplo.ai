"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  Plug2,
  GitBranch as GithubIcon,
  ExternalLink,
  Loader2,
  X,
  ChevronRight,
} from "lucide-react";
import {
  getIntegrations,
  disconnectVercel,
  getVercelInstallUrl,
} from "@/lib/dashboard-api";
import type { IntegrationStatus } from "@/lib/dashboard-api";
import { useAuth } from "@/context/AuthContext";

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-ds-outline-variant bg-ds-surface">
      <div className="px-6 py-4 border-b border-ds-outline-variant bg-ds-surface-low">
        <h2 className="text-[14px] font-semibold text-ds-on-surface">{title}</h2>
        {description && (
          <p className="text-[12px] text-ds-on-variant mt-0.5">{description}</p>
        )}
      </div>
      <div className="divide-y divide-ds-surface-mid">{children}</div>
    </div>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      <div>
        <div className="text-[14px] text-ds-on-surface">{label}</div>
        {description && (
          <div className="text-[12px] text-ds-on-variant mt-0.5">{description}</div>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({
  type,
  message,
  onDismiss,
}: {
  type: "success" | "error";
  message: string;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-3 px-4 py-3 border text-[13px] font-mono mb-6 ${
        type === "success"
          ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
          : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 size={14} strokeWidth={1.5} className="shrink-0" />
      ) : (
        <AlertCircle size={14} strokeWidth={1.5} className="shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-inherit opacity-60 hover:opacity-100 transition-opacity">
        <X size={13} strokeWidth={1.5} />
      </button>
    </motion.div>
  );
}

// ─── Vercel card ──────────────────────────────────────────────────────────────

function VercelLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 76 65" fill="currentColor" aria-hidden>
      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
    </svg>
  );
}

interface VercelCardProps {
  integration: IntegrationStatus | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

function VercelCard({ integration, onConnect, onDisconnect }: VercelCardProps) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    await onDisconnect();
    setDisconnecting(false);
    setConfirmDisconnect(false);
  }

  return (
    <Section
      title="Vercel"
      description="Deploy your frontend and serverless backend to your own Vercel account."
    >
      <Row label="Connection status">
        {integration?.connected ? (
          <div className="flex items-center gap-2 text-[13px] font-mono text-green-700 dark:text-green-400">
            <CheckCircle2 size={13} strokeWidth={1.5} />
            Connected
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[13px] font-mono text-ds-on-variant">
            <Plug2 size={13} strokeWidth={1.5} />
            Not connected
          </div>
        )}
      </Row>

      {integration?.connected && integration.accountName && (
        <Row label="Account" description="The Vercel account your projects are deployed to.">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[13px] font-mono text-ds-on-surface">{integration.accountName}</span>
            {integration.teamName && (
              <span className="text-[11px] font-mono text-ds-on-variant">{integration.teamName}</span>
            )}
          </div>
        </Row>
      )}

      {integration?.connected && (
        <Row label="Manage on Vercel" description="View your projects and deployments.">
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[12px] font-mono text-ds-on-variant hover:text-ds-on-surface transition-colors"
          >
            Open Vercel
            <ExternalLink size={11} strokeWidth={1.5} />
          </a>
        </Row>
      )}

      <Row
        label={integration?.connected ? "Disconnect Vercel" : "Connect your Vercel account"}
        description={
          integration?.connected
            ? "Removes deplo.ai's access to your Vercel account. Existing projects remain."
            : "Authorize deplo.ai to deploy projects into your Vercel account."
        }
      >
        {integration?.connected ? (
          !confirmDisconnect ? (
            <button
              onClick={() => setConfirmDisconnect(true)}
              className="px-3 py-1.5 text-[12px] font-mono text-ds-on-variant border border-ds-outline-variant hover:border-red-300 hover:text-red-600 dark:hover:border-red-800 dark:hover:text-red-400 transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-mono text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle size={11} strokeWidth={1.5} />
                Are you sure?
              </span>
              <button
                onClick={() => setConfirmDisconnect(false)}
                className="px-2 py-1 text-[12px] font-mono text-ds-on-variant hover:text-ds-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-2 py-1 text-[12px] font-mono text-red-600 border border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
              >
                {disconnecting ? (
                  <Loader2 size={11} strokeWidth={1.5} className="animate-spin" />
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          )
        ) : (
          <button
            onClick={() => { setConnecting(true); void onConnect().finally(() => setConnecting(false)); }}
            disabled={connecting}
            className="flex items-center gap-2 bg-ds-primary text-ds-on-primary text-[12px] font-mono font-semibold px-4 py-1.5 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
          >
            {connecting ? (
              <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <VercelLogo />
            )}
            Connect Vercel
            <ChevronRight size={11} strokeWidth={2} />
          </button>
        )}
      </Row>
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [integrations, setIntegrations] = useState<IntegrationStatus[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getIntegrations();
      setIntegrations(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load integrations");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Handle OAuth callback result from query params
  useEffect(() => {
    const vercelResult = searchParams.get("vercel");
    if (vercelResult === "connected") {
      setToast({ type: "success", message: "Vercel connected successfully. Your account is ready for deployments." });
      void load();
    } else if (vercelResult === "error") {
      setToast({ type: "error", message: "Vercel connection failed. Please try again." });
    } else if (vercelResult === "required") {
      setToast({ type: "error", message: "Connect your Vercel account before deploying." });
    }
    // Clean up the query param from URL without causing a navigation
    if (vercelResult) {
      const url = new URL(window.location.href);
      url.searchParams.delete("vercel");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, load]);

  const vercelIntegration = integrations?.find((i) => i.provider === "VERCEL") ?? null;

  async function handleConnect() {
    try {
      const url = await getVercelInstallUrl();
      window.location.href = url;
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to start Vercel connection" });
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectVercel();
      setToast({ type: "success", message: "Vercel disconnected." });
      await load();
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Disconnect failed" });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="max-w-2xl mx-auto px-6 py-8"
    >
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-ds-on-surface tracking-[-0.02em]">
          Integrations
        </h1>
        <p className="text-[14px] text-ds-on-variant font-mono mt-1">
          Connect your cloud providers to enable deployments.
        </p>
      </div>

      <AnimatePresence>
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {loadError && (
        <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
          <AlertCircle size={14} strokeWidth={1.5} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <p className="text-[13px] font-mono text-red-700 dark:text-red-400">{loadError}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* GitHub — always connected (login is via GitHub OAuth) */}
        <Section
          title="GitHub"
          description="Your GitHub account is used for authentication and repository access."
        >
          <Row label="Connection status">
            <div className="flex items-center gap-2 text-[13px] font-mono text-green-700 dark:text-green-400">
              <CheckCircle2 size={13} strokeWidth={1.5} />
              Connected
            </div>
          </Row>
          {user?.email && (
            <Row label="Account" description="Signed in via GitHub OAuth.">
              <span className="text-[13px] font-mono text-ds-on-surface">{user.email}</span>
            </Row>
          )}
          <Row label="Permissions" description="Repository access, webhooks, user identity.">
            <a
              href="https://github.com/settings/installations"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[12px] font-mono text-ds-on-variant hover:text-ds-on-surface transition-colors"
            >
              <GithubIcon size={12} strokeWidth={1.5} />
              Manage on GitHub
              <ChevronRight size={11} strokeWidth={1.5} />
            </a>
          </Row>
        </Section>

        {/* Vercel */}
        {integrations === null && !loadError ? (
          <div className="border border-ds-outline-variant bg-ds-surface">
            <div className="px-6 py-4 border-b border-ds-outline-variant bg-ds-surface-low">
              <div className="h-4 w-16 bg-ds-surface-mid animate-pulse" />
            </div>
            <div className="px-6 py-4">
              <div className="h-4 w-48 bg-ds-surface-mid animate-pulse" />
            </div>
          </div>
        ) : (
          <VercelCard
            integration={vercelIntegration}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        )}

        <div className="text-center py-2">
          <span className="text-[11px] font-mono text-ds-outline">
            More integrations coming soon — Render, Railway, Cloudflare
          </span>
        </div>
      </div>
    </motion.div>
  );
}
