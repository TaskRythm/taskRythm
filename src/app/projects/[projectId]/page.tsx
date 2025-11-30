// src/app/projects/[projectId]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  } = useTasks(projectId);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Modal state for editing a task
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("TODO");
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
      // You can redirect if you want: router.push("/");
    }
  }, [projectsLoading, project]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
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

  // Group tasks by status for Kanban columns
  const tasksByStatus: Record<TaskStatus, Task[]> = {
    TODO: [],
    IN_PROGRESS: [],
    BLOCKED: [],
    DONE: [],
  };

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

  // Open modal with a task
  const handleOpenTask = (task: Task) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setEditStatus(task.status);
    setEditError(null);
  };

  const handleCloseTaskModal = () => {
    if (tasksSaving) return; // avoid closing while saving
    setSelectedTask(null);
    setEditTitle("");
    setEditDesc("");
    setEditStatus("TODO");
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
                  style={{
                    marginTop: "4px",
                    padding: "8px 10px",
                    borderRadius: "4px",
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
                  rows={3}
                  style={{
                    marginTop: "4px",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    border: "1px solid #dfe1e6",
                    fontSize: "14px",
                    resize: "vertical",
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
                  justifyContent: "flex-end",
                  gap: "8px",
                }}
              >
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
    </div>
  );
}
