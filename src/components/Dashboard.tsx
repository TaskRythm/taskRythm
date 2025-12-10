// src/components/Dashboard.tsx
"use client";

import { useState, useEffect } from "react";
import {
  FolderKanban,
  Users,
  ClipboardList,
  BarChart3,
  Clock,
  Plus,
} from "lucide-react";

import WorkspaceSidebar from "./WorkspaceSidebar";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useProjects } from "@/hooks/useProjects";
import { useRouter } from "next/navigation";
import { useWorkspaceActivity } from "@/hooks/useWorkspaceActivity";
import { WorkspaceHeader } from "./WorkspaceHeader";
import WorkspaceMembersCard from "./WorkspaceMembersCard";
import WorkspaceSettings from "./WorkspaceSettings";
import ProjectDeleteButton from "./ProjectDeleteButton";

interface DashboardProps {
  user: any;
}

export default function Dashboard({ user }: DashboardProps) {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const {
    projects,
    loading: projectsLoading,
    creating: projectCreating,
    error: projectsError,
    createProject,
  } = useProjects();
  const router = useRouter();

  const activeWorkspace =
    workspaces.find((w: any) => w.workspaceId === activeWorkspaceId) ??
    workspaces[0] ??
    null;

  // Check if user can create projects (OWNER, ADMIN, MEMBER roles)
  const canCreateProjects =
    activeWorkspace &&
    ['OWNER', 'ADMIN', 'MEMBER'].includes(activeWorkspace.role);

  const {
    activity,
    loading: activityLoading,
    error: activityError,
  } = useWorkspaceActivity();

  // Map backend projects to UI shape
  const realProjects = projects.map((p: any) => ({
    id: p.id,
    name: p.name,
    progress: p.progress ?? 0,
    tasks: p.tasksCount ?? 0,
    members: p.membersCount ?? 0,
    archived: p.archived ?? false,
    createdAt: p.createdAt ?? null,
  }));

  // State for tracking deleted projects
  const [displayedProjects, setDisplayedProjects] = useState(realProjects);

  // Sync displayedProjects when realProjects changes (e.g., new projects loaded)
  useEffect(() => {
    setDisplayedProjects(realProjects);
  }, [projects.length]); // Only sync on projects length change to avoid unnecessary updates

  // Simple "x min/hours/days ago" formatter
  function formatTimeAgo(dateString?: string | null) {
    if (!dateString) return "";
    const timestamp = new Date(dateString).getTime();
    if (Number.isNaN(timestamp)) return "";

    const diffMs = Date.now() - timestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return diffMinutes + " min ago";
    if (diffHours < 24) return diffHours + " h ago";
    return diffDays + " d ago";
  }

  const activeProjectsCount = displayedProjects.filter(
    (p) => !p.archived
  ).length;

  const totalWorkspaces = workspaces.length;

  // Find last created project by createdAt (if backend sends it)
  let lastCreatedProjectName: string | null = null;
  if (displayedProjects.length > 0) {
    const withCreated = displayedProjects.filter((p) => !!p.createdAt);
    if (withCreated.length > 0) {
      const sortedByCreated = [...withCreated].sort((a, b) => {
        return (
          new Date(b.createdAt as string).getTime() -
          new Date(a.createdAt as string).getTime()
        );
      });
      lastCreatedProjectName = sortedByCreated[0].name;
    } else {
      lastCreatedProjectName =
        displayedProjects[displayedProjects.length - 1].name ?? null;
    }
  }

  // ---------- New project modal state ----------
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleOpenNewProject = () => {
    setLocalError(null);
    setShowNewProjectModal(true);
  };

  const handleCloseNewProject = () => {
    if (projectCreating) return;
    setShowNewProjectModal(false);
    setNewProjectName("");
    setNewProjectDescription("");
    setLocalError(null);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    if (!activeWorkspaceId) {
      setLocalError("Select a workspace first.");
      return;
    }

    try {
      setLocalError(null);
      await createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      });
      handleCloseNewProject();
    } catch (err: any) {
      setLocalError(err.message || "Failed to create project");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f5f7",
        padding: 0,
      }}
    >
      {/* Dashboard Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
          borderBottom: "1px solid #e1e5e9",
          padding: "32px 0",
          boxShadow: "0 1px 3px rgba(9,30,66,0.08)",
        }}
      >
        <div className="container">
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
                  fontWeight: 700,
                  color: "#172b4d",
                  marginBottom: "8px",
                }}
              >
                Welcome back, {user?.name || "User"}!
              </h1>
              <p
                style={{
                  color: "#6b778c",
                  fontSize: "16px",
                  margin: 0,
                }}
              >
                {activeWorkspace
                  ? `Here’s what’s happening in "${activeWorkspace.workspace.name}".`
                  : "Here's what's happening with your projects today."}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              {canCreateProjects && (
                <button
                  onClick={handleOpenNewProject}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 20px",
                    background:
                      "linear-gradient(135deg, #0052cc 0%, #0065ff 100%)",
                    color: "white",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    boxShadow: "0 2px 8px rgba(0,82,204,0.3)",
                    transition:
                      "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  <Plus size={18} />
                  New Project
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workspace header (name + your role) */}
      <div className="container" style={{ marginTop: "16px" }}>
        <WorkspaceHeader />
      </div>

      {/* Dashboard Content: sidebar + main area */}
      <div className="container" style={{ padding: "32px 0" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 2fr 1fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* LEFT: Workspace sidebar */}
          <WorkspaceSidebar />

          {/* MIDDLE: Projects */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <FolderKanban size={22} color="#0052cc" />
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#172b4d",
                    margin: 0,
                    letterSpacing: "-0.3px",
                  }}
                >
                  Your Projects
                </h2>
              </div>
              <span
                style={{
                  color: "#6b778c",
                  fontSize: "14px",
                }}
              >
                {projectsLoading
                  ? "Loading..."
                  : `${displayedProjects.length} projects`}
              </span>
            </div>

            {projectsError && (
              <div
                style={{
                  marginBottom: "12px",
                  fontSize: "13px",
                  color: "#de350b",
                }}
              >
                {projectsError}
              </div>
            )}

            {/* Empty state when no projects */}
            {!projectsLoading && displayedProjects.length === 0 && (
              <div
                style={{
                  background: "white",
                  padding: "24px",
                  borderRadius: "8px",
                  border: "1px solid #e1e5e9",
                  textAlign: "center",
                  color: "#6b778c",
                  fontSize: "14px",
                  marginBottom: "16px",
                }}
              >
                <p style={{ marginBottom: "8px" }}>
                  No projects in this workspace yet.
                </p>
                <p style={{ marginBottom: 0 }}>
                  Click <strong>“New Project”</strong> to create your first
                  project.
                </p>
              </div>
            )}

            {/* Projects Grid */}
            <div
              style={{
                display: "grid",
                gap: "16px",
              }}
            >
              {displayedProjects.map((project) => (
                <div
                  key={project.id}
                  style={{
                    background: "white",
                    padding: "24px",
                    borderRadius: "10px",
                    border: "1px solid #e1e5e9",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 4px rgba(9,30,66,0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "16px",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "#172b4d",
                        margin: 0,
                      }}
                    >
                      {project.name}
                    </h3>
                    <div
                      style={{
                        padding: "4px 12px",
                        background: "#e3fcef",
                        color: "#00875a",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 500,
                      }}
                    >
                      {project.progress ?? 0}%
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      height: "6px",
                      background: "#dfe1e6",
                      borderRadius: "3px",
                      marginBottom: "16px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: "#0052cc",
                        width: `${project.progress ?? 0}%`,
                        borderRadius: "3px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        fontSize: "14px",
                        color: "#6b778c",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <ClipboardList size={14} /> {project.tasks ?? 0} tasks
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Users size={14} /> {project.members ?? 0} members
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <button
                        onClick={() => router.push(`/projects/${project.id}`)}
                        style={{
                          padding: "8px 16px",
                          background: "transparent",
                          color: "#0052cc",
                          border: "1.5px solid #0052cc",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                          transition: "all 0.15s ease",
                        }}
                      >
                        View Project
                      </button>
                      <ProjectDeleteButton
                        projectId={project.id}
                        projectName={project.name}
                        onDeleted={() => {
                          setDisplayedProjects((prev) =>
                            prev.filter((p) => p.id !== project.id)
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Quick stats + members + recent activity */}
          <div>
            {/* Quick Stats */}
            <div
              style={{
                background: "white",
                padding: "24px",
                borderRadius: "10px",
                border: "1px solid #e1e5e9",
                marginBottom: "24px",
                boxShadow: "0 1px 4px rgba(9,30,66,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "14px",
                }}
              >
                <BarChart3 size={16} color="#0052cc" />
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#172b4d",
                    margin: 0,
                  }}
                >
                  Quick Stats
                </h3>
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                {/* Active Projects */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "spaceBetween",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                  }}
                >
                  <span
                    style={{ fontSize: "13px", color: "#6b778c" }}
                  >
                    Active Projects
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#172b4d",
                    }}
                  >
                    {activeProjectsCount}
                  </span>
                </div>

                {/* Total Workspaces */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                  }}
                >
                  <span
                    style={{ fontSize: "13px", color: "#6b778c" }}
                  >
                    Total Workspaces
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#172b4d",
                    }}
                  >
                    {totalWorkspaces}
                  </span>
                </div>

                {/* Last project created */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                  }}
                >
                  <span
                    style={{ fontSize: "13px", color: "#6b778c" }}
                  >
                    Last Created
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#172b4d",
                      maxWidth: "140px",
                      textAlign: "right",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                    title={lastCreatedProjectName || undefined}
                  >
                    {lastCreatedProjectName || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Workspace members (workspace-level, NOT per-project) */}
            <WorkspaceMembersCard />

            {/* Workspace settings (delete workspace) */}
            <WorkspaceSettings />

            {/* Recent Activity */}
            <div
              style={{
                background: "white",
                padding: "24px",
                borderRadius: "10px",
                border: "1px solid #e1e5e9",
                boxShadow: "0 1px 4px rgba(9,30,66,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "14px",
                }}
              >
                <Clock size={16} color="#0052cc" />
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#172b4d",
                    margin: 0,
                  }}
                >
                  Recent Activity
                </h3>
              </div>

              {activityError && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#de350b",
                    marginBottom: "8px",
                  }}
                >
                  {activityError}
                </div>
              )}

              {activityLoading ? (
                <div style={{ fontSize: "13px", color: "#6b778c" }}>
                  Loading activity…
                </div>
              ) : activity.length === 0 ? (
                <div style={{ fontSize: "13px", color: "#6b778c" }}>
                  No activity yet.
                  <br />
                  When you create projects and tasks, we&apos;ll show the
                  latest updates here.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {activity.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px",
                        borderRadius: "6px",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          background: "#0052cc",
                          borderRadius: "50%",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#172b4d",
                          }}
                        >
                          {item.message ||
                            `Activity: ${item.type
                              .replace(/_/g, " ")
                              .toLowerCase()}`}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#6b778c",
                          }}
                        >
                          {item.project?.name
                            ? `Project: ${item.project.name} · `
                            : ""}
                          {formatTimeAgo(item.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
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
              padding: "28px",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "440px",
              boxShadow: "0 12px 40px rgba(9,30,66,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <FolderKanban size={22} color="#0052cc" />
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#172b4d",
                  margin: 0,
                }}
              >
                New Project
              </h2>
            </div>
            {activeWorkspace && (
              <p
                style={{
                  fontSize: "13px",
                  color: "#6b778c",
                  marginTop: 0,
                  marginBottom: "16px",
                }}
              >
                Workspace:{" "}
                <strong>{activeWorkspace.workspace.name}</strong>
              </p>
            )}

            {(localError || projectsError) && (
              <div
                style={{
                  marginBottom: "12px",
                  fontSize: "13px",
                  color: "#de350b",
                }}
              >
                {localError || projectsError}
              </div>
            )}

            <form
              onSubmit={handleCreateProject}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <input
                type="text"
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid #dfe1e6",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                }}
              />
              <textarea
                placeholder="Description (optional)"
                value={newProjectDescription}
                onChange={(e) =>
                  setNewProjectDescription(e.target.value)
                }
                rows={3}
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid #dfe1e6",
                  fontSize: "14px",
                  resize: "none",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                }}
              />

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
                  onClick={handleCloseNewProject}
                  disabled={projectCreating}
                  style={{
                    padding: "10px 18px",
                    fontSize: "14px",
                    fontWeight: 500,
                    borderRadius: "8px",
                    border: "1px solid #c1c7d0",
                    background: "white",
                    cursor: projectCreating
                      ? "not-allowed"
                      : "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={projectCreating || !newProjectName.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 18px",
                    fontSize: "14px",
                    fontWeight: 600,
                    borderRadius: "8px",
                    border: "none",
                    background:
                      projectCreating || !newProjectName.trim()
                        ? "#c1c7d0"
                        : "linear-gradient(135deg, #0052cc 0%, #0065ff 100%)",
                    color: "white",
                    cursor:
                      projectCreating || !newProjectName.trim()
                        ? "not-allowed"
                        : "pointer",
                    boxShadow:
                      projectCreating || !newProjectName.trim()
                        ? "none"
                        : "0 2px 6px rgba(0,82,204,0.3)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Plus size={16} />
                  {projectCreating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}