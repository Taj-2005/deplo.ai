"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getIntegrations } from "@/lib/dashboard-api";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { FeedbackWidget } from "./FeedbackWidget";

function LoadingScreen() {
  return (
    <div className="h-screen ds-dotgrid flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-5 h-5 border-2 border-ds-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] font-mono text-ds-on-variant tracking-[0.08em] uppercase">
          Loading
        </span>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [vercelChecked, setVercelChecked] = useState(false);
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
        const connected = integrations.some(
          (i) => i.provider === "VERCEL" && i.connected,
        );
        if (!connected) {
          router.replace("/onboarding");
        } else {
          setVercelChecked(true);
        }
      })
      .catch(() => {
        // On error don't block the dashboard
        setVercelChecked(true);
      });
  }, [isAuthenticated, router]);

  if (isLoading || !vercelChecked) return <LoadingScreen />;
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
