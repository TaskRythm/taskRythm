"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { refineTask } from "@/api/ai";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Loader2, ArrowLeft, CheckCircle2, Clock, Calendar, Flag, Tag, Users, Plus, Trash2, AlertTriangle, Save, X } from "lucide-react";

import {
  useWorkspaceStore,
  type WorkspaceRole,
} from "@/store/workspaceStore";

import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";

import type {
  Task,
  TaskStatus,
  TaskType,
  TaskPriority,
} from "@/api/tasks";

function formatDate(dateString?: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function formatEstimateMinutes(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

const STATUS_FLOW: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

const ISSUE_TYPE_LABELS: Record<TaskType, string> = {
  TASK: "Task",
  BUG: "Bug",
  FEATURE: "Feature",
  IMPROVEMENT: "Improvement",
  SPIKE: "Spike",
};

const ISSUE_TYPE_COLORS: Record<TaskType, string> = {
  TASK: "#667eea",
  BUG: "#ef4444",
  FEATURE: "#3b82f6",
  IMPROVEMENT: "#8b5cf6",
  SPIKE: "#f59e0b",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  BLOCKED: "#ef4444",
  DONE: "#10b981",
};

export default function ProjectPage() {
  const params = useParams() as { projectId: string };
  const router = useRouter();
  const projectId = params.projectId;

  useWorkspaces();

  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { projects, loading: projectsLoading } = useProjects();

  const {
    tasks,
    loading: tasksLoading,
    saving: tasksSaving,
    error: tasksError,
    reloadTasks,
    createTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    addSubtask,
    updateSubtask,
    removeSubtask,
    canEditTasks,
  } = useTasks(projectId);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("TODO");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [editHours, setEditHours] = useState<string>("");
  const [editMinutes, setEditMinutes] = useState<string>("");
  const [editType, setEditType] = useState<TaskType>("TASK");
  const [editError, setEditError] = useState<string | null>(null);

  const [editParentTaskId, setEditParentTaskId] = useState<string | null>(null);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentWorkspaceMembership = useMemo(
    () => workspaces.find((w) => w.workspaceId === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  );

  const currentRole: WorkspaceRole | null =
    currentWorkspaceMembership?.role ?? null;

  const project = useMemo(
    () => projects.find((p: any) => p.id === projectId),
    [projects, projectId],
  );

  const workspaceName = useMemo(() => {
    const ws =
      workspaces.find((w: any) => w.workspaceId === activeWorkspaceId) ??
      workspaces[0];
    return ws ? ws.workspace.name : "";
  }, [workspaces, activeWorkspaceId]);

  useEffect(() => {
    if (!projectsLoading && !project) {
      console.warn("Project not found, redirecting to /");
    }
  }, [projectsLoading, project]);

  const [isRefining, setIsRefining] = useState(false);
  const { getAccessTokenSilently } = useAuth();

  const selectedTaskHasChildren = useMemo(
    () => (selectedTask ? tasks.some((t) => t.parentTaskId === selectedTask.id) : false),
    [tasks, selectedTask],
  );

  const handleRefineTask = async () => {
    if (!editTitle || !editTitle.trim()) return;

    setIsRefining(true);
    setEditError(null);

    try {
      const token = await getAccessTokenSilently();
      const result = await refineTask(editTitle, token);

      setEditTitle(result.newTitle || editTitle);
      setEditDesc(result.description || "");

      if (result.priority) {
        const prio = String(result.priority).toUpperCase();
        if (["LOW", "MEDIUM", "HIGH"].includes(prio)) {
          setEditPriority(prio as TaskPriority);
        }
      }

      if (selectedTask && result.subtasks && Array.isArray(result.subtasks)) {
        for (const subTitle of result.subtasks) {
          if (!subTitle) continue;

          const newSubtask = await addSubtask(selectedTask.id, subTitle);

          setSelectedTask((prev) => {
            if (!prev) return null;
            return { ...prev, subtasks: [...(prev.subtasks || []), newSubtask] };
          });
        }

        if (typeof reloadTasks === "function") {
          await reloadTasks();
        }
      }
    } catch (err) {
      console.error("AI Refine Error:", err);
      setEditError("Failed to refine task. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (!canEditTasks) {
      setLocalError("You don't have permission to create tasks in this workspace.");
      return;
    }

    try {
      setLocalError(null);
      await createTask({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
      });
      setNewTitle("");
      setNewDesc("");
    } catch (err: any) {
      setLocalError(err.message || "Failed to create task");
    }
  };

  const moveTask = async (
    taskId: string,
    current: TaskStatus,
    direction: "left" | "right",
  ) => {
    if (!canEditTasks) return;

    const index = STATUS_FLOW.indexOf(current);
    if (index === -1) return;

    const nextIndex =
      direction === "right"
        ? Math.min(STATUS_FLOW.length - 1, index + 1)
        : Math.max(0, index - 1);

    const nextStatus = STATUS_FLOW[nextIndex];
    if (nextStatus === current) return;

    await updateTaskStatus(taskId, nextStatus);
  };

  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const topLevelTasks = tasks.filter((t) => !t.parentTaskId);
  const childrenByParent: Record<string, Task[]> = {};

  tasks.forEach((t) => {
    if (t.parentTaskId) {
      if (!childrenByParent[t.parentTaskId]) {
        childrenByParent[t.parentTaskId] = [];
      }
      childrenByParent[t.parentTaskId].push(t);
    }
  });

  const tasksByStatus: Record<TaskStatus, Task[]> = {
    TODO: [],
    IN_PROGRESS: [],
    BLOCKED: [],
    DONE: [],
  };

  topLevelTasks.forEach((t) => {
    if (!tasksByStatus[t.status]) return;
    tasksByStatus[t.status].push(t);
  });

  const columns: { key: TaskStatus; title: string; accent: string; bgColor: string }[] = [
    { key: "TODO", title: "To Do", accent: "#f1f5f9", bgColor: "#f8fafc" },
    { key: "IN_PROGRESS", title: "In Progress", accent: "#dbeafe", bgColor: "#eff6ff" },
    { key: "BLOCKED", title: "Blocked", accent: "#fee2e2", bgColor: "#fef2f2" },
    { key: "DONE", title: "Done", accent: "#d1fae5", bgColor: "#f0fdf4" },
  ];

  const eligibleParents = useMemo(
    () =>
      selectedTask
        ? tasks.filter(
            (t) =>
              t.projectId === selectedTask.projectId &&
              !t.parentTaskId &&
              t.id !== selectedTask.id,
          )
        : [],
    [tasks, selectedTask],
  );

  const handleOpenTask = (task: Task) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setEditStatus(task.status);
    setEditPriority((task.priority as TaskPriority) || "MEDIUM");
    setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");

    if (typeof task.estimateMinutes === "number" && task.estimateMinutes > 0) {
      const hours = Math.floor(task.estimateMinutes / 60);
      const mins = task.estimateMinutes % 60;
      setEditHours(hours > 0 ? String(hours) : "");
      setEditMinutes(mins > 0 ? String(mins) : "");
    } else {
      setEditHours("");
      setEditMinutes("");
    }

    setEditType((task.type as TaskType) || "TASK");
    setNewSubtaskTitle("");
    setEditError(null);
    setEditParentTaskId(task.parentTaskId ?? null);
  };

  const handleCloseTaskModal = () => {
    if (tasksSaving) return;

    setSelectedTask(null);
    setEditTitle("");
    setEditDesc("");
    setEditStatus("TODO");
    setEditPriority("MEDIUM");
    setEditDueDate("");
    setEditHours("");
    setEditMinutes("");
    setEditType("TASK");
    setNewSubtaskTitle("");
    setEditError(null);
    setEditParentTaskId(null);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditError("Title is required.");
      return;
    }

    const hoursRaw = editHours.trim();
    const minutesRaw = editMinutes.trim();
    let totalMinutes: number | null = null;

    if (hoursRaw !== "" || minutesRaw !== "") {
      const h = hoursRaw === "" ? 0 : Number(hoursRaw);
      const m = minutesRaw === "" ? 0 : Number(minutesRaw);

      if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || m < 0 || m > 59) {
        setEditError("Estimate must be a valid time (hours ≥ 0, minutes between 0–59).");
        return;
      }

      totalMinutes = h * 60 + m;
    }

    const parentTaskIdPayload =
      selectedTaskHasChildren ? undefined : editParentTaskId ?? null;

    try {
      setEditError(null);

      await updateTask({
        id: selectedTask.id,
        title: trimmedTitle,
        description: editDesc.trim() || undefined,
        status: editStatus,
        priority: editPriority,
        dueDate: editDueDate || undefined,
        estimateMinutes: totalMinutes,
        type: editType,
        parentTaskId: parentTaskIdPayload,
      });

      if (typeof reloadTasks === "function") {
        await reloadTasks();
      }

      handleCloseTaskModal();
    } catch (err: any) {
      setEditError(err.message || "Failed to update task");
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      setEditError(null);
      await deleteTask(selectedTask.id);
      setShowDeleteConfirm(false);
      handleCloseTaskModal();
    } catch (err: any) {
      setEditError(err.message || "Failed to delete task");
      setShowDeleteConfirm(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!selectedTask) return;
    const title = newSubtaskTitle.trim();
    if (!title) return;

    try {
      const created = await addSubtask(selectedTask.id, title);
      setSelectedTask((prev) =>
        prev
          ? { ...prev, subtasks: [...(prev.subtasks ?? []), created] }
          : prev,
      );
      setNewSubtaskTitle("");
    } catch {
      // error handled by hook
    }
  };

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    if (!selectedTask) return;

    try {
      const updated = await updateSubtask(selectedTask.id, subtaskId, {
        isCompleted: !isCompleted,
      });

      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: (prev.subtasks ?? []).map((s) =>
                s.id === subtaskId ? updated : s,
              ),
            }
          : prev,
      );
    } catch {
      // error handled by hook
    }
  };

  const handleRemoveSubtask = async (subtaskId: string) => {
    if (!selectedTask) return;

    try {
      await removeSubtask(selectedTask.id, subtaskId);
      setSelectedTask((prev) =>
        prev
          ? { ...prev, subtasks: (prev.subtasks ?? []).filter((s) => s.id !== subtaskId) }
          : prev,
      );
    } catch {
      // error handled by hook
    }
  };

  const isReadOnly = !canEditTasks;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%)",
        paddingBottom: "40px",
      }}
    >
      {/* Enhanced Top Bar */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderBottom: "none",
          padding: "24px 0",
          boxShadow: "0 4px 20px rgba(102, 126, 234, 0.25)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          opacity: 0.4
        }} />
        
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <button
            onClick={() => router.push("/")}
            style={{
              border: "none",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
              color: "white",
              fontSize: "14px",
              cursor: "pointer",
              marginBottom: "16px",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
          >
            <ArrowLeft size={16} /> Back to dashboard
          </button>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color: "white",
                  marginBottom: "8px",
                  letterSpacing: "-0.5px",
                }}
              >
                {project?.name || "Project"}
              </h1>
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(255, 255, 255, 0.9)",
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                Workspace: <strong>{workspaceName}</strong>
                {currentRole && (
                  <>
                    {" "}
                    · Your role: <strong>{currentRole}</strong>
                  </>
                )}
                {project?.createdAt && (
                  <>
                    {" "}
                    · Created {formatDate(project.createdAt)}
                  </>
                )}
              </p>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                padding: "16px 20px",
                borderRadius: "12px",
                fontSize: "14px",
                color: "white",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
                minWidth: "200px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <CheckCircle2 size={18} />
                <span style={{ fontWeight: 700 }}>Progress</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                <span>Tasks: <strong>{tasks.length}</strong></span>
                <span>Done: <strong>{completedTasks}</strong></span>
              </div>
              <div style={{ height: "8px", background: "rgba(255, 255, 255, 0.3)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ 
                  height: "100%", 
                  background: "white", 
                  width: `${progressPercent}%`,
                  borderRadius: "10px",
                  transition: "width 0.5s ease",
                  boxShadow: "0 0 8px rgba(255, 255, 255, 0.5)"
                }} />
              </div>
              <div style={{ marginTop: "6px", fontSize: "16px", fontWeight: 800, textAlign: "center" }}>
                {progressPercent}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container" style={{ marginTop: "32px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr",
            gap: "28px",
            alignItems: "flex-start",
          }}
        >
          {/* LEFT: Enhanced Kanban board */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
              }}>
                <Tag size={18} color="white" />
              </div>
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  margin: 0,
                  color: "#1e293b",
                  letterSpacing: "-0.3px",
                }}
              >
                Tasks Kanban Board
              </h2>
            </div>

            {!canEditTasks && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "2px solid #e2e8f0",
                  background: "#f8fafc",
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <AlertTriangle size={16} color="#64748b" />
                You have view-only access in this workspace. Task editing is disabled.
              </div>
            )}

            {tasksError && (
              <div
                style={{
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#ef4444",
                  background: "#fef2f2",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid #fecaca",
                  fontWeight: 600,
                }}
              >
                {tasksError}
              </div>
            )}

            {tasksLoading ? (
              <div style={{ 
                fontSize: "16px", 
                color: "#64748b",
                textAlign: "center",
                padding: "60px 20px",
                background: "white",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
              }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    margin: "0 auto 16px",
                    borderRadius: "50%",
                    border: "4px solid #e2e8f0",
                    borderTopColor: "#667eea",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Loading tasks…
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: "20px",
                  alignItems: "flex-start",
                }}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    style={{
                      background: col.bgColor,
                      borderRadius: "16px",
                      border: `2px solid ${col.accent}`,
                      padding: "16px",
                      minHeight: "140px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    }}
                  >
                    {/* Column header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "14px",
                        paddingBottom: "12px",
                        borderBottom: `2px solid ${col.accent}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: STATUS_COLORS[col.key],
                        }} />
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 800,
                            color: "#1e293b",
                            letterSpacing: "-0.2px",
                          }}
                        >
                          {col.title}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "20px",
                          background: "white",
                          color: STATUS_COLORS[col.key],
                          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
                        }}
                      >
                        {tasksByStatus[col.key].length}
                      </span>
                    </div>

                    {/* Column tasks */}
                    {tasksByStatus[col.key].length === 0 ? (
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#94a3b8",
                          fontStyle: "italic",
                          textAlign: "center",
                          padding: "20px 10px",
                        }}
                      >
                        No tasks here
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {tasksByStatus[col.key].map((task) => {
                          const children = childrenByParent[task.id] ?? [];

                          return (
                            <div
                              key={task.id}
                              onClick={() => handleOpenTask(task)}
                              style={{
                                padding: "14px",
                                borderRadius: "12px",
                                border: "1px solid #e2e8f0",
                                background: "white",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.12)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "14px",
                                  fontWeight: 700,
                                  color: "#1e293b",
                                  lineHeight: "1.4",
                                }}
                              >
                                {task.title}
                              </div>
                              {task.description && (
                                <div style={{ 
                                  fontSize: "12px", 
                                  color: "#64748b",
                                  lineHeight: "1.5",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                }}>
                                  {task.description}
                                </div>
                              )}

                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                  marginTop: "4px",
                                }}
                              >
                                {/* Badges row */}
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "6px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "6px",
                                      alignItems: "center",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {task.type && (
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          fontWeight: 700,
                                          padding: "4px 8px",
                                          borderRadius: "6px",
                                          background: ISSUE_TYPE_COLORS[task.type as TaskType] + "15",
                                          color: ISSUE_TYPE_COLORS[task.type as TaskType],
                                          textTransform: "uppercase",
                                          letterSpacing: "0.5px",
                                          border: `1px solid ${ISSUE_TYPE_COLORS[task.type as TaskType]}30`,
                                        }}
                                      >
                                        {ISSUE_TYPE_LABELS[task.type as TaskType]}
                                      </span>
                                    )}

                                    {typeof task.estimateMinutes === "number" &&
                                      task.estimateMinutes > 0 && (
                                        <span
                                          style={{
                                            fontSize: "10px",
                                            fontWeight: 600,
                                            padding: "4px 8px",
                                            borderRadius: "6px",
                                            border: "1px solid #e2e8f0",
                                            color: "#64748b",
                                            background: "white",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                          }}
                                        >
                                          <Clock size={10} />
                                          {formatEstimateMinutes(task.estimateMinutes)}
                                        </span>
                                      )}

                                    {task.priority && (
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          fontWeight: 700,
                                          padding: "4px 8px",
                                          borderRadius: "6px",
                                          background: PRIORITY_COLORS[task.priority as TaskPriority] + "15",
                                          color: PRIORITY_COLORS[task.priority as TaskPriority],
                                          border: `1px solid ${PRIORITY_COLORS[task.priority as TaskPriority]}30`,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                        }}
                                      >
                                        <Flag size={10} />
                                        {PRIORITY_LABELS[task.priority as TaskPriority]}
                                      </span>
                                    )}
                                  </div>

                                  {task.dueDate && (
                                    <div style={{ 
                                      fontSize: "10px", 
                                      color: "#64748b",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      fontWeight: 600,
                                    }}>
                                      <Calendar size={10} />
                                      {formatDate(task.dueDate)}
                                    </div>
                                  )}
                                </div>

                                {/* Movement buttons */}
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: "6px",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveTask(task.id, task.status, "left");
                                    }}
                                    disabled={
                                      tasksSaving ||
                                      !canEditTasks ||
                                      STATUS_FLOW.indexOf(task.status) === 0
                                    }
                                    style={{
                                      padding: "4px 10px",
                                      fontSize: "12px",
                                      borderRadius: "6px",
                                      border: "1px solid #e2e8f0",
                                      background: "white",
                                      color: "#64748b",
                                      cursor:
                                        tasksSaving ||
                                        !canEditTasks ||
                                        STATUS_FLOW.indexOf(task.status) === 0
                                          ? "not-allowed"
                                          : "pointer",
                                      fontWeight: 600,
                                      transition: "all 0.2s ease",
                                      opacity: 
                                        tasksSaving ||
                                        !canEditTasks ||
                                        STATUS_FLOW.indexOf(task.status) === 0 ? 0.4 : 1,
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!(tasksSaving || !canEditTasks || STATUS_FLOW.indexOf(task.status) === 0)) {
                                        e.currentTarget.style.background = "#f8fafc";
                                        e.currentTarget.style.borderColor = "#cbd5e1";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "white";
                                      e.currentTarget.style.borderColor = "#e2e8f0";
                                    }}
                                  >
                                    ←
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveTask(task.id, task.status, "right");
                                    }}
                                    disabled={
                                      tasksSaving ||
                                      !canEditTasks ||
                                      STATUS_FLOW.indexOf(task.status) === STATUS_FLOW.length - 1
                                    }
                                    style={{
                                      padding: "4px 10px",
                                      fontSize: "12px",
                                      borderRadius: "6px",
                                      border: "1px solid #e2e8f0",
                                      background: "white",
                                      color: "#64748b",
                                      cursor:
                                        tasksSaving ||
                                        !canEditTasks ||
                                        STATUS_FLOW.indexOf(task.status) === STATUS_FLOW.length - 1
                                          ? "not-allowed"
                                          : "pointer",
                                      fontWeight: 600,
                                      transition: "all 0.2s ease",
                                      opacity:
                                        tasksSaving ||
                                        !canEditTasks ||
                                        STATUS_FLOW.indexOf(task.status) === STATUS_FLOW.length - 1 ? 0.4 : 1,
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!(tasksSaving || !canEditTasks || STATUS_FLOW.indexOf(task.status) === STATUS_FLOW.length - 1)) {
                                        e.currentTarget.style.background = "#f8fafc";
                                        e.currentTarget.style.borderColor = "#cbd5e1";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "white";
                                      e.currentTarget.style.borderColor = "#e2e8f0";
                                    }}
                                  >
                                    →
                                  </button>
                                </div>
                              </div>

                              {/* Child tasks preview */}
                              {children.length > 0 && (
                                <div
                                  style={{
                                    marginTop: "8px",
                                    paddingTop: "12px",
                                    borderTop: "2px solid #f1f5f9",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px",
                                  }}
                                >
                                  <div style={{ 
                                    fontSize: "11px", 
                                    fontWeight: 700, 
                                    color: "#64748b",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}>
                                    <Users size={12} />
                                    Child Tasks ({children.filter((c) => c.status === "DONE").length}/{children.length})
                                  </div>

                                  {children.map((child) => (
                                    <div
                                      key={child.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenTask(child);
                                      }}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        fontSize: "11px",
                                        padding: "6px 8px",
                                        borderRadius: "8px",
                                        background: "#f8fafc",
                                        cursor: "pointer",
                                        border: "1px solid #e2e8f0",
                                        transition: "all 0.15s ease",
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "white";
                                        e.currentTarget.style.borderColor = "#cbd5e1";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "#f8fafc";
                                        e.currentTarget.style.borderColor = "#e2e8f0";
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: "8px",
                                          height: "8px",
                                          borderRadius: "50%",
                                          flexShrink: 0,
                                          background: STATUS_COLORS[child.status],
                                          boxShadow: `0 0 0 2px ${STATUS_COLORS[child.status]}20`,
                                        }}
                                      />
                                      <span
                                        style={{
                                          flex: 1,
                                          color: "#1e293b",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {child.title}
                                      </span>

                                      <span
                                        style={{
                                          textTransform: "uppercase",
                                          letterSpacing: "0.5px",
                                          fontSize: "9px",
                                          color: "#94a3b8",
                                          flexShrink: 0,
                                          fontWeight: 700,
                                        }}
                                      >
                                        {child.status.replace("_", " ")}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Enhanced New task form */}
            {canEditTasks ? (
              <div
                style={{
                  marginTop: "28px",
                  background: "white",
                  borderRadius: "16px",
                  border: "2px solid #e2e8f0",
                  padding: "24px",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                  }}>
                    <Plus size={18} color="white" />
                  </div>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "#1e293b",
                      margin: 0,
                      letterSpacing: "-0.2px",
                    }}
                  >
                    Add New Task
                  </h3>
                </div>

                {(localError || tasksError) && (
                  <div style={{ 
                    fontSize: "13px", 
                    color: "#ef4444", 
                    marginBottom: "16px",
                    background: "#fef2f2",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1px solid #fecaca",
                    fontWeight: 600,
                  }}>
                    {localError || tasksError}
                  </div>
                )}

                <div style={{ display: "grid", gap: "12px" }}>
                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateTask(e);
                      }
                    }}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "2px solid #e2e8f0",
                      fontSize: "14px",
                      fontWeight: 600,
                      outline: "none",
                      transition: "all 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#10b981";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={3}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "2px solid #e2e8f0",
                      fontSize: "14px",
                      fontWeight: 500,
                      resize: "vertical",
                      outline: "none",
                      transition: "all 0.2s ease",
                      fontFamily: "inherit",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#10b981";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={handleCreateTask}
                      disabled={tasksSaving || !newTitle.trim()}
                      style={{
                        padding: "12px 24px",
                        fontSize: "14px",
                        fontWeight: 700,
                        borderRadius: "10px",
                        border: "none",
                        background: tasksSaving || !newTitle.trim() 
                          ? "#cbd5e1" 
                          : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "white",
                        cursor: tasksSaving || !newTitle.trim() ? "not-allowed" : "pointer",
                        boxShadow: tasksSaving || !newTitle.trim()
                          ? "none"
                          : "0 4px 12px rgba(16, 185, 129, 0.4)",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onMouseEnter={(e) => {
                        if (!tasksSaving && newTitle.trim()) {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.5)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = tasksSaving || !newTitle.trim()
                          ? "none"
                          : "0 4px 12px rgba(16, 185, 129, 0.4)";
                      }}
                    >
                      {tasksSaving ? (
                        <>
                          <div
                            style={{
                              width: "14px",
                              height: "14px",
                              border: "2px solid rgba(255, 255, 255, 0.3)",
                              borderTopColor: "white",
                              borderRadius: "50%",
                              animation: "spin 0.8s linear infinite",
                            }}
                          />
                          Adding…
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Add Task
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: "28px",
                  padding: "20px 24px",
                  borderRadius: "16px",
                  border: "2px dashed #cbd5e1",
                  background: "#f8fafc",
                  fontSize: "14px",
                  color: "#64748b",
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                You can view tasks in this project, but you don't have permission to create or edit them in this workspace.
              </div>
            )}
          </div>

          {/* RIGHT: Enhanced Project Stats */}
          <div>
            <div
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                }}>
                  <CheckCircle2 size={18} color="white" />
                </div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    margin: 0,
                    color: "#1e293b",
                    letterSpacing: "-0.3px",
                  }}
                >
                  Project Stats
                </h3>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{
                  padding: "14px 16px",
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px", fontWeight: 600 }}>Total Tasks</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: "#1e293b" }}>{tasks.length}</div>
                </div>
                
                <div style={{
                  padding: "14px 16px",
                  background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
                  borderRadius: "12px",
                  border: "1px solid #6ee7b7",
                }}>
                  <div style={{ fontSize: "12px", color: "#065f46", marginBottom: "4px", fontWeight: 600 }}>Completed</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: "#047857" }}>{completedTasks}</div>
                </div>

                <div style={{
                  padding: "14px 16px",
                  background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                  borderRadius: "12px",
                  border: "1px solid #93c5fd",
                }}>
                  <div style={{ fontSize: "12px", color: "#1e40af", marginBottom: "4px", fontWeight: 600 }}>Progress</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: "#1d4ed8" }}>{progressPercent}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Task Details Modal */}
      {selectedTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            animation: "fadeIn 0.2s ease",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !tasksSaving) {
              handleCloseTaskModal();
            }
          }}
        >
          <div
            style={{
              background: "white",
              padding: "32px",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4)",
              animation: "slideUp 0.3s ease",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                boxShadow: "0 4px 16px rgba(102, 126, 234, 0.3)",
              }}>
                <Tag size={24} color="white" />
              </div>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  marginBottom: "8px",
                  color: "#1e293b",
                  letterSpacing: "-0.4px",
                }}
              >
                Task Details
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#64748b",
                  margin: 0,
                }}
              >
                Edit title, description, status, estimate, priority, type and subtasks.
              </p>
            </div>

            {editError && (
              <div style={{ 
                marginBottom: "16px", 
                fontSize: "13px", 
                color: "#ef4444",
                background: "#fef2f2",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #fecaca",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <AlertTriangle size={16} />
                {editError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Title with AI button */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Title *
                  </label>

                  <button
                    type="button"
                    onClick={handleRefineTask}
                    disabled={isRefining || isReadOnly || !editTitle.trim()}
                    style={{
                      background: isRefining || isReadOnly || !editTitle.trim() 
                        ? "#f1f5f9" 
                        : "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
                      border: "none",
                      cursor: isRefining || isReadOnly || !editTitle.trim() ? "not-allowed" : "pointer",
                      color: isRefining || isReadOnly || !editTitle.trim() ? "#94a3b8" : "white",
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "6px 12px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: isRefining || isReadOnly || !editTitle.trim() 
                        ? "none" 
                        : "0 2px 8px rgba(168, 85, 247, 0.3)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!(isRefining || isReadOnly || !editTitle.trim())) {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(168, 85, 247, 0.4)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = isRefining || isReadOnly || !editTitle.trim() 
                        ? "none" 
                        : "0 2px 8px rgba(168, 85, 247, 0.3)";
                    }}
                  >
                    {isRefining ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {isRefining ? "Refining..." : "Refine with AI"}
                  </button>
                </div>

                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={isReadOnly || tasksSaving}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "2px solid #e2e8f0",
                    fontSize: "14px",
                    fontWeight: 600,
                    outline: "none",
                    transition: "all 0.2s ease",
                    opacity: isReadOnly ? 0.6 : 1,
                    cursor: isReadOnly ? "not-allowed" : "auto",
                  }}
                  onFocus={(e) => {
                    if (!isReadOnly) {
                      e.currentTarget.style.borderColor = "#667eea";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Description
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  disabled={isReadOnly || tasksSaving}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "2px solid #e2e8f0",
                    fontSize: "14px",
                    fontWeight: 500,
                    resize: "vertical",
                    outline: "none",
                    transition: "all 0.2s ease",
                    fontFamily: "inherit",
                    opacity: isReadOnly ? 0.6 : 1,
                    cursor: isReadOnly ? "not-allowed" : "auto",
                  }}
                  onFocus={(e) => {
                    if (!isReadOnly) {
                      e.currentTarget.style.borderColor = "#667eea";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Status + Priority */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                    disabled={isReadOnly || tasksSaving}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "2px solid #e2e8f0",
                      fontSize: "14px",
                      fontWeight: 600,
                      background: "white",
                      outline: "none",
                      transition: "all 0.2s ease",
                      opacity: isReadOnly ? 0.6 : 1,
                      cursor: isReadOnly ? "not-allowed" : "pointer",
                    }}
                    onFocus={(e) => {
                      if (!isReadOnly) {
                        e.currentTarget.style.borderColor = "#667eea";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    disabled={isReadOnly || tasksSaving}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "2px solid #e2e8f0",
                      fontSize: "14px",
                      fontWeight: 600,
                      background: "white",
                      outline: "none",
                      transition: "all 0.2s ease",
                      opacity: isReadOnly ? 0.6 : 1,
                      cursor: isReadOnly ? "not-allowed" : "pointer",
                    }}
                    onFocus={(e) => {
                      if (!isReadOnly) {
                        e.currentTarget.style.borderColor = "#667eea";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              {/* Due date + Estimate */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    disabled={isReadOnly || tasksSaving}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "2px solid #e2e8f0",
                      fontSize: "14px",
                      fontWeight: 600,
                      outline: "none",
                      transition: "all 0.2s ease",
                      opacity: isReadOnly ? 0.6 : 1,
                      cursor: isReadOnly ? "not-allowed" : "auto",
                    }}
                    onFocus={(e) => {
                      if (!isReadOnly) {
                        e.currentTarget.style.borderColor = "#667eea";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Estimate (Time)
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="number"
                      min={0}
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      disabled={isReadOnly || tasksSaving}
                      placeholder="Hours"
                      style={{
                        flex: 1,
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: "2px solid #e2e8f0",
                        fontSize: "14px",
                        fontWeight: 600,
                        outline: "none",
                        transition: "all 0.2s ease",
                        opacity: isReadOnly ? 0.6 : 1,
                        cursor: isReadOnly ? "not-allowed" : "auto",
                      }}
                      onFocus={(e) => {
                        if (!isReadOnly) {
                          e.currentTarget.style.borderColor = "#667eea";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(e.target.value)}
                      disabled={isReadOnly || tasksSaving}
                      placeholder="Mins"
                      style={{
                        flex: 1,
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: "2px solid #e2e8f0",
                        fontSize: "14px",
                        fontWeight: 600,
                        outline: "none",
                        transition: "all 0.2s ease",
                        opacity: isReadOnly ? 0.6 : 1,
                        cursor: isReadOnly ? "not-allowed" : "auto",
                      }}
                      onFocus={(e) => {
                        if (!isReadOnly) {
                          e.currentTarget.style.borderColor = "#667eea";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Issue type */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Issue Type
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as TaskType)}
                  disabled={isReadOnly || tasksSaving}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "2px solid #e2e8f0",
                    fontSize: "14px",
                    fontWeight: 600,
                    background: "white",
                    outline: "none",
                    transition: "all 0.2s ease",
                    opacity: isReadOnly ? 0.6 : 1,
                    cursor: isReadOnly ? "not-allowed" : "pointer",
                  }}
                  onFocus={(e) => {
                    if (!isReadOnly) {
                      e.currentTarget.style.borderColor = "#667eea";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="TASK">Task</option>
                  <option value="BUG">Bug</option>
                  <option value="FEATURE">Feature</option>
                  <option value="IMPROVEMENT">Improvement</option>
                  <option value="SPIKE">Spike</option>
                </select>
              </div>

              {/* Parent task */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Parent Task
                </label>
                <select
                  value={editParentTaskId || ""}
                  onChange={(e) => setEditParentTaskId(e.target.value || null)}
                  disabled={selectedTaskHasChildren || isReadOnly || tasksSaving}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "2px solid #e2e8f0",
                    fontSize: "14px",
                    fontWeight: 600,
                    background: selectedTaskHasChildren || isReadOnly ? "#f8fafc" : "white",
                    outline: "none",
                    transition: "all 0.2s ease",
                    opacity: selectedTaskHasChildren || isReadOnly ? 0.6 : 1,
                    cursor: selectedTaskHasChildren || isReadOnly ? "not-allowed" : "pointer",
                  }}
                  onFocus={(e) => {
                    if (!(selectedTaskHasChildren || isReadOnly)) {
                      e.currentTarget.style.borderColor = "#667eea";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="">No parent (top-level)</option>
                  {eligibleParents.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                {selectedTaskHasChildren && (
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                    This task already has child tasks and cannot be converted into a child task.
                  </div>
                )}
              </div>

              {/* Subtasks */}
              <div style={{ paddingTop: "16px", borderTop: "2px solid #f1f5f9" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Subtasks
                </div>

                {(selectedTask.subtasks ?? []).length === 0 ? (
                  <div style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic", marginBottom: "12px", textAlign: "center", padding: "16px" }}>
                    No subtasks yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                    {(selectedTask.subtasks ?? []).map((sub) => (
                      <div key={sub.id} style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "12px", 
                        fontSize: "14px",
                        padding: "10px 12px",
                        background: "#f8fafc",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                      }}>
                        <input
                          type="checkbox"
                          checked={sub.isCompleted}
                          disabled={isReadOnly || tasksSaving}
                          onChange={() => !isReadOnly && handleToggleSubtask(sub.id, sub.isCompleted)}
                          style={{ 
                            cursor: isReadOnly ? "not-allowed" : "pointer", 
                            opacity: isReadOnly ? 0.6 : 1,
                            width: "18px",
                            height: "18px",
                          }}
                        />
                        <span
                          style={{
                            flex: 1,
                            textDecoration: sub.isCompleted ? "line-through" : "none",
                            color: sub.isCompleted ? "#94a3b8" : "#1e293b",
                            opacity: isReadOnly ? 0.6 : 1,
                            fontWeight: 600,
                          }}
                        >
                          {sub.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(sub.id)}
                          disabled={isReadOnly || tasksSaving}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#ef4444",
                            fontSize: "12px",
                            cursor: isReadOnly || tasksSaving ? "not-allowed" : "pointer",
                            opacity: isReadOnly ? 0.6 : 1,
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontWeight: 600,
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isReadOnly && !tasksSaving) {
                              e.currentTarget.style.background = "#fef2f2";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Add subtask"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    disabled={isReadOnly || tasksSaving}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "2px solid #e2e8f0",
                      fontSize: "13px",
                      fontWeight: 600,
                      outline: "none",
                      transition: "all 0.2s ease",
                      opacity: isReadOnly ? 0.6 : 1,
                      cursor: isReadOnly ? "not-allowed" : "auto",
                    }}
                    onFocus={(e) => {
                      if (!isReadOnly) {
                        e.currentTarget.style.borderColor = "#667eea";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    disabled={isReadOnly || tasksSaving || !newSubtaskTitle.trim()}
                    style={{
                      padding: "10px 16px",
                      fontSize: "13px",
                      fontWeight: 700,
                      borderRadius: "10px",
                      border: "none",
                      background: isReadOnly || tasksSaving || !newSubtaskTitle.trim() 
                        ? "#cbd5e1" 
                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      cursor: isReadOnly || tasksSaving || !newSubtaskTitle.trim() ? "not-allowed" : "pointer",
                      boxShadow: isReadOnly || tasksSaving || !newSubtaskTitle.trim()
                        ? "none"
                        : "0 2px 8px rgba(102, 126, 234, 0.3)",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
              </div>

              {/* Footer buttons */}
              <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isReadOnly || tasksSaving}
                  style={{
                    padding: "12px 20px",
                    fontSize: "14px",
                    fontWeight: 700,
                    borderRadius: "10px",
                    border: "none",
                    background: isReadOnly || tasksSaving 
                      ? "#f1f5f9" 
                      : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: isReadOnly || tasksSaving ? "#cbd5e1" : "white",
                    cursor: isReadOnly || tasksSaving ? "not-allowed" : "pointer",
                    boxShadow: isReadOnly || tasksSaving 
                      ? "none" 
                      : "0 4px 12px rgba(239, 68, 68, 0.4)",
                    opacity: isReadOnly ? 0.6 : 1,
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    if (!(isReadOnly || tasksSaving)) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(239, 68, 68, 0.5)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = isReadOnly || tasksSaving 
                      ? "none" 
                      : "0 4px 12px rgba(239, 68, 68, 0.4)";
                  }}
                >
                  <Trash2 size={16} />
                  Delete task
                </button>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={handleCloseTaskModal}
                    disabled={tasksSaving}
                    style={{
                      padding: "12px 20px",
                      fontSize: "14px",
                      fontWeight: 700,
                      borderRadius: "10px",
                      border: "2px solid #e2e8f0",
                      background: "white",
                      color: "#64748b",
                      cursor: tasksSaving ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      if (!tasksSaving) {
                        e.currentTarget.style.borderColor = "#cbd5e1";
                        e.currentTarget.style.background = "#f8fafc";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.background = "white";
                    }}
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTask}
                    disabled={isReadOnly || tasksSaving || !editTitle.trim()}
                    style={{
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: 700,
                      borderRadius: "10px",
                      border: "none",
                      background: isReadOnly || tasksSaving || !editTitle.trim() 
                        ? "#cbd5e1" 
                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      cursor: isReadOnly || tasksSaving || !editTitle.trim() ? "not-allowed" : "pointer",
                      boxShadow: isReadOnly || tasksSaving || !editTitle.trim()
                        ? "none"
                        : "0 4px 12px rgba(102, 126, 234, 0.4)",
                      opacity: isReadOnly ? 0.6 : 1,
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      if (!(isReadOnly || tasksSaving || !editTitle.trim())) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.5)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = isReadOnly || tasksSaving || !editTitle.trim()
                        ? "none"
                        : "0 4px 12px rgba(102, 126, 234, 0.4)";
                    }}
                  >
                    {tasksSaving ? (
                      <>
                        <div
                          style={{
                            width: "14px",
                            height: "14px",
                            border: "2px solid rgba(255, 255, 255, 0.3)",
                            borderTopColor: "white",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save changes
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isReadOnly && (
                <p style={{ marginTop: 12, fontSize: 12, color: "#64748b", textAlign: "center", fontWeight: 600 }}>
                  You have read-only access in this workspace; task changes are disabled.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1100,
            animation: "fadeIn 0.2s ease",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !tasksSaving) {
              setShowDeleteConfirm(false);
            }
          }}
        >
          <div
            style={{
              background: "white",
              padding: "32px",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4)",
              animation: "slideUp 0.3s ease",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
                boxShadow: "0 8px 20px rgba(239, 68, 68, 0.3)",
              }}
            >
              <AlertTriangle size={28} color="white" strokeWidth={2.5} />
            </div>

            <h3 style={{ 
              fontSize: "24px", 
              fontWeight: 800, 
              color: "#1e293b", 
              marginBottom: "12px",
              letterSpacing: "-0.4px",
            }}>
              Delete Task?
            </h3>
            
            <div
              style={{
                padding: "16px",
                background: "#fef2f2",
                borderRadius: "12px",
                border: "2px solid #fecaca",
                marginBottom: "24px",
              }}
            >
              <p style={{ 
                fontSize: "15px", 
                color: "#991b1b", 
                marginBottom: "12px",
                fontWeight: 600,
                lineHeight: "1.5",
              }}>
                Are you sure you want to delete <strong>"{selectedTask.title}"</strong>?
              </p>
              <div
                style={{
                  padding: "12px",
                  background: "white",
                  borderRadius: "8px",
                  border: "1px solid #fecaca",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#991b1b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  ⚠️ Warning
                </div>
                <div style={{ fontSize: "13px", color: "#b91c1c", lineHeight: "1.5" }}>
                  This action is <strong>permanent</strong> and cannot be undone. All subtasks will also be deleted.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={tasksSaving}
                style={{
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  border: "2px solid #e2e8f0",
                  background: "white",
                  color: "#64748b",
                  cursor: tasksSaving ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!tasksSaving) {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.background = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.background = "white";
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={tasksSaving}
                style={{
                  padding: "12px 28px",
                  fontSize: "14px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  border: "none",
                  background: tasksSaving 
                    ? "#cbd5e1" 
                    : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "white",
                  cursor: tasksSaving ? "not-allowed" : "pointer",
                  boxShadow: tasksSaving 
                    ? "none" 
                    : "0 4px 12px rgba(239, 68, 68, 0.4)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  if (!tasksSaving) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(239, 68, 68, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = tasksSaving 
                    ? "none" 
                    : "0 4px 12px rgba(239, 68, 68, 0.4)";
                }}
              >
                {tasksSaving ? (
                  <>
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                        borderTopColor: "white",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}