"use client";

import { useState, useEffect } from "react";
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
  connectRender,
  disconnectRender,
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
      description="Deploy your frontend to your own Vercel account."
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

// ─── Render card ──────────────────────────────────────────────────────────────

function RenderLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.3 2a6.7 6.7 0 0 0-6.68 6.15 3.36 3.36 0 0 1-3.35 3.1H2v10.73h10.73v-6.71a.67.67 0 0 1 .67-.67h1.34c3.7 0 6.71-3 6.71-6.7A6.9 6.9 0 0 0 17.3 2Z" />
    </svg>
  );
}

interface RenderCardProps {
  integration: IntegrationStatus | null;
  onConnected: (accountName: string | null) => void;
  onDisconnect: () => Promise<void>;
}

function RenderCard({ integration, onConnected, onDisconnect }: RenderCardProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [validating, setValidating] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const connected = integration?.connected ?? false;

  async function handleValidateAndConnect() {
    setValidating(true);
    setKeyError(null);
    try {
      const result = await connectRender(apiKey);
      setApiKey(""); // never keep the raw key in memory/state after saving
      setPanelOpen(false);
      onConnected(result.accountName);
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : "Validation failed. Please try again.");
    } finally {
      setValidating(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    await onDisconnect();
    setDisconnecting(false);
    setConfirmDisconnect(false);
  }

  function openPanel() {
    setKeyError(null);
    setApiKey("");
    setPanelOpen(true);
  }

  return (
    <Section
      title="Render"
      description="Deploy backend services to your own Render account."
    >
      <Row label="Connection status">
        {connected ? (
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

      {connected && integration?.accountName && (
        <Row label="Workspace" description="The Render workspace your services are deployed to.">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[13px] font-mono text-ds-on-surface">{integration.accountName}</span>
            {integration.teamName && integration.teamName !== integration.accountName && (
              <span className="text-[11px] font-mono text-ds-on-variant">{integration.teamName}</span>
            )}
          </div>
        </Row>
      )}

      {connected && (
        <Row label="API key" description="Stored encrypted. The key is never shown again.">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-mono text-ds-on-variant tracking-wider">rnd_••••••••••••</span>
            <button
              onClick={openPanel}
              className="px-3 py-1.5 text-[12px] font-mono text-ds-on-variant border border-ds-outline-variant hover:border-ds-outline hover:text-ds-on-surface transition-colors"
            >
              Rotate key
            </button>
          </div>
        </Row>
      )}

      {connected && (
        <Row label="Manage on Render" description="View your services and deployments.">
          <a
            href="https://dashboard.render.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[12px] font-mono text-ds-on-variant hover:text-ds-on-surface transition-colors"
          >
            Open Render
            <ExternalLink size={11} strokeWidth={1.5} />
          </a>
        </Row>
      )}

      {/* Connect / rotate panel — guided API key flow */}
      <AnimatePresence initial={false}>
        {panelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 py-5 bg-ds-surface-low space-y-4">
              <div className="space-y-2">
                <p className="text-[13px] text-ds-on-surface font-medium">
                  {connected ? "Rotate your Render API key" : "Connect with a Render API key"}
                </p>
                <p className="text-[12px] text-ds-on-variant leading-relaxed">
                  Render uses Personal API Keys for integrations. deplo.ai uses your key to create and
                  manage services <span className="text-ds-on-surface">inside your own Render account</span> —
                  it is validated first, then stored encrypted. It is never logged or displayed again.
                </p>
                <ol className="text-[12px] font-mono text-ds-on-variant space-y-1 list-decimal list-inside">
                  <li>
                    Open{" "}
                    <a
                      href="https://dashboard.render.com/u/settings#api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ds-on-surface underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-1"
                    >
                      Render → Account Settings → API Keys
                      <ExternalLink size={10} strokeWidth={1.5} />
                    </a>
                  </li>
                  <li>Click “Create API Key” and copy the key (starts with <code>rnd_</code>)</li>
                  <li>Paste it below</li>
                </ol>
              </div>

              <div className="space-y-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setKeyError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && apiKey && !validating) void handleValidateAndConnect(); }}
                  placeholder="rnd_xxxxxxxxxxxxxxxxxxxx"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-3 py-2 text-[13px] font-mono bg-ds-surface border border-ds-outline-variant focus:border-ds-outline focus:outline-none text-ds-on-surface placeholder:text-ds-outline"
                />
                {keyError && (
                  <p className="flex items-center gap-1.5 text-[12px] font-mono text-red-600 dark:text-red-400">
                    <AlertCircle size={11} strokeWidth={1.5} className="shrink-0" />
                    {keyError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleValidateAndConnect()}
                  disabled={!apiKey.trim() || validating}
                  className="flex items-center gap-2 bg-ds-primary text-ds-on-primary text-[12px] font-mono font-semibold px-4 py-1.5 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
                >
                  {validating ? (
                    <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={13} strokeWidth={1.5} />
                  )}
                  {validating ? "Validating…" : "Validate & connect"}
                </button>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="px-3 py-1.5 text-[12px] font-mono text-ds-on-variant hover:text-ds-on-surface transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Row
        label={connected ? "Disconnect Render" : "Connect your Render account"}
        description={
          connected
            ? "Removes deplo.ai's access to your Render account. Existing services remain."
            : "Backend services will be deployed into your own Render workspace."
        }
      >
        {connected ? (
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
            onClick={openPanel}
            disabled={panelOpen}
            className="flex items-center gap-2 bg-ds-primary text-ds-on-primary text-[12px] font-mono font-semibold px-4 py-1.5 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
          >
            <RenderLogo />
            Connect Render
            <ChevronRight size={11} strokeWidth={2} />
          </button>
        )}
      </Row>
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function toastFromVercelParam(result: string | null): { type: "success" | "error"; message: string } | null {
  if (result === "connected") return { type: "success", message: "Vercel connected successfully. Your account is ready for deployments." };
  if (result === "error") return { type: "error", message: "Vercel connection failed. Please try again." };
  if (result === "required") return { type: "error", message: "Connect your Vercel account before deploying." };
  return null;
}

export default function IntegrationsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [integrations, setIntegrations] = useState<IntegrationStatus[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Initialize toast from URL param immediately during render (no effect needed)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(
    () => toastFromVercelParam(searchParams.get("vercel")),
  );

  async function load() {
    try {
      const data = await getIntegrations();
      setIntegrations(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load integrations");
    }
  }

  // Load integrations on mount; also reload when returning from a successful OAuth connect.
  // setState calls are inside .then()/.catch() so they are not synchronous within the effect body.
  useEffect(() => {
    const shouldRefresh = searchParams.get("vercel") === "connected";
    getIntegrations()
      .then((data) => setIntegrations(data))
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load integrations");
      });
    // Clean up the query param from URL without a navigation
    if (shouldRefresh || searchParams.get("vercel")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("vercel");
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vercelIntegration = integrations?.find((i) => i.provider === "VERCEL") ?? null;
  const renderIntegration = integrations?.find((i) => i.provider === "RENDER") ?? null;

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

  function handleRenderConnected(accountName: string | null) {
    setToast({
      type: "success",
      message: `Render connected${accountName ? ` (${accountName})` : ""}. Backend services will deploy to your workspace.`,
    });
    void load();
  }

  async function handleRenderDisconnect() {
    try {
      await disconnectRender();
      setToast({ type: "success", message: "Render disconnected." });
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
          <>
            <VercelCard
              integration={vercelIntegration}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
            <RenderCard
              integration={renderIntegration}
              onConnected={handleRenderConnected}
              onDisconnect={handleRenderDisconnect}
            />
          </>
        )}

        <div className="text-center py-2">
          <span className="text-[11px] font-mono text-ds-outline">
            More integrations coming soon — Railway, Cloudflare
          </span>
        </div>
      </div>
    </motion.div>
  );
}
