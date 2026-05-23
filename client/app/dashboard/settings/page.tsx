"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, LogOut, AlertTriangle, ChevronRight } from "lucide-react";

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

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 transition-colors ${
        checked ? "bg-ds-primary" : "bg-ds-outline-variant"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-ds-on-primary transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [deployNotifs, setDeployNotifs] = useState(true);
  const [failureAlerts, setFailureAlerts] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

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

        {/* Notifications */}
        <Section title="Notifications" description="Configure deployment alerts.">
          <SettingRow
            label="Deployment success"
            description="Notify when a deployment completes."
          >
            <Toggle checked={deployNotifs} onChange={setDeployNotifs} />
          </SettingRow>
          <SettingRow
            label="Failure alerts"
            description="Notify when a deployment fails."
          >
            <Toggle checked={failureAlerts} onChange={setFailureAlerts} />
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
                <button className="px-2 py-1 text-[12px] font-mono text-red-600 border border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 transition-colors">
                  Confirm
                </button>
              </div>
            )}
          </SettingRow>
        </Section>

        <div className="text-center py-2">
          <span className="text-[11px] font-mono text-ds-outline">
            deplo.ai · v0.1.0-beta · MIT License
          </span>
        </div>
      </div>
    </motion.div>
  );
}
