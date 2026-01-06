// src/hooks/useTasks.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import { useWorkspaceStore } from "../store/workspaceStore";
import {
  fetchTasks,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  createSubtask as apiCreateSubtask,
  updateSubtask as apiUpdateSubtask,
  deleteSubtask as apiDeleteSubtask,
  type Task,
  type TaskStatus,
  type TaskPriority,
  type TaskType,
} from "@/api/tasks";

export function useTasks(projectId?: string) {
  const { callApi } = useAuth();
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMembership = useMemo(
    () => workspaces.find((w) => w.workspaceId === activeWorkspaceId),
    [workspaces, activeWorkspaceId],
  );

  const canEditTasks =
    currentMembership &&
    ["OWNER", "ADMIN", "MEMBER"].includes(currentMembership.role);

  const reloadTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTasks(callApi, projectId);
      setTasks(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [callApi, projectId]);

  useEffect(() => {
    reloadTasks();
  }, [reloadTasks]);

  const createTask = useCallback(
    async (data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: string;
      estimateMinutes?: number | null;
      type?: TaskType;
      parentTaskId?: string;
      assigneeIds?: string[];
    }) => {
      if (!projectId) return;
      try {
        setSaving(true);
        setError(null);
        const task = await apiCreateTask(callApi, {
          projectId,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          dueDate: data.dueDate,
          estimateMinutes: data.estimateMinutes ?? undefined,
          type: data.type,
          parentTaskId: data.parentTaskId,
          assigneeIds: data.assigneeIds,
        });
        setTasks((prev) => [...prev, task]);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to create task");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [callApi, projectId],
  );

  const updateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      try {
        setSaving(true);
        setError(null);
        const task = await apiUpdateTask(callApi, taskId, { status });
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, ...task } : t)),
        );
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to update task");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [callApi],
  );

  const updateTask = useCallback(
    async (body: Partial<Task> & { id: string; assigneeIds?: string[] }) => {
      try {
        setSaving(true);
        setError(null);
        const { id, ...rest } = body;
        const filteredRest = Object.fromEntries(
          Object.entries(rest).filter(([, value]) => value !== null)
        );
        const task = await apiUpdateTask(callApi, id, filteredRest);
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, ...task } : t)),
        );
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to update task");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [callApi],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        setSaving(true);
        setError(null);
        await apiDeleteTask(callApi, taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to delete task");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [callApi],
  );

  const addSubtask = useCallback(
    async (taskId: string, title: string) => {
      try {
        setSaving(true);
        setError(null);
        const subtask = await apiCreateSubtask(callApi, taskId, { title });
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: [...(t.subtasks ?? []), subtask] }
              : t,
          ),
        );
        return subtask;
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to add subtask");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [callApi],
  );

  const updateSubtask = useCallback(
    async (
      taskId: string,
      subtaskId: string,
      data: { title?: string; isCompleted?: boolean },
    ) => {
      try {
        setSaving(true);
        setError(null);
        const subtask = await apiUpdateSubtask(callApi, subtaskId, data);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: (t.subtasks ?? []).map((s) =>
                    s.id === subtask.id ? subtask : s,
                  ),
                }
              : t,
          ),
        );
        return subtask;
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to update subtask");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [callApi],
  );

  const removeSubtask = useCallback(
    async (taskId: string, subtaskId: string) => {
      try {
        setSaving(true);
        setError(null);
        await apiDeleteSubtask(callApi, subtaskId);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: (t.subtasks ?? []).filter(
                    (s) => s.id !== subtaskId,
                  ),
                }
              : t,
          ),
        );
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to remove subtask");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [callApi],
  );

  return {
    tasks,
    loading,
    saving,
    error,
    reloadTasks,
    createTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    addSubtask,
    updateSubtask,
    removeSubtask,
    canEditTasks: Boolean(canEditTasks),
  };
}
