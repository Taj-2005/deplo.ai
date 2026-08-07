"use client";

import { useState, useEffect, useCallback } from "react";
import type { Repository, Deployment, DashboardStats, AsyncState } from "@/types/dashboard";
import {
  fetchRepositories,
  fetchDeployments,
  fetchDashboardStats,
} from "@/lib/dashboard-api";

function useAsyncData<T>(
  fetcher: () => Promise<T>
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, error: null, loading: false });
    } catch (err) {
      setState({
        data: null,
        error: err instanceof Error ? err.message : "Something went wrong",
        loading: false,
      });
    }
  }, [fetcher]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    // The backend runs on Render and may be cold-starting — keep retrying
    // with backoff (2s → 4s → 8s → 15s cap, ~2.5 min total) so every page
    // fills in the moment the server is live. Loading stays true throughout
    // so the UI shows skeletons, not a transient error.
    const attempt = async (n: number) => {
      try {
        const data = await fetcher();
        if (cancelled) return;
        setState({ data, error: null, loading: false });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Something went wrong";
        const isAuthError = /unauthorized|forbidden/i.test(message);
        if (!isAuthError && n < 12) {
          timer = setTimeout(() => void attempt(n + 1), Math.min(2000 * 2 ** n, 15_000));
          return;
        }
        setState({ data: null, error: message, loading: false });
      }
    };
    void attempt(0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetcher]);

  return { ...state, refetch: load };
}

export function useRepositories() {
  const fetcher = useCallback(() => fetchRepositories(), []);
  return useAsyncData<Repository[]>(fetcher);
}

export function useDeployments() {
  const fetcher = useCallback(() => fetchDeployments(), []);
  return useAsyncData<Deployment[]>(fetcher);
}

export function useDashboardStats() {
  const fetcher = useCallback(() => fetchDashboardStats(), []);
  return useAsyncData<DashboardStats>(fetcher);
}
