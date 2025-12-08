"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useWorkspaceStore,
  WorkspaceMembership,
  WorkspaceRole,
} from "@/store/workspaceStore";
import { fetchWorkspaces, createWorkspace } from "@/api/workspaces";

function normalizeList(items: any[]): WorkspaceMembership[] {
  if (!Array.isArray(items)) return [];

  return items.map((item: any) => {
    // Case 1: backend returns membership { workspaceId, role, workspace: {...} }
    if (item.workspace) {
      return {
        workspaceId: item.workspaceId ?? item.workspace.id,
        role: (item.role as WorkspaceRole) ?? "OWNER",
        workspace: {
          id: item.workspace.id,
          name: item.workspace.name,
          slug: item.workspace.slug,
          createdAt: item.workspace.createdAt ?? new Date().toISOString(),
        },
      };
    }

    // Case 2: backend returns plain workspace { id, name, slug, createdAt }
    return {
      workspaceId: item.id,
      role: (item.role as WorkspaceRole) ?? "OWNER",
      workspace: {
        id: item.id,
        name: item.name,
        slug: item.slug,
        createdAt: item.createdAt ?? new Date().toISOString(),
      },
    };
  });
}

export function useWorkspaces() {
  const { callApi, isAuthenticated } = useAuth();
  const {
    workspaces,
    activeWorkspaceId,
    setWorkspaces,
    setActiveWorkspace,
    loading,
    setLoading,
    creating,
    setCreating,
    error,
    setError,
  } = useWorkspaceStore();

  const load = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const raw = await fetchWorkspaces(callApi);
      const normalized = normalizeList(raw);

      setWorkspaces(normalized);

      // Auto-select first workspace if nothing selected yet
      if (!activeWorkspaceId && normalized.length > 0) {
        setActiveWorkspace(normalized[0].workspaceId);
      }

      setError(null);
    } catch (err: any) {
      console.error("Failed to load workspaces", err);
      setError(err?.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  };

  const newWorkspace = async (body: { name: string; description?: string }) => {
    try {
      setCreating(true);
      const ws = await createWorkspace(callApi, body);
      const [membership] = normalizeList([ws]);

      const next = [...workspaces, membership];
      setWorkspaces(next);

      // If this is the first workspace, auto-select it
      if (!activeWorkspaceId) {
        setActiveWorkspace(membership.workspaceId);
      }

      setError(null);
    } catch (err: any) {
      console.error("Failed to create workspace", err);
      setError(err?.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void load();
    }
  }, [isAuthenticated]);

  return {
    workspaces,
    loading,
    creating,
    error,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace: newWorkspace,
    reload: load,
  };
}