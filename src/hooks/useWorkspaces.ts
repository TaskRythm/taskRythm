'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface WorkspaceDto {
  workspaceId: string;
  role: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

export interface CreateWorkspacePayload {
  name: string;
  description?: string;
}

export function useWorkspaces() {
  const { callApi, isAuthenticated } = useAuth();

  const [data, setData] = useState<WorkspaceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await callApi('workspaces'); // GET /workspaces
      setData(res);
    } catch (err: any) {
      console.error('Failed to fetch workspaces', err);
      setError(err?.message ?? 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, [callApi, isAuthenticated]);

  const createWorkspace = useCallback(
    async (payload: CreateWorkspacePayload) => {
      if (!isAuthenticated) return null;
      setCreating(true);
      setError(null);
      try {
        const res = await callApi('workspaces', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json',
          },
        });
        await fetchWorkspaces();
        return res.workspace;
      } catch (err: any) {
        console.error('Failed to create workspace', err);
        setError(err?.message ?? 'Failed to create workspace');
        return null;
      } finally {
        setCreating(false);
      }
    },
    [callApi, fetchWorkspaces, isAuthenticated],
  );

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return {
    workspaces: data,
    loading,
    creating,
    error,
    refetch: fetchWorkspaces,
    createWorkspace,
  };
}