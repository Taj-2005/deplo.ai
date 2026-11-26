"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getIntegrations } from "@/lib/dashboard-api";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { FeedbackWidget } from "./FeedbackWidget";
import { BrandLoader } from "@/components/BrandLoader";

function LoadingScreen() {
  return (
    <div className="h-screen ds-dotgrid flex items-center justify-center">
      <BrandLoader label="Loading" />
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [providerChecked, setProviderChecked] = useState(false);
  const checkStarted = useRef(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  // One-time Vercel connection check — runs once per DashboardShell mount
  useEffect(() => {
    if (!isAuthenticated || checkStarted.current) return;
    checkStarted.current = true;

    getIntegrations()
      .then((integrations) => {
        // Onboarding requires both providers, so the gate enforces the same
        // rule — otherwise navigating straight to /dashboard would bypass it.
        // Checks both by name rather than counting: a future third provider
        // must not silently satisfy the requirement.
        const vercel = integrations.some((i) => i.provider === "VERCEL" && i.connected);
        const render = integrations.some((i) => i.provider === "RENDER" && i.connected);
        if (!vercel || !render) {
          router.replace("/onboarding");
        } else {
          setProviderChecked(true);
        }
      })
      .catch(() => {
        // On error don't block the dashboard
        setProviderChecked(true);
      });
  }, [isAuthenticated, router]);

  if (isLoading || !providerChecked) return <LoadingScreen />;
  if (!isAuthenticated) return null;

  return (
    <div className="h-screen ds-dotgrid text-ds-on-surface flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-14 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto overscroll-none">{children}</main>
      </div>
      <FeedbackWidget />
    </div>
  );
}
