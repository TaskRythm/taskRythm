"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useWorkspaceStore,
  WorkspaceMembership,
  WorkspaceRole,
} from "@/store/workspaceStore";
import { fetchWorkspaces, createWorkspace, updateWorkspace as updateWorkspaceApi } from "@/api/workspaces";

/**
 * IMPORTANT:
 * Backend might return role as "OWNER" or "owner" (or mixed).
 * Frontend RBAC checks require uppercase.
 */
function normalizeRole(role: any): WorkspaceRole {
  const r = String(role || "OWNER").toUpperCase();
  if (r === "OWNER" || r === "ADMIN" || r === "MEMBER" || r === "VIEWER") {
    return r as WorkspaceRole;
  }
  return "VIEWER";
}

function normalizeList(items: any[]): WorkspaceMembership[] {
  if (!Array.isArray(items)) return [];

  return items.map((item: any) => {
    // Case 1: backend returns membership { workspaceId, role, workspace: {...} }
    if (item.workspace) {
      return {
        workspaceId: item.workspaceId ?? item.workspace.id,
        role: normalizeRole(item.role),
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
      role: normalizeRole(item.role),
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
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const raw = await fetchWorkspaces(callApi);
      const normalized = normalizeList(raw);

      setWorkspaces(normalized);

      // Keep current selection if it still exists, otherwise select first.
      const stillExists =
        activeWorkspaceId &&
        normalized.some((w) => w.workspaceId === activeWorkspaceId);

      if ((!activeWorkspaceId || !stillExists) && normalized.length > 0) {
        setActiveWorkspace(normalized[0].workspaceId);
      }

      setError(null);
    } catch (err: any) {
      // Only set error if it's not a permission/not found error (new users have no workspaces)
      if (err?.status !== 403 && err?.status !== 404) {
        setError(err?.message || "Failed to load workspaces");
      } else {
        setError(null);
      }
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

  const updateWorkspace = async (
    workspaceId: string,
    data: { name?: string; description?: string }
  ) => {
    try {
      setUpdating(true);
      setError(null);

      const res = await updateWorkspaceApi(callApi, workspaceId, data);
      const updated = res?.id ? res : res?.workspace || res;

      setWorkspaces(
        workspaces.map((m) =>
          m.workspaceId === workspaceId
            ? {
                ...m,
                workspace: {
                  ...m.workspace,
                  name: updated.name ?? m.workspace.name,
                  slug: updated.slug ?? m.workspace.slug,
                },
              }
            : m
        )
      );

      return updated;
    } catch (err: any) {
      console.error("Failed to update workspace", err);
      setError(err?.message || "Failed to update workspace");
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return {
    workspaces,
    loading,
    creating,
    updating,
    error,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace: newWorkspace,
    reload: load,
    updateWorkspace,
  };
}