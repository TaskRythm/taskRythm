// src/hooks/useWorkspaceActivity.ts
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { ActivityItem, fetchWorkspaceActivity } from "@/api/activity";

export function useWorkspaceActivity() {
  const { callApi, isAuthenticated } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!activeWorkspaceId || !isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchWorkspaceActivity(callApi, activeWorkspaceId);
      setActivity(data);
    } catch (err: any) {
      console.error("Error loading activity", err);
      setError(err.message || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeWorkspaceId) {
      load();
    } else {
      setActivity([]);
    }
  }, [isAuthenticated, activeWorkspaceId]);

  return {
    activity,
    loading,
    error,
    reloadActivity: load,
  };
}
