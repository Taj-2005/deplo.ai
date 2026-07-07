"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { getVercelInstallUrl } from "@/lib/dashboard-api";

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
  active,
  children,
}: {
  step: number;
  title: string;
  description: string;
  done: boolean;
  active: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`border p-6 transition-colors ${
        done
          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950"
          : active
          ? "border-ds-primary bg-ds-surface"
          : "border-ds-outline-variant bg-ds-surface-low"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-8 h-8 flex items-center justify-center shrink-0 text-[13px] font-mono font-bold ${
            done
              ? "bg-green-600 text-white"
              : active
              ? "bg-ds-primary text-ds-on-primary"
              : "border border-ds-outline-variant text-ds-on-variant"
          }`}
        >
          {done ? <CheckCircle2 size={14} strokeWidth={2} /> : `0${step}`}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-ds-on-surface mb-0.5">{title}</h3>
          <p className="text-[12px] text-ds-on-variant">{description}</p>
          {active && children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle return from Vercel OAuth callback
  const vercelResult = searchParams.get("vercel");
  const vercelConnected = vercelResult === "connected";

  useEffect(() => {
    if (vercelConnected) {
      // Clean URL then go to dashboard
      const url = new URL(window.location.href);
      url.searchParams.delete("vercel");
      window.history.replaceState({}, "", url.toString());
      router.replace("/dashboard");
    }
  }, [vercelConnected, router]);

  async function handleConnectVercel() {
    setConnecting(true);
    setError(null);
    try {
      const url = await getVercelInstallUrl("onboarding");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Vercel connection");
      setConnecting(false);
    }
  }

  if (vercelConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ds-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-ds-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] font-mono text-ds-on-variant">Setting up your workspace…</p>
        </div>
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
          <h1 className="text-[28px] font-bold text-ds-on-surface tracking-[-0.02em]">
            Welcome to deplo.ai
          </h1>
          {user?.email && (
            <p className="text-[13px] font-mono text-ds-on-variant mt-1">{user.email}</p>
          )}
          <p className="text-[14px] text-ds-on-variant mt-3 text-center max-w-sm">
            Connect your Vercel account to start deploying. Your apps will deploy into your own Vercel dashboard.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <StepCard
            step={1}
            title="GitHub connected"
            description="Repositories and webhooks are accessible via your GitHub account."
            done={true}
            active={false}
          />

          <StepCard
            step={2}
            title="Connect Vercel"
            description="Authorize deplo.ai to deploy projects into your personal Vercel account."
            done={false}
            active={true}
          >
            {error && (
              <div className="flex items-center gap-2 text-[12px] font-mono text-red-600 dark:text-red-400 mb-3">
                <AlertCircle size={12} strokeWidth={1.5} />
                {error}
              </div>
            )}
            <button
              onClick={handleConnectVercel}
              disabled={connecting}
              className="flex items-center gap-2 bg-ds-primary text-ds-on-primary text-[13px] font-mono font-semibold px-6 py-2.5 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <VercelLogo size={14} />
              )}
              Connect Vercel Account
              {!connecting && <ChevronRight size={13} strokeWidth={2} />}
            </button>
            <p className="text-[11px] font-mono text-ds-on-variant mt-3">
              You&apos;ll be redirected to Vercel to grant access. deplo.ai never stores your password.
            </p>
          </StepCard>
        </div>

        <p className="text-center text-[11px] font-mono text-ds-outline mt-8">
          deplo.ai · v0.1.0-beta
        </p>
      </motion.div>
    </div>
  );
}
