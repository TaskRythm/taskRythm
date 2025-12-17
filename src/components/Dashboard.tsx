"use client";

import { useState, useEffect } from "react";
import {
  FolderKanban, Users, ClipboardList, BarChart3, Clock, Plus,
  Sparkles, HeartPulse, Eye, FileText, TrendingUp, Activity
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
import { writeReleaseNotes } from "@/api/ai";
import ReleaseNotesModal from "./ReleaseNotesModal";

// Imports for AI & API
import { useAuth } from "@/hooks/useAuth";
import AiProjectModal from "./AiProjectModal";
import { analyzeProjectHealth } from "@/api/ai";
import { createTask } from "@/api/tasks";

// Helper to fetch tasks for the doctor
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
  const { callApi, getAccessTokenSilently } = useAuth();

  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const {
    projects, loading: projectsLoading, creating: projectCreating, error: projectsError, createProject,
  } = useProjects();
  const router = useRouter();

  // State for AI Modals
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedAiProjectId, setSelectedAiProjectId] = useState<string | null>(null);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [analyzingProjectName, setAnalyzingProjectName] = useState("");
  const [scribeModalOpen, setScribeModalOpen] = useState(false);
  const [scribeLoading, setScribeLoading] = useState(false);
  const [scribeContent, setScribeContent] = useState("");
  const [scribeProjectName, setScribeProjectName] = useState("");

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

  // New project modal state
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

  // Handle AI Task Creation for EXISTING Project
  const handleAiAccept = async (tasks: any[]) => {
    try {
      if (!selectedAiProjectId) {
        alert("No project selected for AI tasks!");
        return;
      }

      console.log(`Adding ${tasks.length} tasks to Project ID: ${selectedAiProjectId}...`);

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        await createTask(callApi, {
          projectId: selectedAiProjectId,
          title: task.title,
          description: task.description || "",
          status: (task.status || 'TODO').toUpperCase() as any,
          priority: (task.priority || 'MEDIUM').toUpperCase() as any,
          type: "TASK" as any,
          orderIndex: i
        } as any);

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      alert(`Success! Added ${tasks.length} tasks to the project.`);
      setShowAiModal(false);
      setSelectedAiProjectId(null);
      window.location.reload();

    } catch (error) {
      console.error("Failed to save AI tasks", error);
      alert("Error saving tasks. Check console.");
    }
  };

  // Doctor Logic
  const handleCheckHealth = async (projectId: string, name: string) => {
    setAnalyzingProjectName(name);
    setHealthModalOpen(true);
    setHealthLoading(true);
    setHealthData(null);

    try {
      const token = await getAccessTokenSilently();
      if (!token) throw new Error("No auth token");

      const tasks = await fetchProjectTasks(projectId, token);
      const analysis = await analyzeProjectHealth(tasks, token);

      setHealthData(analysis);
    } catch (error) {
      console.error("Health Check Failed", error);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleScribe = async (projectId: string, name: string) => {
    setScribeProjectName(name);
    setScribeModalOpen(true);
    setScribeLoading(true);
    setScribeContent("");

    try {
      const token = await getAccessTokenSilently();
      const rawTasks = await fetchProjectTasks(projectId, token);
      
      const cleanTasks = rawTasks.map((t: any) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        description: t.description || "",
        tag: (Array.isArray(t.tags) && t.tags.length > 0) ? t.tags[0] : "General"
      }));

      const result = await writeReleaseNotes(cleanTasks, token);
      
      const text = 
        result.markdownContent ||
        result.report || 
        result.content || 
        result.result || 
        (typeof result === 'string' ? result : null);

      if (text) {
        setScribeContent(text);
      } else {
        setScribeContent("Debug: The API returned data, but the frontend couldn't find the text field. Check console.");
        console.warn("Unexpected JSON structure:", result);
      }

    } catch (error) {
      console.error("Scribe Error", error);
      setScribeContent("Failed to generate report. Please try again.");
    } finally {
      setScribeLoading(false);
    }
  };

  const openAiPlannerForProject = (projectId: string) => {
    setSelectedAiProjectId(projectId);
    setShowAiModal(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%)", padding: 0 }}>
      {/* Enhanced Dashboard Header with Gradient */}
      <div style={{ 
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
        borderBottom: "none", 
        padding: "48px 0", 
        boxShadow: "0 4px 20px rgba(102, 126, 234, 0.25)",
        position: "relative",
        overflow: "hidden"
      }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                }}>
                  <TrendingUp size={24} color="white" />
                </div>
                <h1 style={{ fontSize: "36px", fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.5px" }}>
                  Welcome back, {user?.name || "User"}!
                </h1>
              </div>
              <p style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "17px", margin: 0, fontWeight: 500 }}>
                {activeWorkspace ? `Here's what's happening in "${activeWorkspace.workspace.name}".` : "Here's what's happening with your projects today."}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {canCreateProjects && (
                <button 
                  onClick={handleOpenNewProject} 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "10px", 
                    padding: "14px 24px", 
                    background: "white", 
                    color: "#667eea", 
                    borderRadius: "12px", 
                    fontWeight: 700, 
                    cursor: "pointer", 
                    border: "none", 
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)", 
                    transition: "all 0.2s ease",
                    fontSize: "15px"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.15)";
                  }}
                >
                  <Plus size={20} /> New Project
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: "24px" }}><WorkspaceHeader /></div>

      <div className="container" style={{ padding: "32px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "280px 2fr", gap: "28px", alignItems: "start" }}>
          <WorkspaceSidebar />

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
                }}>
                  <FolderKanban size={20} color="white" />
                </div>
                <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#1e293b", margin: 0, letterSpacing: "-0.4px" }}>Your Projects</h2>
              </div>
              <span style={{ 
                color: "#64748b", 
                fontSize: "14px", 
                background: "white", 
                padding: "8px 16px", 
                borderRadius: "20px",
                fontWeight: 600,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)"
              }}>
                {projectsLoading ? "Loading..." : `${displayedProjects.length} projects`}
              </span>
            </div>

            {projectsError && (
              <div style={{ 
                marginBottom: "16px", 
                fontSize: "14px", 
                color: "#ef4444", 
                background: "#fef2f2", 
                padding: "12px 16px", 
                borderRadius: "10px",
                border: "1px solid #fecaca"
              }}>
                {projectsError}
              </div>
            )}

            {!projectsLoading && displayedProjects.length === 0 && (
              <div style={{ 
                background: "white", 
                padding: "40px", 
                borderRadius: "16px", 
                border: "2px dashed #e2e8f0", 
                textAlign: "center", 
                color: "#64748b", 
                fontSize: "15px", 
                marginBottom: "16px" 
              }}>
                <div style={{ 
                  width: "64px", 
                  height: "64px", 
                  margin: "0 auto 16px", 
                  background: "#f1f5f9", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center" 
                }}>
                  <FolderKanban size={32} color="#94a3b8" />
                </div>
                <p style={{ marginBottom: "8px", fontWeight: 600, color: "#475569" }}>No projects in this workspace yet.</p>
                <p style={{ marginBottom: 0 }}>Click <strong>"New Project"</strong> to create your first project.</p>
              </div>
            )}

            <div style={{ display: "grid", gap: "20px" }}>
              {displayedProjects.map((project) => (
                <div 
                  key={project.id} 
                  style={{ 
                    background: "white", 
                    padding: "28px", 
                    borderRadius: "16px", 
                    border: "1px solid #e2e8f0", 
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 28px rgba(0, 0, 0, 0.12)";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                >
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "4px",
                    background: `linear-gradient(90deg, #667eea 0%, #764ba2 ${project.progress}%, #e2e8f0 ${project.progress}%)`,
                  }} />
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", margin: 0, letterSpacing: "-0.3px" }}>{project.name}</h3>
                    <div style={{ 
                      padding: "6px 14px", 
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                      color: "white", 
                      borderRadius: "20px", 
                      fontSize: "13px", 
                      fontWeight: 700,
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)"
                    }}>
                      {project.progress ?? 0}%
                    </div>
                  </div>
                  
                  <div style={{ 
                    height: "8px", 
                    background: "#f1f5f9", 
                    borderRadius: "10px", 
                    marginBottom: "20px", 
                    overflow: "hidden",
                    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)"
                  }}>
                    <div style={{ 
                      height: "100%", 
                      background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)", 
                      width: `${project.progress ?? 0}%`, 
                      borderRadius: "10px", 
                      transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 0 8px rgba(102, 126, 234, 0.5)"
                    }} />
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "20px", fontSize: "14px", color: "#64748b" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                        <ClipboardList size={16} color="#667eea" /> {project.tasks ?? 0} tasks
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                        <Users size={16} color="#667eea" /> {project.members ?? 0} members
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        onClick={() => openAiPlannerForProject(project.id)}
                        title="AI Planner: Add Tasks"
                        style={{ 
                          padding: "10px", 
                          background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)", 
                          color: "#7c3aed", 
                          border: "none", 
                          borderRadius: "10px", 
                          cursor: "pointer", 
                          transition: "all 0.2s ease", 
                          display: "flex", 
                          alignItems: "center",
                          boxShadow: "0 2px 8px rgba(124, 58, 237, 0.15)"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.1) rotate(5deg)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(124, 58, 237, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(124, 58, 237, 0.15)";
                        }}
                      >
                        <Sparkles size={18} />
                      </button>
                      
                      <button 
                        onClick={() => handleCheckHealth(project.id, project.name)} 
                        title="AI Project Doctor: Check Health" 
                        style={{ 
                          padding: "10px", 
                          background: "linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)", 
                          color: "#db2777", 
                          border: "none", 
                          borderRadius: "10px", 
                          cursor: "pointer", 
                          transition: "all 0.2s ease", 
                          display: "flex", 
                          alignItems: "center",
                          boxShadow: "0 2px 8px rgba(219, 39, 119, 0.15)"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.1)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(219, 39, 119, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(219, 39, 119, 0.15)";
                        }}
                      >
                        <HeartPulse size={18} />
                      </button>

                      <button
                        onClick={() => handleScribe(project.id, project.name)}
                        title="The Scribe: Generate Release Notes"
                        style={{ 
                          padding: "10px", 
                          background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)", 
                          color: "#2563eb", 
                          border: "none", 
                          borderRadius: "10px", 
                          cursor: "pointer", 
                          transition: "all 0.2s ease", 
                          display: "flex", 
                          alignItems: "center",
                          boxShadow: "0 2px 8px rgba(37, 99, 235, 0.15)"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.1)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(37, 99, 235, 0.15)";
                        }}
                      >
                        <FileText size={18} />
                      </button>
                      
                      <button 
                        onClick={() => router.push(`/projects/${project.id}`)} 
                        style={{
                          padding: "10px 16px",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                          border: "none",
                          borderRadius: "10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 600,
                          transition: "all 0.2s ease",
                          boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.05)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.3)";
                        }}
                        aria-label="View Project"
                      >
                        <Eye size={18} />
                      </button>
                      
                      <ProjectDeleteButton 
                        projectId={project.id} 
                        projectName={project.name} 
                        onDeleted={() => { 
                          setDisplayedProjects((prev) => prev.filter((p) => p.id !== project.id)); 
                        }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            {/* Enhanced Stats Card */}
            <div style={{ 
              background: "white", 
              padding: "28px", 
              borderRadius: "16px", 
              border: "1px solid #e2e8f0", 
              marginBottom: "24px", 
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)" 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
                }}>
                  <BarChart3 size={18} color="white" />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", margin: 0, letterSpacing: "-0.2px" }}>Quick Stats</h3>
              </div>
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "14px 16px", 
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", 
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                >
                  <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 600 }}>Active Projects</span>
                  <span style={{ 
                    fontSize: "18px", 
                    fontWeight: 800, 
                    color: "#1e293b",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }}>
                    {activeProjectsCount}
                  </span>
                </div>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "14px 16px", 
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", 
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                >
                  <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 600 }}>Total Workspaces</span>
                  <span style={{ 
                    fontSize: "18px", 
                    fontWeight: 800, 
                    color: "#1e293b",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }}>
                    {totalWorkspaces}
                  </span>
                </div>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "14px 16px", 
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", 
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                >
                  <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 600 }}>Last Created</span>
                  <span style={{ 
                    fontSize: "13px", 
                    fontWeight: 700, 
                    color: "#1e293b", 
                    maxWidth: "140px", 
                    textAlign: "right", 
                    overflow: "hidden", 
                    whiteSpace: "nowrap", 
                    textOverflow: "ellipsis" 
                  }} 
                  title={lastCreatedProjectName || undefined}>
                    {lastCreatedProjectName || "—"}
                  </span>
                </div>
              </div>
            </div>

            <WorkspaceMembersCard />
            <WorkspaceSettings />

            {/* Enhanced Activity Card */}
            <div style={{ 
              background: "white", 
              padding: "28px", 
              borderRadius: "16px", 
              border: "1px solid #e2e8f0", 
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)" 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
                }}>
                  <Clock size={18} color="white" />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", margin: 0, letterSpacing: "-0.2px" }}>Recent Activity</h3>
              </div>
              {activityError && (
                <div style={{ 
                  fontSize: "13px", 
                  color: "#ef4444", 
                  marginBottom: "12px",
                  padding: "10px 12px",
                  background: "#fef2f2",
                  borderRadius: "8px",
                  border: "1px solid #fecaca"
                }}>
                  {activityError}
                </div>
              )}
              {activityLoading ? (
                <div style={{ 
                  fontSize: "14px", 
                  color: "#64748b", 
                  textAlign: "center", 
                  padding: "32px 0" 
                }}>
                  <Activity size={32} color="#cbd5e1" style={{ marginBottom: "12px" }} />
                  <div>Loading activity…</div>
                </div>
              ) : activity.length === 0 ? (
                <div style={{ 
                  fontSize: "14px", 
                  color: "#64748b", 
                  textAlign: "center", 
                  padding: "32px 0" 
                }}>
                  <Activity size={32} color="#cbd5e1" style={{ marginBottom: "12px" }} />
                  <div>No activity yet.</div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "14px" }}>
                  {activity.slice(0, 10).map((item) => (
                    <div 
                      key={item.id} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "14px", 
                        padding: "12px", 
                        borderRadius: "10px",
                        transition: "all 0.2s ease",
                        border: "1px solid transparent"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div style={{ 
                        width: "10px", 
                        height: "10px", 
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                        borderRadius: "50%",
                        boxShadow: "0 0 0 3px rgba(102, 126, 234, 0.1)"
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: 600, marginBottom: "2px" }}>
                          {item.message || `Activity: ${item.type}`}
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>
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

      {/* Enhanced New Project Modal */}
      {showNewProjectModal && (
        <div 
          style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(0, 0, 0, 0.6)", 
            backdropFilter: "blur(4px)",
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            zIndex: 1000,
            animation: "fadeIn 0.2s ease"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseNewProject();
          }}
        >
          <div 
            style={{ 
              background: "white", 
              padding: "36px", 
              borderRadius: "20px", 
              width: "100%", 
              maxWidth: "480px", 
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              animation: "slideUp 0.3s ease"
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
                boxShadow: "0 4px 16px rgba(102, 126, 234, 0.3)"
              }}>
                <Plus size={24} color="white" />
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#1e293b", marginBottom: "8px", letterSpacing: "-0.4px" }}>
                Create New Project
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                Start a new project to organize your work
              </p>
            </div>
            
            <form onSubmit={handleCreateProject} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "13px", 
                  fontWeight: 700, 
                  color: "#475569", 
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Project Name *
                </label>
                <input 
                  type="text" 
                  placeholder="Enter project name" 
                  value={newProjectName} 
                  onChange={(e) => setNewProjectName(e.target.value)} 
                  style={{ 
                    width: "100%",
                    padding: "14px 16px", 
                    borderRadius: "12px", 
                    border: "2px solid #e2e8f0",
                    fontSize: "15px",
                    fontWeight: 500,
                    transition: "all 0.2s ease",
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#667eea";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: "13px", 
                  fontWeight: 700, 
                  color: "#475569", 
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Description
                </label>
                <textarea 
                  placeholder="What's this project about?" 
                  value={newProjectDescription} 
                  onChange={(e) => setNewProjectDescription(e.target.value)} 
                  rows={4} 
                  style={{ 
                    width: "100%",
                    padding: "14px 16px", 
                    borderRadius: "12px", 
                    border: "2px solid #e2e8f0",
                    fontSize: "15px",
                    fontWeight: 500,
                    resize: "vertical",
                    transition: "all 0.2s ease",
                    outline: "none",
                    fontFamily: "inherit"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#667eea";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {localError && (
                <div style={{
                  padding: "12px 16px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  color: "#ef4444",
                  fontSize: "14px",
                  fontWeight: 600
                }}>
                  {localError}
                </div>
              )}
              
              <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button 
                  type="button" 
                  onClick={handleCloseNewProject}
                  disabled={projectCreating}
                  style={{ 
                    padding: "12px 24px", 
                    borderRadius: "12px", 
                    background: "white", 
                    border: "2px solid #e2e8f0",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#64748b",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!projectCreating) {
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
                  type="submit"
                  disabled={projectCreating || !newProjectName.trim()}
                  style={{ 
                    padding: "12px 28px", 
                    borderRadius: "12px", 
                    background: projectCreating || !newProjectName.trim() 
                      ? "#cbd5e1" 
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                    color: "white", 
                    border: "none",
                    fontSize: "15px",
                    fontWeight: 700,
                    cursor: projectCreating || !newProjectName.trim() ? "not-allowed" : "pointer",
                    boxShadow: projectCreating || !newProjectName.trim() 
                      ? "none" 
                      : "0 4px 16px rgba(102, 126, 234, 0.4)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!projectCreating && newProjectName.trim()) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = projectCreating || !newProjectName.trim() 
                      ? "none" 
                      : "0 4px 16px rgba(102, 126, 234, 0.4)";
                  }}
                >
                  {projectCreating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Modals - keep functionality intact */}
      <AiProjectModal 
        isOpen={showAiModal} 
        onClose={() => { 
          setShowAiModal(false); 
          setSelectedAiProjectId(null); 
        }} 
        onAccept={handleAiAccept} 
      />

      <ProjectHealthModal 
        isOpen={healthModalOpen} 
        onClose={() => setHealthModalOpen(false)} 
        projectName={analyzingProjectName} 
        data={healthData} 
        loading={healthLoading} 
      />

      <ReleaseNotesModal
        isOpen={scribeModalOpen}
        onClose={() => setScribeModalOpen(false)}
        projectName={scribeProjectName}
        content={scribeContent}
        loading={scribeLoading}
      />

      <style>{`
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