"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Minimal nav */}
      <header className="border-b border-[#E2E8F0] h-14 flex items-center px-6 gap-3">
        <Image src="/logo.png" alt="deplo.ai" width={28} height={28} className="object-contain" />
        <span className="text-[14px] font-semibold tracking-[-0.03em]">
          deplo<span className="text-[#94A3B8]">.ai</span>
        </span>
        <div className="flex-1" />
        <span className="text-[12px] text-[#64748B] hidden sm:block">{user?.email}</span>
        <button
          onClick={signOut}
          className="text-[12px] font-medium text-[#64748B] hover:text-black transition-colors px-3 py-1.5 border border-[#E2E8F0] hover:border-black/20"
        >
          Sign out
        </button>
      </header>

      {/* Coming soon body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-[#94A3B8]">
          <span className="w-[5px] h-[5px] bg-green-400 rounded-full animate-pulse" />
          GitHub Connected
        </div>
        <h1 className="text-black font-semibold tracking-[-0.045em] text-center"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
          Dashboard coming soon.
        </h1>
        <p className="text-[#64748B] text-[14px] text-center max-w-sm leading-relaxed">
          You&apos;re authenticated. The deployment dashboard is being built.
          Come back soon — or contribute on GitHub.
        </p>
        <button
          onClick={() => router.push("/")}
          className="text-[13px] font-medium text-[#64748B] hover:text-black transition-colors underline underline-offset-4"
        >
          ← Back to landing page
        </button>
      </div>
    </div>
  );
}
