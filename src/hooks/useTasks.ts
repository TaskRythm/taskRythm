"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceStore } from "@/store/workspaceStore";
import {
  Task,
  TaskStatus,
  TaskType,
  TaskPriority,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask as deleteTaskApi,
  createSubtask as createSubtaskApi,
  updateSubtask as updateSubtaskApi,
  deleteSubtask as deleteSubtaskApi,
} from "@/api/tasks";
import { canManageTasks } from "@/lib/rbac";

export function useTasks(projectId: string | null | undefined) {
  const { callApi, isAuthenticated } = useAuth();
  const { activeWorkspaceId, workspaces } = useWorkspaceStore();

  // Current role in the active workspace
  const currentRole = useMemo(
    () =>
      workspaces.find((w) => w.workspaceId === activeWorkspaceId)?.role ??
      null,
    [workspaces, activeWorkspaceId]
  );

  const canEditTasks = canManageTasks(currentRole);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- load list ----------

  const load = async () => {
    if (!projectId || !isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchTasks(callApi, projectId);
      setTasks(data);
    } catch (err: any) {
      console.error("Error loading tasks", err);
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  // ---------- create task ----------

  const newTask = async (body: { title: string; description?: string }) => {
    if (!projectId) throw new Error("No project selected");

    if (!canEditTasks) {
      const msg = "You don't have permission to create tasks in this workspace.";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setSaving(true);
      setError(null);

      const task = await createTask(callApi, {
        projectId,
        ...body,
      });

      setTasks((prev) => [...prev, task]);
    } catch (err: any) {
      console.error("Error creating task", err);
      setError(err.message || "Failed to create task");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ---------- update status only (← / → buttons) ----------

  const changeStatus = async (taskId: string, status: TaskStatus) => {
    if (!canEditTasks) {
      const msg = "You don't have permission to update tasks in this workspace.";
      setError(msg);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updated = await updateTask(callApi, taskId, { status });

      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err: any) {
      console.error("Error updating task", err);
      setError(err.message || "Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  // ---------- full edit from modal ----------

  const editTask = async (params: {
    id: string;
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string; // ISO
    estimateMinutes?: number | null;
    type?: TaskType;
    parentTaskId?: string | null;
  }) => {
    if (!canEditTasks) {
      const msg = "You don't have permission to edit tasks in this workspace.";
      setError(msg);
      throw new Error(msg);
    }

    const { id, ...data } = params;

    try {
      setSaving(true);
      setError(null);

      const updated = await updateTask(callApi, id, data);

      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    } catch (err: any) {
      console.error("Error editing task", err);
      setError(err.message || "Failed to edit task");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ---------- delete task ----------

  const removeTask = async (id: string) => {
    if (!canEditTasks) {
      const msg = "You don't have permission to delete tasks in this workspace.";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setSaving(true);
      setError(null);

      await deleteTaskApi(callApi, id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      console.error("Error deleting task", err);
      setError(err.message || "Failed to delete task");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ---------- subtasks ----------

  const addSubtask = async (taskId: string, title: string) => {
    if (!canEditTasks) {
      const msg = "You don't have permission to edit tasks in this workspace.";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setSaving(true);
      setError(null);

      const subtask = await createSubtaskApi(callApi, taskId, { title });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: [...(t.subtasks ?? []), subtask],
              }
            : t
        )
      );
      return subtask;
    } catch (err: any) {
      console.error("Error creating subtask", err);
      setError(err.message || "Failed to create subtask");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const updateSubtask = async (
    taskId: string,
    subtaskId: string,
    data: { title?: string; isCompleted?: boolean }
  ) => {
    if (!canEditTasks) {
      const msg = "You don't have permission to edit tasks in this workspace.";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setSaving(true);
      setError(null);

      const updated = await updateSubtaskApi(callApi, subtaskId, data);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: (t.subtasks ?? []).map((s) =>
                  s.id === subtaskId ? updated : s
                ),
              }
            : t
        )
      );
      return updated;
    } catch (err: any) {
      console.error("Error updating subtask", err);
      setError(err.message || "Failed to update subtask");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const removeSubtask = async (taskId: string, subtaskId: string) => {
    if (!canEditTasks) {
      const msg = "You don't have permission to edit tasks in this workspace.";
      setError(msg);
      throw new Error(msg);
    }

    try {
      setSaving(true);
      setError(null);

      await deleteSubtaskApi(callApi, subtaskId);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: (t.subtasks ?? []).filter((s) => s.id !== subtaskId),
              }
            : t
        )
      );
    } catch (err: any) {
      console.error("Error deleting subtask", err);
      setError(err.message || "Failed to delete subtask");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ---------- effect ----------

  useEffect(() => {
    if (isAuthenticated && projectId) {
      void load();
    } else {
      setTasks([]);
    }
  }, [isAuthenticated, projectId]);

  return {
    tasks,
    loading,
    saving,
    error,
    canEditTasks,

    reloadTasks: load,
    createTask: newTask,
    updateTaskStatus: changeStatus,
    updateTask: editTask,
    deleteTask: removeTask,

    addSubtask,
    updateSubtask,
    removeSubtask,
  };
}