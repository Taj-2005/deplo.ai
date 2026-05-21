"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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

    handleCallback(token);
    router.replace("/dashboard");
  }, [searchParams, handleCallback, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-white">
      <Image src="/logo.png" alt="deplo.ai" width={40} height={40} className="object-contain" />
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#64748B]">Connecting your GitHub account…</p>
      </div>
    </div>
  );
}
