// src/hooks/useProjects.ts
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceStore } from '@/store/workspaceStore';
import {
  fetchProjects,
  createProject,
  updateProject as updateProjectApi,
  Project,
} from '@/api/projects';

export function useProjects() {
  const { callApi, isAuthenticated } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!activeWorkspaceId || !isAuthenticated) {
      setProjects([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchProjects(callApi, activeWorkspaceId);
      setProjects(data);
    } catch (err: any) {
      // Suppress error if workspace is new (no projects yet)
      if (err?.status !== 403 && err?.status !== 404) {
        setError(err.message || 'Failed to load projects');
      } else {
        setError(null);
      }
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

  const updateProject = async (
    projectId: string,
    body: Partial<Pick<Project, 'name' | 'description' | 'archived'>>,
  ) => {
    if (!activeWorkspaceId) throw new Error('No active workspace selected');

    try {
      setUpdating(true);
      setError(null);

      const updated = await updateProjectApi(callApi, projectId, body);

      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId ? { ...project, ...updated } : project,
        ),
      );

      return updated;
    } catch (err: any) {
      console.error('Error updating project', err);
      setError(err.message || 'Failed to update project');
      throw err;
    } finally {
      setUpdating(false);
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
    updating,
    error,
    reloadProjects: load,
    createProject: newProject,
    updateProject,
  };
}
