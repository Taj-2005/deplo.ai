"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function useAuthNavigation() {
  const { isAuthenticated, signIn } = useAuth();
  const router = useRouter();

  function launchApp(): void {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      signIn();
    }
  }

  function connectGithub(): void {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      signIn();
    }
  }

  return { isAuthenticated, launchApp, connectGithub };
}
