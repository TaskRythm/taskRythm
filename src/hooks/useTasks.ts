// src/hooks/useTasks.ts
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Task,
  TaskStatus,
  fetchTasks,
  createTask,
  updateTask,
} from "@/api/tasks";

export function useTasks(projectId: string | null | undefined) {
  const { callApi, isAuthenticated } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const newTask = async (body: { title: string; description?: string }) => {
    if (!projectId) throw new Error("No project selected");

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

  const changeStatus = async (taskId: string, status: TaskStatus) => {
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

  useEffect(() => {
    if (isAuthenticated && projectId) {
      load();
    } else {
      setTasks([]);
    }
  }, [isAuthenticated, projectId]);

  return {
    tasks,
    loading,
    saving,
    error,
    reloadTasks: load,
    createTask: newTask,
    updateTaskStatus: changeStatus,
  };
}
