"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { connectRender, getIntegrations, getVercelInstallUrl } from "@/lib/dashboard-api";
import { APP_VERSION } from "@/lib/version";

// ─── Vercel logo ──────────────────────────────────────────────────────────────

function VercelLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 76 65" fill="currentColor" aria-hidden>
      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
    </svg>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  title,
  description,
  done,
  doneNote,
  children,
}: {
  step: number;
  title: string;
  description: string;
  done: boolean;
  doneNote?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`border p-6 transition-colors ${
        done
          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950"
          : "border-ds-outline-variant bg-ds-surface"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-8 h-8 flex items-center justify-center shrink-0 text-[13px] font-mono font-bold ${
            done ? "bg-green-600 text-white" : "bg-ds-primary text-ds-on-primary"
          }`}
        >
          {done ? <CheckCircle2 size={14} strokeWidth={2} /> : `0${step}`}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-ds-on-surface mb-0.5">{title}</h3>
          <p className="text-[12px] text-ds-on-variant">{done && doneNote ? doneNote : description}</p>
          {!done && children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [vercel, setVercel] = useState<{ connected: boolean; account: string | null }>({
    connected: false,
    account: null,
  });
  const [render, setRender] = useState<{ connected: boolean; account: string | null }>({
    connected: false,
    account: null,
  });
  const [loaded, setLoaded] = useState(false);

  const [connectingVercel, setConnectingVercel] = useState(false);
  const [vercelError, setVercelError] = useState<string | null>(
    searchParams.get("vercel") === "error"
      ? searchParams.get("reason") || "Vercel connection failed. Please try again."
      : null,
  );

  const [apiKey, setApiKey] = useState("");
  const [validating, setValidating] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const integrations = await getIntegrations();
      const v = integrations.find((i) => i.provider === "VERCEL");
      const r = integrations.find((i) => i.provider === "RENDER");
      setVercel({ connected: v?.connected ?? false, account: v?.accountName ?? null });
      setRender({ connected: r?.connected ?? false, account: r?.accountName ?? null });
    } catch {
      // Offline or cold backend — leave both unconnected; the user can retry.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Deferred a tick so the fetch isn't kicked off synchronously inside the
    // effect body (react-hooks/set-state-in-effect).
    const t = setTimeout(() => {
      // Returning from Vercel's OAuth redirect leaves ?vercel=… behind; drop
      // it so a refresh doesn't replay the old result.
      if (searchParams.get("vercel")) {
        const url = new URL(window.location.href);
        url.searchParams.delete("vercel");
        url.searchParams.delete("reason");
        window.history.replaceState({}, "", url.toString());
      }
      void refresh();
    }, 0);
    return () => clearTimeout(t);
  }, [refresh, searchParams]);

  async function handleConnectVercel() {
    setConnectingVercel(true);
    setVercelError(null);
    try {
      const url = await getVercelInstallUrl("onboarding");
      window.location.href = url;
    } catch (err) {
      setVercelError(err instanceof Error ? err.message : "Failed to start Vercel connection");
      setConnectingVercel(false);
    }
  }

  async function handleConnectRender() {
    if (!apiKey.trim() || validating) return;
    setValidating(true);
    setRenderError(null);
    try {
      const result = await connectRender(apiKey.trim());
      setApiKey(""); // never keep the raw key around once it's stored
      setRender({ connected: true, account: result.accountName });
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : "Validation failed. Please try again.");
    } finally {
      setValidating(false);
    }
  }

  // Both are required before the dashboard opens: a full-stack deploy needs
  // Vercel for the frontend and Render for the backend, and connecting them
  // up front means a deployment never stalls halfway asking for credentials.
  const ready = vercel.connected && render.connected;

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ds-bg">
        <div className="w-5 h-5 border-2 border-ds-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen ds-dotgrid flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg"
      >
        {/* Logo + header */}
        <div className="flex flex-col items-center mb-10">
          <Image src="/logo.png" alt="deplo.ai" width={40} height={40} className="object-contain dark:hidden mb-4" />
          <Image src="/logo-dark.png" alt="deplo.ai" width={40} height={40} className="object-contain hidden dark:block mb-4" />
          <h1 className="text-[28px] font-bold text-ds-on-surface tracking-[-0.02em]">Welcome to deplo.ai</h1>
          {user?.email && <p className="text-[13px] font-mono text-ds-on-variant mt-1">{user.email}</p>}
          <p className="text-[14px] text-ds-on-variant mt-3 text-center max-w-sm">
            Two connections and you&apos;re done. Your frontend deploys to Vercel, your backend to
            Render — both into accounts you own. deplo.ai never hosts your app.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <StepCard
            step={1}
            title="GitHub connected"
            description="Repositories and webhooks are accessible via your GitHub account."
            done
            doneNote="Repositories and webhooks are accessible via your GitHub account."
          />

          <StepCard
            step={2}
            title="Connect Vercel"
            description="For frontends — Next.js, React, Vue, Astro and the rest deploy here."
            done={vercel.connected}
            doneNote={`Frontends deploy to ${vercel.account ?? "your Vercel account"}.`}
          >
            {vercelError && (
              <div className="flex items-center gap-2 text-[12px] font-mono text-red-600 dark:text-red-400 mb-3">
                <AlertCircle size={12} strokeWidth={1.5} />
                {vercelError}
              </div>
            )}
            <button
              onClick={handleConnectVercel}
              disabled={connectingVercel}
              className="flex items-center gap-2 bg-ds-primary text-ds-on-primary text-[13px] font-mono font-semibold px-6 py-2.5 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
            >
              {connectingVercel ? (
                <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <VercelLogo size={14} />
              )}
              Connect Vercel Account
              {!connectingVercel && <ChevronRight size={13} strokeWidth={2} />}
            </button>
            <p className="text-[11px] font-mono text-ds-on-variant mt-3">
              You&apos;ll be redirected to Vercel to grant access. deplo.ai never stores your password.
            </p>
          </StepCard>

          <StepCard
            step={3}
            title="Connect Render"
            description="For backends — Express, FastAPI, Django, Go and the rest deploy here."
            done={render.connected}
            doneNote={`Backends deploy to ${render.account ?? "your Render workspace"}.`}
          >
            <p className="text-[12px] text-ds-on-variant mb-4 leading-relaxed">
              Render has no one-click authorization, so it uses a Personal API key. The key is
              validated against Render before it&apos;s stored, encrypted at rest, and never shown
              again.
            </p>

            {/* Direct link — the fast path */}
            <a
              href="https://dashboard.render.com/u/settings#api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 border border-ds-outline-variant bg-ds-surface-low px-3 py-2.5 mb-3 hover:border-ds-primary transition-colors"
            >
              <span className="text-[12.5px] font-mono text-ds-on-surface">
                Open Render → API Keys
              </span>
              <ExternalLink size={13} strokeWidth={1.5} className="shrink-0 text-ds-on-variant" />
            </a>

            {/* The click path — for anyone the deep link doesn't land for */}
            <div className="border border-ds-outline-variant bg-ds-surface-low px-3.5 py-3 mb-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-ds-on-variant mb-2">
                Or navigate manually
              </p>
              <ol className="space-y-1.5 text-[12px] leading-relaxed text-ds-on-variant">
                <li>
                  <span className="font-mono text-ds-on-surface">1.</span> Sign in at{" "}
                  <a
                    href="https://dashboard.render.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-ds-on-surface underline underline-offset-2"
                  >
                    dashboard.render.com
                  </a>
                </li>
                <li>
                  <span className="font-mono text-ds-on-surface">2.</span> Click your avatar
                  (top-right) → <span className="text-ds-on-surface">Account Settings</span>
                </li>
                <li>
                  <span className="font-mono text-ds-on-surface">3.</span> Open the{" "}
                  <span className="text-ds-on-surface">API Keys</span> tab
                </li>
                <li>
                  <span className="font-mono text-ds-on-surface">4.</span> Click{" "}
                  <span className="text-ds-on-surface">Create API Key</span>, name it
                  &ldquo;deplo.ai&rdquo;
                </li>
                <li>
                  <span className="font-mono text-ds-on-surface">5.</span> Copy the key — it starts
                  with <span className="font-mono text-ds-on-surface">rnd_</span> and is shown only
                  once
                </li>
              </ol>
            </div>

            <label
              htmlFor="render-key"
              className="block text-[11px] font-mono uppercase tracking-[0.08em] text-ds-on-variant mb-1.5"
            >
              Paste your key
            </label>
            <div className="flex items-center gap-2">
              <input
                id="render-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnectRender()}
                placeholder="rnd_xxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                className="flex-1 px-3 py-2 text-[13px] font-mono bg-ds-surface-low border border-ds-outline-variant focus:border-ds-primary focus:outline-none text-ds-on-surface placeholder:text-ds-outline transition-colors"
              />
              <button
                onClick={handleConnectRender}
                disabled={!apiKey.trim() || validating}
                className="flex items-center gap-2 shrink-0 bg-ds-primary text-ds-on-primary text-[13px] font-mono font-semibold px-4 py-2 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {validating && <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />}
                {validating ? "Validating…" : "Connect"}
              </button>
            </div>
            {renderError && (
              <div className="flex items-center gap-2 text-[12px] font-mono text-red-600 dark:text-red-400 mt-3">
                <AlertCircle size={12} strokeWidth={1.5} />
                {renderError}
              </div>
            )}
          </StepCard>
        </div>

        {/* Continue */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={() => router.replace("/dashboard")}
            disabled={!ready}
            className="flex items-center justify-center gap-2 w-full bg-ds-primary text-ds-on-primary text-[13px] font-mono font-semibold px-6 py-3 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Go to dashboard
            <ArrowRight size={14} strokeWidth={2} />
          </button>
          <p className="text-[11px] font-mono text-ds-on-variant text-center">
            {ready
              ? "Both providers connected — you're ready to deploy."
              : `Connect ${!vercel.connected && !render.connected ? "both providers" : !vercel.connected ? "Vercel" : "Render"} to continue.`}
          </p>
        </div>

        <p className="text-center text-[11px] font-mono text-ds-outline mt-8">
          deplo.ai · v{APP_VERSION}-beta
        </p>
      </motion.div>
    </div>
  );
}

// ─── Suspense boundary ────────────────────────────────────────────────────────
// useSearchParams() requires a Suspense boundary during prerender (Next.js).

function OnboardingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ds-bg">
      <div className="w-5 h-5 border-2 border-ds-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingContent />
    </Suspense>
  );
}
