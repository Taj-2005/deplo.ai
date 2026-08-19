"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, LogOut, AlertTriangle, ChevronRight, Terminal, Copy, Check, Trash2 } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import {
  deleteAccount,
  listCliTokens,
  createCliToken,
  revokeCliToken,
  type CliTokenInfo,
} from "@/lib/dashboard-api";

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

function SettingRow({
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

// ─── CLI tokens ───────────────────────────────────────────────────────────────

function relativeDate(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CliTokensSection() {
  const [tokens, setTokens] = useState<CliTokenInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listCliTokens()
      .then(setTokens)
      .catch(() => setTokens([]))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createCliToken(name.trim());
      setNewToken(created.token);
      setName("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setCreating(false);
    }
  };

  const onCopy = async () => {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the token is visible for manual selection.
    }
  };

  const onRevoke = async (id: string) => {
    try {
      await revokeCliToken(id);
      setTokens((prev) => prev.filter((t) => t.id !== id));
    } catch {
      refresh();
    }
  };

  return (
    <Section
      title="CLI tokens"
      description="Deploy from your terminal. Install with npm i -g @deplo.ai/cli, then run deplo login."
    >
      {/* Create */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onCreate()}
            placeholder="Token name — e.g. MacBook, CI"
            maxLength={64}
            className="flex-1 px-3 py-1.5 text-[13px] font-mono bg-ds-surface-low border border-ds-outline-variant text-ds-on-surface placeholder:text-ds-outline focus:outline-none focus:border-ds-primary transition-colors"
          />
          <button
            onClick={onCreate}
            disabled={!name.trim() || creating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-mono border border-ds-outline-variant text-ds-on-surface hover:border-ds-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Terminal size={11} strokeWidth={1.5} />
            {creating ? "Creating…" : "Create token"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-[12px] font-mono text-red-600 dark:text-red-400">{error}</p>
        )}
        {newToken && (
          <div className="mt-3 border border-ds-outline-variant bg-ds-surface-low p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] text-ds-on-variant">
                Copy this token now — it won&apos;t be shown again.
              </p>
              <button
                onClick={() => setNewToken(null)}
                className="text-[11px] font-mono text-ds-on-variant hover:text-ds-on-surface transition-colors"
              >
                Dismiss
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 px-2 py-1.5 text-[12px] font-mono bg-ds-surface border border-ds-outline-variant text-ds-on-surface overflow-x-auto whitespace-nowrap">
                {newToken}
              </code>
              <button
                onClick={onCopy}
                aria-label="Copy token"
                className="p-1.5 border border-ds-outline-variant text-ds-on-variant hover:text-ds-on-surface hover:border-ds-primary transition-colors"
              >
                {copied ? <Check size={13} strokeWidth={1.5} /> : <Copy size={13} strokeWidth={1.5} />}
              </button>
            </div>
            <p className="mt-2 text-[11px] font-mono text-ds-on-variant">
              deplo login --token {newToken.slice(0, 12)}…
            </p>
          </div>
        )}
      </div>

      {/* List */}
      {loaded && tokens.length === 0 && !newToken && (
        <div className="px-6 py-4 text-[12px] font-mono text-ds-on-variant">
          No tokens yet. Create one to use the CLI.
        </div>
      )}
      {tokens.map((t) => (
        <SettingRow
          key={t.id}
          label={t.name}
          description={`Created ${relativeDate(t.createdAt)} · Last used ${relativeDate(t.lastUsedAt)}`}
        >
          <button
            onClick={() => onRevoke(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-mono text-ds-on-variant border border-ds-outline-variant hover:border-red-300 hover:text-red-600 dark:hover:border-red-800 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 size={11} strokeWidth={1.5} />
            Revoke
          </button>
        </SettingRow>
      ))}
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Irreversible: removes the account and every record deplo.ai holds. Apps
  // already deployed keep running in the user's own provider accounts.
  const onDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      signOut();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete the account");
      setDeleting(false);
    }
  };

  const userInitial = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="max-w-2xl mx-auto px-6 py-8"
    >
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-ds-on-surface tracking-[-0.02em]">
          Settings
        </h1>
        <p className="text-[14px] text-ds-on-variant font-mono mt-1">
          Manage your account and preferences.
        </p>
      </div>

      <div className="space-y-4">
        {/* Profile */}
        <Section title="Profile" description="Your account information.">
          <SettingRow label="Avatar">
            <div className="w-9 h-9 bg-ds-primary-dim border border-ds-outline-variant flex items-center justify-center text-[13px] font-mono text-ds-on-primary-dim">
              {userInitial}
            </div>
          </SettingRow>
          <SettingRow label="Email address" description="From your GitHub account.">
            <span className="text-[12px] font-mono text-ds-on-variant">
              {user?.email ?? "—"}
            </span>
          </SettingRow>
          <SettingRow label="Account ID">
            <span className="text-[11px] font-mono text-ds-on-variant">
              {user?.id ?? "—"}
            </span>
          </SettingRow>
        </Section>

        {/* GitHub Integration */}
        <Section
          title="GitHub Integration"
          description="Your GitHub OAuth connection."
        >
          <SettingRow label="Connection status">
            <div className="flex items-center gap-2 text-[13px] font-mono text-green-700 dark:text-green-400">
              <CheckCircle2 size={13} strokeWidth={1.5} />
              Connected
            </div>
          </SettingRow>
          <SettingRow
            label="Permissions"
            description="Repository access and metadata read."
          >
            <a
              href="https://github.com/settings/installations"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[12px] font-mono text-ds-on-variant hover:text-ds-on-surface transition-colors"
            >
              Manage on GitHub
              <ChevronRight size={11} strokeWidth={1.5} />
            </a>
          </SettingRow>
          <SettingRow label="Disconnect GitHub">
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-mono text-ds-on-variant border border-ds-outline-variant hover:border-red-300 hover:text-red-600 dark:hover:border-red-800 dark:hover:text-red-400 transition-colors"
            >
              <LogOut size={11} strokeWidth={1.5} />
              Sign out
            </button>
          </SettingRow>
        </Section>

        {/* CLI tokens */}
        <CliTokensSection />

        {/* Notifications */}
        <Section title="Email notifications" description="Sent to your GitHub account address.">
          <SettingRow
            label="Deployment succeeded"
            description="Production URLs as soon as your app is live."
          >
            <span className="flex items-center gap-1.5 text-[12px] font-mono text-green-700 dark:text-green-400">
              <CheckCircle2 size={11} strokeWidth={1.5} />
              On
            </span>
          </SettingRow>
          <SettingRow
            label="Deployment failed"
            description="AI diagnosis with the cause, the file, and a fix prompt."
          >
            <span className="flex items-center gap-1.5 text-[12px] font-mono text-green-700 dark:text-green-400">
              <CheckCircle2 size={11} strokeWidth={1.5} />
              On
            </span>
          </SettingRow>
          <SettingRow
            label="Waiting for input"
            description="When a deployment pauses for environment variables."
          >
            <span className="flex items-center gap-1.5 text-[12px] font-mono text-green-700 dark:text-green-400">
              <CheckCircle2 size={11} strokeWidth={1.5} />
              On
            </span>
          </SettingRow>
        </Section>

        {/* Danger Zone */}
        <Section title="Danger Zone">
          <SettingRow
            label="Delete account"
            description="Permanently delete your account and all deployment data."
          >
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="px-3 py-1.5 text-[12px] font-mono text-red-600 border border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 transition-colors"
              >
                Delete account
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[12px] font-mono text-red-600 dark:text-red-400">
                  <AlertTriangle size={11} strokeWidth={1.5} />
                  Are you sure?
                </span>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-2 py-1 text-[12px] font-mono text-ds-on-variant hover:text-ds-on-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onDeleteAccount}
                  disabled={deleting}
                  className="px-2 py-1 text-[12px] font-mono text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 transition-colors"
                >
                  {deleting ? "Deleting…" : "Confirm"}
                </button>
              </div>
            )}
          </SettingRow>
          {deleteError && (
            <div className="px-6 py-3 text-[12px] font-mono text-red-600 dark:text-red-400">{deleteError}</div>
          )}
        </Section>

        <div className="text-center py-2">
          <span className="text-[11px] font-mono text-ds-outline">
            deplo.ai · v{APP_VERSION}-beta · MIT License
          </span>
        </div>
      </div>
    </motion.div>
  );
}
