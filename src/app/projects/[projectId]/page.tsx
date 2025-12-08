// src/app/projects/[projectId]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useWorkspaceStore } from "@/store/workspaceStore";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";

import type {
  Task,
  TaskStatus,
  TaskType,
  TaskPriority,
} from "@/api/tasks";

import type { WorkspaceRole } from "@/store/workspaceStore";

function formatDate(dateString?: string | null) {
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import type { Task, TaskStatus } from "@/api/tasks";

function formatDate(dateString?: string) {
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

// Order of statuses in the Kanban board
const STATUS_FLOW: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

const ISSUE_TYPE_LABELS: Record<TaskType, string> = {
  TASK: "Task",
  BUG: "Bug",
  FEATURE: "Feature",
  IMPROVEMENT: "Improvement",
  SPIKE: "Spike",
};

const ISSUE_TYPE_COLORS: Record<TaskType, string> = {
  TASK: "#42526e",
  BUG: "#de350b",
  FEATURE: "#0052cc",
  IMPROVEMENT: "#5243aa",
  SPIKE: "#ff991f",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "#006644",
  MEDIUM: "#ff8b00",
  HIGH: "#de350b",
};

// Order of statuses in the Kanban board
const STATUS_FLOW: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

export default function ProjectPage() {
  const params = useParams() as { projectId: string };
  const router = useRouter();
  const projectId = params.projectId;

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

  // Modal state for editing a task
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

  // Parent task state in modal
  const [editParentTaskId, setEditParentTaskId] = useState<string | null>(null);

  // Subtasks (inside modal)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Workspace membership info (for displaying role only)
  const currentWorkspaceMembership = useMemo(
    () =>
      workspaces.find((w) => w.workspaceId === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const currentRole: WorkspaceRole | null =
    currentWorkspaceMembership?.role ?? null;

  const [editError, setEditError] = useState<string | null>(null);

  const project = useMemo(
    () => projects.find((p: any) => p.id === projectId),
    [projects, projectId]
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
      // router.push("/");
      // You can redirect if you want: router.push("/");
    }
  }, [projectsLoading, project]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (!canEditTasks) {
      setLocalError(
        "You don't have permission to create tasks in this workspace."
      );
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
    direction: "left" | "right"
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

  // Split into top-level tasks and children
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

  // Group only top-level tasks by status for columns
  // Group tasks by status for Kanban columns
  const tasksByStatus: Record<TaskStatus, Task[]> = {
    TODO: [],
    IN_PROGRESS: [],
    BLOCKED: [],
    DONE: [],
  };

  topLevelTasks.forEach((t) => {
  tasks.forEach((t) => {
    if (!tasksByStatus[t.status]) return;
    tasksByStatus[t.status].push(t);
  });

  const columns: { key: TaskStatus; title: string; accent: string }[] = [
    { key: "TODO",        title: "To do",       accent: "#dfe1e6" },
    { key: "IN_PROGRESS", title: "In progress", accent: "#deebff" },
    { key: "BLOCKED",     title: "Blocked",     accent: "#ffebe6" },
    { key: "DONE",        title: "Done",        accent: "#e3fcef" },
  ];

  // Eligible parents and whether selected task has children
  const eligibleParents = useMemo(
    () =>
      selectedTask
        ? tasks.filter(
            (t) =>
              t.projectId === selectedTask.projectId &&
              !t.parentTaskId &&
              t.id !== selectedTask.id
          )
        : [],
    [tasks, selectedTask]
  );

  const selectedTaskHasChildren = useMemo(
    () =>
      selectedTask
        ? tasks.some((t) => t.parentTaskId === selectedTask.id)
        : false,
    [tasks, selectedTask]
  );

  // Open modal with a task
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
    setEditError(null);
  };

  const handleCloseTaskModal = () => {
    if (tasksSaving) return; // avoid closing while saving
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
    setEditError(null);
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

      if (
        Number.isNaN(h) ||
        Number.isNaN(m) ||
        h < 0 ||
        m < 0 ||
        m > 59
      ) {
        setEditError(
          "Estimate must be a valid time (hours ≥ 0, minutes between 0–59)."
        );
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

    try {
      setEditError(null);
      // updateTask is not provided by the hook; update status via updateTaskStatus
      if (typeof updateTaskStatus === "function") {
        await updateTaskStatus(selectedTask.id, editStatus);
      }
      // reload tasks to pick up any server-side changes (if provided)
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

  // Subtasks handlers
  const handleAddSubtask = async () => {
    if (!selectedTask) return;
    const title = newSubtaskTitle.trim();
    if (!title) return;

    try {
      const created = await addSubtask(selectedTask.id, title);
      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: [...(prev.subtasks ?? []), created],
            }
          : prev
      );
      setNewSubtaskTitle("");
    } catch {
      // handled by hook
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
                s.id === subtaskId ? updated : s
              ),
            }
          : prev
      );
    } catch {
      // handled by hook
    }
  };

  const handleRemoveSubtask = async (subtaskId: string) => {
    if (!selectedTask) return;
    try {
      await removeSubtask(selectedTask.id, subtaskId);
      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: (prev.subtasks ?? []).filter((s) => s.id !== subtaskId),
            }
          : prev
      );
    } catch {
      // handled by hook
    }
  };

  const isReadOnly = !canEditTasks;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f5f7",
        paddingBottom: "40px",
      }}
    >
      {/* Top bar / breadcrumb */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #e1e5e9",
          padding: "16px 0",
        }}
      >
        <div className="container">
          <button
            onClick={() => router.push("/")}
            style={{
              border: "none",
              background: "transparent",
              color: "#0052cc",
              fontSize: "13px",
              cursor: "pointer",
              marginBottom: "8px",
            }}
          >
            ← Back to dashboard
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
                  fontSize: "26px",
                  fontWeight: 700,
                  color: "#172b4d",
                  marginBottom: "4px",
                }}
              >
                {project?.name || "Project"}
              </h1>
              <p
                style={{
                  fontSize: "13px",
                  color: "#6b778c",
                  margin: 0,
                }}
              >
                Workspace: <strong>{workspaceName}</strong>
                {currentRole && (
                  <> · Your role: <strong>{currentRole}</strong></>
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
                background: "#f4f5f7",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "13px",
                color: "#6b778c",
              }}
            >
              Tasks: <strong>{tasks.length}</strong> · Completed:{" "}
              <strong>{completedTasks}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container" style={{ marginTop: "24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr",
            gap: "24px",
            alignItems: "flex-start",
          }}
        >
          {/* LEFT: Kanban board */}
          <div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "12px",
                color: "#172b4d",
              }}
            >
              Tasks (Kanban)
            </h2>

            {!canEditTasks && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid #e1e5e9",
                  background: "#f4f5f7",
                  fontSize: "12px",
                  color: "#6b778c",
                }}
              >
                You have view-only access in this workspace. Task editing is
                disabled.
              </div>
            )}

            {tasksError && (
              <div
                style={{
                  marginBottom: "10px",
                  fontSize: "13px",
                  color: "#de350b",
                }}
              >
                {tasksError}
              </div>
            )}

            {tasksLoading ? (
              <div style={{ fontSize: "14px", color: "#6b778c" }}>
                Loading tasks…
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: "16px",
                  alignItems: "flex-start",
                }}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    style={{
                      background: "#fdfdfd",
                      borderRadius: "8px",
                      border: "1px solid #e1e5e9",
                      padding: "12px",
                      minHeight: "120px",
                    }}
                  >
                    {/* Column header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#172b4d",
                        }}
                      >
                        {col.title}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: col.accent,
                          color: "#42526e",
                        }}
                      >
                        {tasksByStatus[col.key].length}
                      </span>
                    </div>

                    {/* Column tasks */}
                    {tasksByStatus[col.key].length === 0 ? (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b778c",
                          fontStyle: "italic",
                        }}
                      >
                        No tasks
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "8px" }}>
                        {tasksByStatus[col.key].map((task) => {
                          const children = childrenByParent[task.id] ?? [];

                          return (
                            <div
                              key={task.id}
                              onClick={() => handleOpenTask(task)}
                              style={{
                                padding: "8px 10px",
                                borderRadius: "6px",
                                border: "1px solid #e1e5e9",
                                background: "white",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                                cursor: "pointer",
                        {tasksByStatus[col.key].map((task) => (
                          <div
                            key={task.id}
                            onClick={() => handleOpenTask(task)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "6px",
                              border: "1px solid #e1e5e9",
                              background: "white",
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                              cursor: "pointer",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: 500,
                                color: "#172b4d",
                              }}
                            >
                              {task.title}
                            </div>
                            {task.description && (
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#6b778c",
                                }}
                              >
                                {task.description}
                              </div>
                            )}

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: "4px",
                                gap: "6px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  color: "#172b4d",
                                }}
                              >
                                {task.title}
                              </div>
                              {task.description && (
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#6b778c",
                                  }}
                                >
                                  {task.description}
                                </div>
                              )}
                                  fontSize: "10px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                  color: "#6b778c",
                                }}
                              >
                                {task.status}
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                  marginTop: "4px",
                                }}
                              >
                                {/* Top row: type + estimate + priority */}
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "4px",
                                      alignItems: "center",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {task.type && (
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          fontWeight: 600,
                                          padding: "2px 6px",
                                          borderRadius: "999px",
                                          background:
                                            ISSUE_TYPE_COLORS[
                                              task.type as TaskType
                                            ] + "1a",
                                          color:
                                            ISSUE_TYPE_COLORS[
                                              task.type as TaskType
                                            ],
                                          textTransform: "uppercase",
                                          letterSpacing: "0.04em",
                                        }}
                                      >
                                        {
                                          ISSUE_TYPE_LABELS[
                                            task.type as TaskType
                                          ]
                                        }
                                      </span>
                                    )}

                                    {typeof task.estimateMinutes === "number" &&
                                      task.estimateMinutes > 0 && (
                                        <span
                                          style={{
                                            fontSize: "10px",
                                            padding: "2px 6px",
                                            borderRadius: "999px",
                                            border: "1px solid #dfe1e6",
                                            color: "#42526e",
                                          }}
                                        >
                                          {formatEstimateMinutes(
                                            task.estimateMinutes
                                          )}
                                        </span>
                                      )}

                                    {task.priority && (
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          padding: "2px 6px",
                                          borderRadius: "999px",
                                          background:
                                            PRIORITY_COLORS[
                                              task.priority as TaskPriority
                                            ] + "1a",
                                          color:
                                            PRIORITY_COLORS[
                                              task.priority as TaskPriority
                                            ],
                                          fontWeight: 600,
                                        }}
                                      >
                                        {
                                          PRIORITY_LABELS[
                                            task.priority as TaskPriority
                                          ]
                                        }
                                      </span>
                                    )}
                                  </div>

                                  {task.dueDate && (
                                    <div
                                      style={{
                                        fontSize: "10px",
                                        color: "#6b778c",
                                      }}
                                    >
                                      Due {formatDate(task.dueDate)}
                                    </div>
                                  )}
                                </div>

                                {/* Bottom row: status + arrows */}
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                      color: "#6b778c",
                                    }}
                                  >
                                    {task.status}
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "4px",
                                    }}
                                  >
                                    {/* Move left */}
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
                                        padding: "2px 6px",
                                        fontSize: "11px",
                                        borderRadius: "4px",
                                        border: "1px solid #dfe1e6",
                                        background: "white",
                                        color: "#6b778c",
                                        cursor:
                                          tasksSaving ||
                                          !canEditTasks ||
                                          STATUS_FLOW.indexOf(task.status) === 0
                                            ? "not-allowed"
                                            : "pointer",
                                      }}
                                    >
                                      ←
                                    </button>

                                    {/* Move right */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveTask(task.id, task.status, "right");
                                      }}
                                      disabled={
                                        tasksSaving ||
                                        !canEditTasks ||
                                        STATUS_FLOW.indexOf(task.status) ===
                                          STATUS_FLOW.length - 1
                                      }
                                      style={{
                                        padding: "2px 6px",
                                        fontSize: "11px",
                                        borderRadius: "4px",
                                        border: "1px solid #dfe1e6",
                                        background: "white",
                                        color: "#6b778c",
                                        cursor:
                                          tasksSaving ||
                                          !canEditTasks ||
                                          STATUS_FLOW.indexOf(task.status) ===
                                            STATUS_FLOW.length - 1
                                            ? "not-allowed"
                                            : "pointer",
                                      }}
                                    >
                                      →
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Child tasks preview */}
                              {children.length > 0 && (
                                <div
                                  style={{
                                    marginTop: "6px",
                                    paddingTop: "6px",
                                    borderTop: "1px solid #ebecf0",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "4px",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: 500,
                                      color: "#6b778c",
                                    }}
                                  >
                                    Child tasks (
                                    {
                                      children.filter(
                                        (c) => c.status === "DONE"
                                      ).length
                                    }
                                    /{children.length})
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
                                        gap: "6px",
                                        fontSize: "11px",
                                        padding: "4px 6px",
                                        borderRadius: "4px",
                                        background: "#f4f5f7",
                                        cursor: "pointer",
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: "6px",
                                          height: "6px",
                                          borderRadius: "999px",
                                          flexShrink: 0,
                                          background:
                                            child.status === "DONE"
                                              ? "#36b37e"
                                              : child.status === "IN_PROGRESS"
                                              ? "#0052cc"
                                              : child.status === "BLOCKED"
                                              ? "#de350b"
                                              : "#6b778c",
                                        }}
                                      />
                                      <span
                                        style={{
                                          flex: 1,
                                          color: "#172b4d",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {child.title}
                                      </span>

                                      <span
                                        style={{
                                          textTransform: "uppercase",
                                          letterSpacing: "0.04em",
                                          fontSize: "9px",
                                          color: "#6b778c",
                                          flexShrink: 0,
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
                                  gap: "4px",
                                }}
                              >
                                {/* Move left */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveTask(task.id, task.status, "left");
                                  }}
                                  disabled={
                                    tasksSaving ||
                                    STATUS_FLOW.indexOf(task.status) === 0
                                  }
                                  style={{
                                    padding: "2px 6px",
                                    fontSize: "11px",
                                    borderRadius: "4px",
                                    border: "1px solid #dfe1e6",
                                    background: "white",
                                    color: "#6b778c",
                                    cursor:
                                      tasksSaving ||
                                      STATUS_FLOW.indexOf(task.status) === 0
                                        ? "not-allowed"
                                        : "pointer",
                                  }}
                                >
                                  ←
                                </button>

                                {/* Move right */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveTask(task.id, task.status, "right");
                                  }}
                                  disabled={
                                    tasksSaving ||
                                    STATUS_FLOW.indexOf(task.status) ===
                                      STATUS_FLOW.length - 1
                                  }
                                  style={{
                                    padding: "2px 6px",
                                    fontSize: "11px",
                                    borderRadius: "4px",
                                    border: "1px solid #dfe1e6",
                                    background: "white",
                                    color: "#6b778c",
                                    cursor:
                                      tasksSaving ||
                                      STATUS_FLOW.indexOf(task.status) ===
                                        STATUS_FLOW.length - 1
                                        ? "not-allowed"
                                        : "pointer",
                                  }}
                                >
                                  →
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* New task form */}
            {canEditTasks ? (
              <div
                style={{
                  marginTop: "20px",
                  background: "white",
                  borderRadius: "8px",
                  border: "1px solid #e1e5e9",
                  padding: "16px",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#172b4d",
                    marginBottom: "10px",
                  }}
                >
                  Add new task
                </h3>

                {(localError || tasksError) && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#de350b",
                      marginBottom: "8px",
                    }}
                  >
                    {localError || tasksError}
                  </div>
                )}

                <form
                  onSubmit={handleCreateTask}
                  style={{ display: "grid", gap: "8px" }}
                >
                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "4px",
                      border: "1px solid #dfe1e6",
                      fontSize: "14px",
                    }}
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={2}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "4px",
                      border: "1px solid #dfe1e6",
                      fontSize: "14px",
                      resize: "vertical",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="submit"
                      disabled={tasksSaving || !newTitle.trim()}
                      style={{
                        padding: "8px 14px",
                        fontSize: "14px",
                        borderRadius: "4px",
                        border: "none",
                        background: tasksSaving ? "#c1c7d0" : "#0052cc",
                        color: "white",
                        cursor: tasksSaving ? "default" : "pointer",
                      }}
                    >
                      {tasksSaving ? "Adding…" : "Add task"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div
                style={{
                  marginTop: "20px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid #e1e5e9",
                  background: "#f4f5f7",
                  fontSize: "13px",
                  color: "#6b778c",
                }}
              >
                You can view tasks in this project, but you don&apos;t have permission
                to create or edit them in this workspace.
              </div>
            )}
            <div
              style={{
                marginTop: "20px",
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e1e5e9",
                padding: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#172b4d",
                  marginBottom: "10px",
                }}
              >
                Add new task
              </h3>

              {(localError || tasksError) && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#de350b",
                    marginBottom: "8px",
                  }}
                >
                  {localError || tasksError}
                </div>
              )}

              <form
                onSubmit={handleCreateTask}
                style={{ display: "grid", gap: "8px" }}
              >
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "4px",
                    border: "1px solid #dfe1e6",
                    fontSize: "14px",
                  }}
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "4px",
                    border: "1px solid #dfe1e6",
                    fontSize: "14px",
                    resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={tasksSaving || !newTitle.trim()}
                    style={{
                      padding: "8px 14px",
                      fontSize: "14px",
                      borderRadius: "4px",
                      border: "none",
                      background: tasksSaving ? "#c1c7d0" : "#0052cc",
                      color: "white",
                      cursor: tasksSaving ? "default" : "pointer",
                    }}
                  >
                    {tasksSaving ? "Adding…" : "Add task"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT: Project Stats */}
          <div>
            <div
              style={{
                background: "white",
                border: "1px solid #dfe1e6",
                borderRadius: "8px",
                borderRadius: "8px",
                border: "1px solid #e1e5e9",
                padding: "20px",
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  marginBottom: "12px",
                  color: "#172b4d",
                }}
              >
                Project Stats
              </h3>
              <div style={{ fontSize: "13px", color: "#6b778c" }}>
                <div>Total tasks: {tasks.length}</div>
                <div>Completed: {completedTasks}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "520px",
              maxWidth: "480px",
              boxShadow: "0 12px 32px rgba(9,30,66,0.35)",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "8px",
                color: "#172b4d",
              }}
            >
              Task details
            </h2>
            <p
              style={{
                fontSize: "12px",
                color: "#6b778c",
                marginTop: 0,
                marginBottom: "16px",
              }}
            >
              Edit title, description, status, estimate, priority and subtasks.
              Edit title, description, and status.
            </p>

            {editError && (
              <div
                style={{
                  marginBottom: "10px",
                  fontSize: "13px",
                  color: "#de350b",
                }}
              >
                {editError}
              </div>
            )}

            <form
              onSubmit={handleSaveTask}
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#6b778c",
                }}
              >
                Title
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={isReadOnly || tasksSaving}
                  style={{
                    marginTop: "4px",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    fontSize: "14px",
                    opacity: isReadOnly ? 0.6 : 1,
                    cursor: isReadOnly ? "not-allowed" : "auto",
                    border: "1px solid #dfe1e6",
                    fontSize: "14px",
                  }}
                />
              </label>

              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#6b778c",
                }}
              >
                Description
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  disabled={isReadOnly || tasksSaving}
                  rows={3}
                  style={{
                    marginTop: "4px",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    border: "1px solid #dfe1e6",
                    fontSize: "14px",
                    resize: "vertical",
                    opacity: isReadOnly ? 0.6 : 1,
                    cursor: isReadOnly ? "not-allowed" : "auto",
                  }}
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#6b778c",
                  }}
                >
                  Status
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as TaskStatus)
                    }
                    disabled={isReadOnly || tasksSaving}
                    style={{
                      marginTop: "4px",
                      padding: "8px 10px",
                      borderRadius: "4px",
                      border: "1px solid #dfe1e6",
                      fontSize: "14px",
                      background: "white",
                      opacity: isReadOnly ? 0.6 : 1,
                      cursor: isReadOnly ? "not-allowed" : "auto",
                    }}
                  >
                    {STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#6b778c",
                  }}
                >
                  Priority
                  <select
                    value={editPriority}
                    onChange={(e) =>
                      setEditPriority(e.target.value as TaskPriority)
                    }
                    disabled={isReadOnly || tasksSaving}
                    style={{
                      marginTop: "4px",
                      padding: "8px 10px",
                      borderRadius: "4px",
                      border: "1px solid #dfe1e6",
                      fontSize: "14px",
                      background: "white",
                      opacity: isReadOnly ? 0.6 : 1,
                      cursor: isReadOnly ? "not-allowed" : "auto",
                    }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#6b778c",
                  }}
                >
                  Due date
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    disabled={isReadOnly || tasksSaving}
                    style={{
                      marginTop: "4px",
                      padding: "8px 10px",
                      borderRadius: "4px",
                      border: "1px solid #dfe1e6",
                      fontSize: "14px",
                      opacity: isReadOnly ? 0.6 : 1,
                      cursor: isReadOnly ? "not-allowed" : "auto",
                    }}
                  />
                </label>

                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#6b778c",
                  }}
                >
                  Estimate (time)
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      marginTop: "4px",
                    }}
                  >
                    <input
                      type="number"
                      min={0}
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      disabled={isReadOnly || tasksSaving}
                      placeholder="h"
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: "4px",
                        border: "1px solid #dfe1e6",
                        fontSize: "14px",
                        opacity: isReadOnly ? 0.6 : 1,
                        cursor: isReadOnly ? "not-allowed" : "auto",
                      }}
                    />
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(e.target.value)}
                      disabled={isReadOnly || tasksSaving}
                      placeholder="m"
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: "4px",
                        border: "1px solid #dfe1e6",
                        fontSize: "14px",
                        opacity: isReadOnly ? 0.6 : 1,
                        cursor: isReadOnly ? "not-allowed" : "auto",
                      }}
                    />
                  </div>
                </label>
              </div>

              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#6b778c",
                }}
              >
                Issue type
                <select
                  value={editType}
                  onChange={(e) =>
                    setEditType(e.target.value as TaskType)
                  }
                  disabled={isReadOnly || tasksSaving}
                Status
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                  style={{
                    marginTop: "4px",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    border: "1px solid #dfe1e6",
                    fontSize: "14px",
                    background: "white",
                    opacity: isReadOnly ? 0.6 : 1,
                    cursor: isReadOnly ? "not-allowed" : "auto",
                  }}
                >
                  <option value="TASK">Task</option>
                  <option value="BUG">Bug</option>
                  <option value="FEATURE">Feature</option>
                  <option value="IMPROVEMENT">Improvement</option>
                  <option value="SPIKE">Spike</option>
                </select>
              </label>

              {/* Parent task selector */}
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#6b778c",
                }}
              >
                Parent task
                <select
                  value={editParentTaskId || ""}
                  onChange={(e) =>
                    setEditParentTaskId(e.target.value || null)
                  }
                  disabled={selectedTaskHasChildren || isReadOnly || tasksSaving}
                  style={{
                    marginTop: "4px",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    border: "1px solid #dfe1e6",
                    fontSize: "14px",
                    background:
                      selectedTaskHasChildren || isReadOnly ? "#f4f5f7" : "white",
                    opacity: selectedTaskHasChildren || isReadOnly ? 0.6 : 1,
                    cursor:
                      selectedTaskHasChildren || isReadOnly
                        ? "not-allowed"
                        : "auto",
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
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "11px",
                      color: "#6b778c",
                    }}
                  >
                    This task already has child tasks and cannot be converted
                    into a child task.
                  </div>
                )}
              </label>

              {/* Subtasks */}
              <div
                style={{
                  marginTop: "6px",
                  paddingTop: "10px",
                  borderTop: "1px solid #ebecf0",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#6b778c",
                    marginBottom: "6px",
                  }}
                >
                  Subtasks
                </div>

                {(selectedTask.subtasks ?? []).length === 0 ? (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b778c",
                      fontStyle: "italic",
                      marginBottom: "8px",
                    }}
                  >
                    No subtasks yet.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      marginBottom: "8px",
                    }}
                  >
                    {(selectedTask.subtasks ?? []).map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "12px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={sub.isCompleted}
                          disabled={isReadOnly || tasksSaving}
                          onChange={() =>
                            !isReadOnly &&
                            handleToggleSubtask(sub.id, sub.isCompleted)
                          }
                          style={{
                            cursor: isReadOnly ? "not-allowed" : "pointer",
                            opacity: isReadOnly ? 0.6 : 1,
                          }}
                        />
                        <span
                          style={{
                            flex: 1,
                            textDecoration: sub.isCompleted
                              ? "line-through"
                              : "none",
                            color: sub.isCompleted ? "#6b778c" : "#172b4d",
                            opacity: isReadOnly ? 0.6 : 1,
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
                            color: "#de350b",
                            fontSize: "11px",
                            cursor:
                              isReadOnly || tasksSaving
                                ? "not-allowed"
                                : "pointer",
                            opacity: isReadOnly ? 0.6 : 1,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    marginTop: "4px",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Add subtask"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    disabled={isReadOnly || tasksSaving}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: "4px",
                      border: "1px solid #dfe1e6",
                      fontSize: "12px",
                      opacity: isReadOnly ? 0.6 : 1,
                      cursor: isReadOnly ? "not-allowed" : "auto",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    disabled={
                      isReadOnly || tasksSaving || !newSubtaskTitle.trim()
                    }
                    style={{
                      padding: "6px 10px",
                      fontSize: "12px",
                      borderRadius: "4px",
                      border: "none",
                      background:
                        isReadOnly || tasksSaving || !newSubtaskTitle.trim()
                          ? "#c1c7d0"
                          : "#0052cc",
                      color: "white",
                      cursor:
                        isReadOnly || tasksSaving || !newSubtaskTitle.trim()
                          ? "default"
                          : "pointer",
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

                  }}
                >
                  {STATUS_FLOW.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <div
                style={{
                  marginTop: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isReadOnly || tasksSaving}
                  onClick={handleCloseTaskModal}
                  disabled={tasksSaving}
                  style={{
                    padding: "8px 14px",
                    fontSize: "14px",
                    borderRadius: "4px",
                    border: "1px solid #de350b",
                    background: "white",
                    color: "#de350b",
                    cursor:
                      isReadOnly || tasksSaving ? "not-allowed" : "pointer",
                    opacity: isReadOnly ? 0.6 : 1,
                  }}
                >
                  Delete task
                </button>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={handleCloseTaskModal}
                    disabled={tasksSaving}
                    style={{
                      padding: "8px 14px",
                      fontSize: "14px",
                      borderRadius: "4px",
                      border: "1px solid #c1c7d0",
                      background: "white",
                      cursor: tasksSaving ? "default" : "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isReadOnly || tasksSaving || !editTitle.trim()}
                    style={{
                      padding: "8px 14px",
                      fontSize: "14px",
                      borderRadius: "4px",
                      border: "none",
                      background:
                        isReadOnly || tasksSaving || !editTitle.trim()
                          ? "#c1c7d0"
                          : "#0052cc",
                      color: "white",
                      cursor:
                        isReadOnly || tasksSaving || !editTitle.trim()
                          ? "default"
                          : "pointer",
                      opacity: isReadOnly ? 0.6 : 1,
                    }}
                  >
                    {tasksSaving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>

              {isReadOnly && (
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: "#6b778c",
                  }}
                >
                  You have read-only access in this workspace; task changes are disabled.
                </p>
              )}
                    border: "1px solid #c1c7d0",
                    background: "white",
                    cursor: tasksSaving ? "default" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tasksSaving || !editTitle.trim()}
                  style={{
                    padding: "8px 14px",
                    fontSize: "14px",
                    borderRadius: "4px",
                    border: "none",
                    background:
                      tasksSaving || !editTitle.trim()
                        ? "#c1c7d0"
                        : "#0052cc",
                    color: "white",
                    cursor:
                      tasksSaving || !editTitle.trim()
                        ? "default"
                        : "pointer",
                  }}
                >
                  {tasksSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 12px 32px rgba(9,30,66,0.35)",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#172b4d",
                marginBottom: "8px",
              }}
            >
              Delete task?
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "#6b778c",
                marginBottom: "20px",
              }}
            >
              Are you sure you want to delete{" "}
              <strong>"{selectedTask.title}"</strong>? This action cannot be
              undone.
            </p>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}
            >
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={tasksSaving}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  borderRadius: "4px",
                  border: "1px solid #c1c7d0",
                  background: "white",
                  cursor: tasksSaving ? "default" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={tasksSaving}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  borderRadius: "4px",
                  border: "none",
                  background: "#de350b",
                  color: "white",
                  cursor: tasksSaving ? "default" : "pointer",
                }}
              >
                {tasksSaving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
    </div>
  );
}
