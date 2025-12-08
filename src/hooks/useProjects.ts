// src/hooks/useProjects.ts
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { fetchProjects, createProject, Project } from '@/api/projects';

export function useProjects() {
  const { callApi, isAuthenticated } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!activeWorkspaceId || !isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchProjects(callApi, activeWorkspaceId);
      setProjects(data);
    } catch (err: any) {
      console.error('Error loading projects', err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const newProject = async (body: { name: string; description?: string }) => {
    if (!activeWorkspaceId) throw new Error('No active workspace selected');

    try {
      setCreating(true);
      setError(null);

      const project = await createProject(callApi, {
        workspaceId: activeWorkspaceId,
        ...body,
      });

      setProjects((prev) => [...prev, project]);
    } catch (err: any) {
      console.error('Error creating project', err);
      setError(err.message || 'Failed to create project');
      throw err;
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeWorkspaceId) {
      load();
    } else {
      setProjects([]);
    }
  }, [isAuthenticated, activeWorkspaceId]);

  return {
    projects,
    loading,
    creating,
    error,
    reloadProjects: load,
    createProject: newProject,
  };
}
