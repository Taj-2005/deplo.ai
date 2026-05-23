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
    load();
  }, [load]);

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
