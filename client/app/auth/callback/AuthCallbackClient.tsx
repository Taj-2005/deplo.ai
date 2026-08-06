"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getIntegrations } from "@/lib/dashboard-api";
import Image from "next/image";

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleCallback } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error || !token) {
      router.replace("/?auth=failed");
      return;
    }

    // Store the JWT first so subsequent API calls include the auth header
    handleCallback(token);

    // A pending in-app destination (e.g. /cli-auth hand-off) wins over the
    // default dashboard/onboarding routing. Same-origin paths only.
    const returnTo = sessionStorage.getItem("deplo_return_to");
    if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      sessionStorage.removeItem("deplo_return_to");
      router.replace(returnTo);
      return;
    }

    // Check if user has already connected Vercel — if not, send to onboarding
    getIntegrations()
      .then((integrations) => {
        const vercelConnected = integrations.some(
          (i) => i.provider === "VERCEL" && i.connected,
        );
        router.replace(vercelConnected ? "/dashboard" : "/onboarding");
      })
      .catch(() => {
        // On any error (e.g. server down), fall through to dashboard
        router.replace("/dashboard");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-white dark:bg-ds-bg">
      <Image src="/logo.png" alt="deplo.ai" width={40} height={40} className="object-contain dark:hidden" />
      <Image src="/logo-dark.png" alt="deplo.ai" width={40} height={40} className="object-contain hidden dark:block" />
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-ds-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] font-mono text-ds-on-variant">Connecting your GitHub account…</p>
      </div>
    </div>
  );
}
