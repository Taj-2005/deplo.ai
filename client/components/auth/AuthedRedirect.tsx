"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Sends a signed-in visitor from the landing page to their dashboard.
 *
 * Waits for the auth check to finish — redirecting while `isLoading` is true
 * would bounce signed-out visitors on every cold load. `replace` rather than
 * `push` so Back doesn't ping-pong between the two pages.
 *
 * Escape hatch: `/?stay=1` skips the redirect, so a signed-in user (or you,
 * demoing) can still read the marketing page.
 */
export function AuthedRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (new URLSearchParams(window.location.search).has("stay")) return;
    router.replace("/dashboard");
  }, [isAuthenticated, isLoading, router]);

  return null;
}
