"use client";

import { useEffect, useState } from "react";

interface AuthFailureState {
  failed: boolean;
  reason: string | null;
}

function readAuthFailure(): AuthFailureState {
  if (typeof window === "undefined") {
    return { failed: false, reason: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    failed: params.get("auth") === "failed",
    reason: params.get("reason"),
  };
}

export function AuthAlert() {
  const [failure] = useState(readAuthFailure);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (failure.failed) {
      window.history.replaceState(null, "", "/");
    }
  }, [failure.failed]);

  const reasonText =
    failure.reason === "server"
      ? "API server error during sign-in."
      : failure.reason === "unreachable"
        ? "Could not reach the API server."
        : failure.reason === "callback"
          ? "OAuth callback failed."
          : "GitHub sign-in failed.";

  if (!failure.failed || dismissed) return null;

  return (
    <div
      role="alert"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-black text-white text-[13px] px-4 py-3 shadow-lg max-w-sm w-[calc(100%-2rem)]"
    >
      <span className="flex-1">
        {reasonText} Check server logs and GitHub App callback URL.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-white/70 hover:text-white text-[12px] shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
