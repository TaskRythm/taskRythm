"use client";

import { useState, useEffect } from "react";
import {
  FolderKanban, Users, ClipboardList, BarChart3, Clock, Plus,
  Sparkles, HeartPulse, Eye
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
import ProjectHealthModal from "./ProjectHealthModal";

// 👇 Imports for AI & API
import { useAuth } from "@/hooks/useAuth";
import AiProjectModal from "./AiProjectModal";
// import ProjectHealthModal from "./ProjectHealthModal"; 
import { analyzeProjectHealth } from "@/api/ai";
import { createTask } from "@/api/tasks"; // 👈 Import your existing API function

// Helper to fetch tasks for the doctor (Raw fetch is okay here for read-only)
async function fetchProjectTasks(projectId: string, token: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const res = await fetch(`${API_URL}/tasks/project/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  const data = await res.json();
  return data.tasks || [];
}

interface DashboardProps {
  user: any;
}

export default function Dashboard({ user }: DashboardProps) {
  // 👇 Get callApi from your hook
  const { callApi, getAccessTokenSilently } = useAuth();

  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const {
    projects, loading: projectsLoading, creating: projectCreating, error: projectsError, createProject,
  } = useProjects();
  const router = useRouter();

  // 👇 State for AI Modals
  const [showAiModal, setShowAiModal] = useState(false);
  // 👇 NEW: Track which project launched the AI planner
  const [selectedAiProjectId, setSelectedAiProjectId] = useState<string | null>(null);

  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [analyzingProjectName, setAnalyzingProjectName] = useState("");

  const activeWorkspace =
    workspaces.find((w: any) => w.workspaceId === activeWorkspaceId) ??
    workspaces[0] ??
    null;

  const canCreateProjects =
    activeWorkspace &&
    ['OWNER', 'ADMIN', 'MEMBER'].includes(activeWorkspace.role);

  const {
    activity, loading: activityLoading, error: activityError,
  } = useWorkspaceActivity();

  const realProjects = projects.map((p: any) => ({
    id: p.id,
    name: p.name,
    progress: p.progress ?? 0,
    tasks: p.tasksCount ?? 0,
    members: p.membersCount ?? 0,
    archived: p.archived ?? false,
    createdAt: p.createdAt ?? null,
  }));

  const [displayedProjects, setDisplayedProjects] = useState(realProjects);

  useEffect(() => {
    setDisplayedProjects(realProjects);
  }, [projects.length]);

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

  const activeProjectsCount = displayedProjects.filter((p) => !p.archived).length;
  const totalWorkspaces = workspaces.length;

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
      lastCreatedProjectName = displayedProjects[displayedProjects.length - 1].name ?? null;
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

  // 👇 MODIFIED FEATURE 1: Handle AI Task Creation for EXISTING Project
  const handleAiAccept = async (tasks: any[]) => {
    try {
      if (!selectedAiProjectId) {
        alert("No project selected for AI tasks!");
        return;
      }

      console.log(`Adding ${tasks.length} tasks to Project ID: ${selectedAiProjectId}...`);

      // Create Tasks Sequentially with FORCED ORDER
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        await createTask(callApi, {
          projectId: selectedAiProjectId, // 👈 Use the selected existing project ID
          title: task.title,
          description: task.description || "",
          status: (task.status || 'TODO').toUpperCase() as any,
          priority: (task.priority || 'MEDIUM').toUpperCase() as any,
          type: "TASK" as any,
          orderIndex: i
        } as any);

        // Keep a small delay just to be safe
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      alert(`Success! Added ${tasks.length} tasks to the project.`);
      setShowAiModal(false);
      setSelectedAiProjectId(null); // Reset selection
      window.location.reload();

    } catch (error) {
      console.error("Failed to save AI tasks", error);
      alert("Error saving tasks. Check console.");
    }
  };

  // 👇 FEATURE 3: Doctor Logic
  const handleCheckHealth = async (projectId: string, name: string) => {
    setAnalyzingProjectName(name);
    setHealthModalOpen(true);
    setHealthLoading(true);
    setHealthData(null);

    try {
      const token = await getAccessTokenSilently();
      if (!token) throw new Error("No auth token");

      // Fetch tasks and send to AI
      const tasks = await fetchProjectTasks(projectId, token);
      const analysis = await analyzeProjectHealth(tasks, token);
      
      setHealthData(analysis);
    } catch (error) {
      console.error("Health Check Failed", error);
    } finally {
      setHealthLoading(false);
    }
  };

  // 👇 Helper to open AI modal for a specific project
  const openAiPlannerForProject = (projectId: string) => {
    setSelectedAiProjectId(projectId);
    setShowAiModal(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5f7", padding: 0 }}>
      {/* Dashboard Header */}
      <div style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)", borderBottom: "1px solid #e1e5e9", padding: "32px 0", boxShadow: "0 1px 3px rgba(9,30,66,0.08)" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#172b4d", marginBottom: "8px" }}>
                Welcome back, {user?.name || "User"}!
              </h1>
              <p style={{ color: "#6b778c", fontSize: "16px", margin: 0 }}>
                {activeWorkspace ? `Here’s what’s happening in "${activeWorkspace.workspace.name}".` : "Here's what's happening with your projects today."}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {canCreateProjects && (
                <>
                  {/* Removed Global AI Planner Button */}
                  <button onClick={handleOpenNewProject} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 20px", background: "linear-gradient(135deg, #0052cc 0%, #0065ff 100%)", color: "white", borderRadius: "8px", fontWeight: 600, cursor: "pointer", border: "none", boxShadow: "0 2px 8px rgba(0,82,204,0.3)", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}>
                    <Plus size={18} /> New Project
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: "16px" }}><WorkspaceHeader /></div>

      <div className="container" style={{ padding: "32px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "260px 2fr 1fr", gap: "24px", alignItems: "start" }}>
          <WorkspaceSidebar />

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FolderKanban size={22} color="#0052cc" />
                <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#172b4d", margin: 0, letterSpacing: "-0.3px" }}>Your Projects</h2>
              </div>
              <span style={{ color: "#6b778c", fontSize: "14px" }}>{projectsLoading ? "Loading..." : `${displayedProjects.length} projects`}</span>
            </div>

            {projectsError && <div style={{ marginBottom: "12px", fontSize: "13px", color: "#de350b" }}>{projectsError}</div>}

            {!projectsLoading && displayedProjects.length === 0 && (
              <div style={{ background: "white", padding: "24px", borderRadius: "8px", border: "1px solid #e1e5e9", textAlign: "center", color: "#6b778c", fontSize: "14px", marginBottom: "16px" }}>
                <p style={{ marginBottom: "8px" }}>No projects in this workspace yet.</p>
                <p style={{ marginBottom: 0 }}>Click <strong>“New Project”</strong> to create your first project.</p>
              </div>
            )}

            <div style={{ display: "grid", gap: "16px" }}>
              {displayedProjects.map((project) => (
                <div key={project.id} style={{ background: "white", padding: "24px", borderRadius: "10px", border: "1px solid #e1e5e9", transition: "all 0.2s ease", boxShadow: "0 1px 4px rgba(9,30,66,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#172b4d", margin: 0 }}>{project.name}</h3>
                    <div style={{ padding: "4px 12px", background: "#e3fcef", color: "#00875a", borderRadius: "12px", fontSize: "12px", fontWeight: 500 }}>{project.progress ?? 0}%</div>
                  </div>
                  <div style={{ height: "6px", background: "#dfe1e6", borderRadius: "3px", marginBottom: "16px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "#0052cc", width: `${project.progress ?? 0}%`, borderRadius: "3px", transition: "width 0.3s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "16px", fontSize: "14px", color: "#6b778c" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><ClipboardList size={14} /> {project.tasks ?? 0} tasks</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Users size={14} /> {project.members ?? 0} members</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>

                      {/* 👇 AI PLANNER BUTTON (Moved Here) */}
                      <button
                        onClick={() => openAiPlannerForProject(project.id)}
                        title="AI Planner: Add Tasks"
                        style={{ padding: "8px", background: "#f3e8ff", color: "#6b21a8", border: "1px solid #d8b4fe", borderRadius: "6px", cursor: "pointer", transition: "all 0.15s ease", display: "flex", alignItems: "center" }}
                      >
                        <Sparkles size={16} />
                      </button>

                      <button onClick={() => handleCheckHealth(project.id, project.name)} title="AI Project Doctor: Check Health" style={{ padding: "8px", background: "#fff0f6", color: "#c41d7f", border: "1px solid #ffadd2", borderRadius: "6px", cursor: "pointer", transition: "all 0.15s ease", display: "flex", alignItems: "center" }}>
                        <HeartPulse size={16} />
                      </button>
                      <button onClick={() => router.push(`/projects/${project.id}`)} style={{
                          padding: "8px",
                          background: "transparent",
                          color: "#0052cc",
                          border: "1.5px solid #0052cc",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        aria-label="View Project"
                      >
                        <Eye size={18} />
                      </button>
                      <ProjectDeleteButton projectId={project.id} projectName={project.name} onDeleted={() => { setDisplayedProjects((prev) => prev.filter((p) => p.id !== project.id)); }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            {/* Right Sidebar Stats - Unchanged */}
            <div style={{ background: "white", padding: "24px", borderRadius: "10px", border: "1px solid #e1e5e9", marginBottom: "24px", boxShadow: "0 1px 4px rgba(9,30,66,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <BarChart3 size={16} color="#0052cc" />
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#172b4d", margin: 0 }}>Quick Stats</h3>
              </div>
              <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8f9fa", borderRadius: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#6b778c" }}>Active Projects</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#172b4d" }}>{activeProjectsCount}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8f9fa", borderRadius: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#6b778c" }}>Total Workspaces</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#172b4d" }}>{totalWorkspaces}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8f9fa", borderRadius: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#6b778c" }}>Last Created</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#172b4d", maxWidth: "140px", textAlign: "right", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }} title={lastCreatedProjectName || undefined}>
                    {lastCreatedProjectName || "—"}
                  </span>
                </div>
              </div>
            </div>

            <WorkspaceMembersCard />
            <WorkspaceSettings />

            <div style={{ background: "white", padding: "24px", borderRadius: "10px", border: "1px solid #e1e5e9", boxShadow: "0 1px 4px rgba(9,30,66,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <Clock size={16} color="#0052cc" />
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#172b4d", margin: 0 }}>Recent Activity</h3>
              </div>
              {activityError && <div style={{ fontSize: "13px", color: "#de350b", marginBottom: "8px" }}>{activityError}</div>}
              {activityLoading ? (
                <div style={{ fontSize: "13px", color: "#6b778c" }}>Loading activity…</div>
              ) : activity.length === 0 ? (
                <div style={{ fontSize: "13px", color: "#6b778c" }}>No activity yet.</div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {activity.slice(0, 10).map((item) => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px", borderRadius: "6px" }}>
                      <div style={{ width: "8px", height: "8px", background: "#0052cc", borderRadius: "50%" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", color: "#172b4d" }}>{item.message || `Activity: ${item.type}`}</div>
                        <div style={{ fontSize: "12px", color: "#6b778c" }}>{formatTimeAgo(item.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Standard New Project Modal */}
      {showNewProjectModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: "28px", borderRadius: "12px", width: "100%", maxWidth: "440px", boxShadow: "0 12px 40px rgba(9,30,66,0.3)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#172b4d", marginBottom: "16px" }}>New Project</h2>
            <form onSubmit={handleCreateProject} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input type="text" placeholder="Project name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} style={{ padding: "12px 14px", borderRadius: "8px", border: "1px solid #dfe1e6" }} />
              <textarea placeholder="Description" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} rows={3} style={{ padding: "12px 14px", borderRadius: "8px", border: "1px solid #dfe1e6" }} />
              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={handleCloseNewProject} style={{ padding: "10px 18px", borderRadius: "8px", background: "white", border: "1px solid #c1c7d0" }}>Cancel</button>
                <button type="submit" style={{ padding: "10px 18px", borderRadius: "8px", background: "#0052cc", color: "white", border: "none" }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature 1: AI Planner Modal */}
      <AiProjectModal isOpen={showAiModal} onClose={() => { setShowAiModal(false); setSelectedAiProjectId(null); }} onAccept={handleAiAccept} />

      {/* Feature 2: Doctor Modal */}
      <ProjectHealthModal isOpen={healthModalOpen} onClose={() => setHealthModalOpen(false)} projectName={analyzingProjectName} data={healthData} loading={healthLoading} />
      
    </div>
  );
}