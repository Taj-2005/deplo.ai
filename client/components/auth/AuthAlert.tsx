"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function AuthAlert() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("auth") === "failed") {
      setVisible(true);
      window.history.replaceState(null, "", "/");
    }
  }, [searchParams]);

  const reason = searchParams.get("reason");
  const reasonText =
    reason === "server"
      ? "API server error during sign-in."
      : reason === "unreachable"
        ? "Could not reach the API server."
        : reason === "callback"
          ? "OAuth callback failed."
          : "GitHub sign-in failed.";

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-black text-white text-[13px] px-4 py-3 shadow-lg max-w-sm w-[calc(100%-2rem)]"
    >
      <span className="flex-1">{reasonText} Check server logs and GitHub App callback URL.</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="text-white/70 hover:text-white text-[12px] shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
