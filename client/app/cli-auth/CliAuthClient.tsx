"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Terminal, ShieldCheck } from "lucide-react";
import { getToken, isTokenValid, getGithubAuthUrl } from "@/lib/auth";
import { createCliToken } from "@/lib/dashboard-api";

export const RETURN_TO_KEY = "deplo_return_to";

type Phase = "checking" | "confirm" | "minting" | "done" | "invalid" | "error";

/**
 * Browser side of `deplo login`.
 *
 * The CLI opens /cli-auth?port=<loopback port>&state=<nonce>&host=<machine>.
 * If the user isn't signed in we bounce through GitHub OAuth and return here.
 * On explicit confirmation we mint a CLI token named after the machine and
 * redirect to 127.0.0.1:<port>/callback — loopback only, never anywhere else.
 */
export function CliAuthClient() {
  const params = useSearchParams();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);

  const port = useMemo(() => {
    const n = Number(params.get("port"));
    return Number.isInteger(n) && n >= 1024 && n <= 65535 ? n : null;
  }, [params]);
  const state = useMemo(() => {
    const s = params.get("state") ?? "";
    return /^[a-f0-9]{16,64}$/.test(s) ? s : null;
  }, [params]);
  const host = (params.get("host") ?? "terminal").slice(0, 48);

  useEffect(() => {
    // Deferred so state updates happen outside the effect body itself
    // (react-hooks/set-state-in-effect); the auth check needs the browser.
    const timer = setTimeout(() => {
      if (!port || !state) {
        setPhase("invalid");
        return;
      }
      const token = getToken();
      if (!token || !isTokenValid(token)) {
        // Round-trip through GitHub sign-in, then land back here.
        sessionStorage.setItem(RETURN_TO_KEY, `${window.location.pathname}${window.location.search}`);
        window.location.replace(getGithubAuthUrl());
        return;
      }
      setPhase("confirm");
    }, 0);
    return () => clearTimeout(timer);
  }, [port, state]);

  const authorize = async () => {
    if (!port || !state) return;
    setPhase("minting");
    try {
      const created = await createCliToken(`CLI · ${host}`);
      // Loopback address only — the token never travels anywhere else.
      window.location.replace(
        `http://127.0.0.1:${port}/callback?token=${encodeURIComponent(created.token)}&state=${state}`,
      );
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a CLI token");
      setPhase("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 bg-white dark:bg-ds-bg">
      <Image src="/logo.png" alt="deplo.ai" width={40} height={40} className="object-contain dark:hidden" />
      <Image src="/logo-dark.png" alt="deplo.ai" width={40} height={40} className="object-contain hidden dark:block" />

      {phase === "checking" && (
        <div className="w-5 h-5 border-2 border-ds-primary border-t-transparent rounded-full animate-spin" />
      )}

      {phase === "invalid" && (
        <div className="max-w-sm text-center">
          <p className="text-[14px] text-ds-on-surface font-semibold">Invalid sign-in link</p>
          <p className="text-[13px] text-ds-on-variant mt-1 font-mono">
            Run <span className="text-ds-primary">deplo login</span> in your terminal to start again.
          </p>
        </div>
      )}

      {(phase === "confirm" || phase === "minting") && (
        <div className="max-w-sm w-full border border-ds-outline-variant bg-ds-surface p-6 text-center">
          <div className="mx-auto w-10 h-10 border border-ds-outline-variant flex items-center justify-center text-ds-primary">
            <Terminal size={18} strokeWidth={1.5} />
          </div>
          <h1 className="mt-4 text-[16px] font-semibold text-ds-on-surface">Authorize the deplo CLI?</h1>
          <p className="mt-1 text-[13px] text-ds-on-variant">
            This creates a CLI token for <span className="font-mono text-ds-on-surface">{host}</span>. You can
            revoke it anytime in Settings.
          </p>
          <button
            onClick={authorize}
            disabled={phase === "minting"}
            className="mt-5 w-full px-4 py-2 text-[13px] font-mono bg-ds-primary text-ds-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {phase === "minting" ? "Authorizing…" : "Authorize"}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-mono text-ds-on-variant">
            <ShieldCheck size={11} strokeWidth={1.5} />
            Sent only to 127.0.0.1:{port} on your machine
          </p>
        </div>
      )}

      {phase === "done" && (
        <div className="max-w-sm text-center">
          <p className="text-[14px] text-ds-on-surface font-semibold">Signed in ✓</p>
          <p className="text-[13px] text-ds-on-variant mt-1 font-mono">
            Return to your terminal — you can close this tab.
          </p>
        </div>
      )}

      {phase === "error" && (
        <div className="max-w-sm text-center">
          <p className="text-[14px] text-red-600 dark:text-red-400 font-semibold">Something went wrong</p>
          <p className="text-[13px] text-ds-on-variant mt-1 font-mono">{error}</p>
          <p className="text-[12px] text-ds-on-variant mt-3 font-mono">
            Fallback: create a token at Settings → CLI tokens, then run{" "}
            <span className="text-ds-primary">deplo login --token</span>
          </p>
        </div>
      )}
    </div>
  );
}
