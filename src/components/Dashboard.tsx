"use client";

import { useState, useEffect } from "react";
import {
  FolderKanban, Users, ClipboardList, Clock, Plus,
  Eye, TrendingUp, Activity, X
} from "lucide-react";

import WorkspaceSidebar from "./WorkspaceSidebar";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useProjects } from "@/hooks/useProjects";
import { useRouter } from "next/navigation";
import { useWorkspaceActivity } from "@/hooks/useWorkspaceActivity";
import { WorkspaceHeader } from "./WorkspaceHeader";
import WorkspaceMembersCard from "./WorkspaceMembersCard";
import ProjectDeleteButton from "./ProjectDeleteButton"; 
import ProjectHealthModal from "./ProjectHealthModal";
import { writeReleaseNotes } from "@/api/ai";
import ReleaseNotesModal from "./ReleaseNotesModal";
import ProjectChatModal from "./ProjectChatModal";
import { useToast } from "@/contexts/ToastContext";

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
  const toast = useToast();
  const [membersExpanded, setMembersExpanded] = useState(false);

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
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatProjectName, setChatProjectName] = useState("");
  const [chatContextTasks, setChatContextTasks] = useState<any[]>([]);

  // 👇 State for dynamic project data
  const [enrichedProjects, setEnrichedProjects] = useState<any[]>([]);

  const activeWorkspace =
    workspaces.find((w: any) => w.workspaceId === activeWorkspaceId) ??
    workspaces[0] ??
    null;

  const canCreateProjects =
    activeWorkspace &&
    ['OWNER', 'ADMIN', 'MEMBER'].includes(activeWorkspace.role);

  const {
    activity = [], 
    loading: activityLoading,
    error: activityError,
  } = useWorkspaceActivity(); 

  // EFFECT: Fetch detailed stats for projects
  useEffect(() => {
    const fetchDetails = async () => {
      if (!projects.length) {
        setEnrichedProjects([]);
        return;
      }

      try {
        const token = await getAccessTokenSilently();
        
        const enriched = await Promise.all(projects.map(async (p: any) => {
          try {
            const tasks = await fetchProjectTasks(p.id, token);
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter((t: any) => t.status === 'DONE').length;
            const progress = totalTasks > 0 
              ? Math.round((completedTasks / totalTasks) * 100) 
              : 0;

            return {
              ...p,
              tasksCount: totalTasks,
              membersCount: p.membersCount || 1,
              progress: progress
            };
          } catch (err) {
            console.error(`Failed to fetch stats for project ${p.id}`, err);
            return p;
          }
        }));

        setEnrichedProjects(enriched);
      } catch (error) {
        console.error("Error enriching project data", error);
        setEnrichedProjects(projects);
      }
    };

    fetchDetails();
  }, [projects, getAccessTokenSilently]);

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

  const handleAiAccept = async (tasks: any[]) => {
    try {
      if (!selectedAiProjectId) {
        toast.warning("No project selected for AI tasks!");
        return;
      }
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
      toast.success(`Successfully added ${tasks.length} tasks to the project!`);
      setShowAiModal(false);
      setSelectedAiProjectId(null);
      window.location.reload();
    } catch (error) {
      console.error("Failed to save AI tasks", error);
      toast.error("Error saving tasks. Please try again.");
    }
  };

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
      const text = result.markdownContent || result.report || result.content || result.result || (typeof result === 'string' ? result : null);
      if (text) {
        setScribeContent(text);
      } else {
        setScribeContent("Debug: The API returned data, but the frontend couldn't find the text field. Check console.");
      }
    } catch (error) {
      console.error("Scribe Error", error);
      setScribeContent("Failed to generate report. Please try again.");
    } finally {
      setScribeLoading(false);
    }
  };

  const handleOpenChat = async (projectId: string, name: string) => {
    setChatProjectName(name);
    setChatContextTasks([]); 
    try {
      const token = await getAccessTokenSilently();
      const tasks = await fetchProjectTasks(projectId, token);
      const cleanTasks = tasks.map((t: any) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        description: t.description || "",
        tag: (Array.isArray(t.tags) && t.tags.length > 0) ? t.tags[0] : "General"
      }));
      setChatContextTasks(cleanTasks);
      setChatModalOpen(true);
    } catch (error) {
      console.error("Failed to load context for chat", error);
      toast.error("Could not load project tasks. Chat unavailable.");
    }
  };

  const openAiPlannerForProject = (projectId: string) => {
    setSelectedAiProjectId(projectId);
    setShowAiModal(true);
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%)", 
      paddingTop: "80px",
      paddingLeft: 0
    }}>
      {/* Header */}
      <div style={{ 
        background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)", 
        borderBottom: "none", 
        padding: "48px 0", 
        boxShadow: "0 4px 20px rgba(59, 130, 246, 0.25)",
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
                {activeWorkspace ? `Here’s what’s happening in "${activeWorkspace.workspace.name}".` : "Here's what's happening with your projects today."}
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
                    color: "#3B82F6", 
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
        
        {/* GRID LAYOUT */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "28px", alignItems: "start", transition: "all 0.3s ease" }}>
          
          {/* 1. SIDEBAR (Span 3) */}
          <div style={{ gridColumn: "span 3" }}>
            <WorkspaceSidebar />
            <div style={{ 
              background: "white", 
              padding: "28px", 
              marginTop: "24px",
              borderRadius: "16px", 
              border: "1px solid #e2e8f0", 
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)" 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
                }}>
                  <Clock size={18} color="white" />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", margin: 0, letterSpacing: "-0.2px" }}>Recent Activity</h3>
              </div>
              {activityError && (
                <div style={{ fontSize: "13px", color: "#ef4444", marginBottom: "12px", padding: "10px", background: "#fef2f2", borderRadius: "8px" }}>
                  {activityError}
                </div>
              )}
              {activityLoading ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "13px" }}>Loading...</div>
              ) : activity.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "13px" }}>No recent activity</div>
              ) : (
                <div style={{ display: "grid", gap: "14px" }}>
                  {activity.slice(0, 5).map((item) => (
                    <div key={item.id} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3B82F6" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{item.message}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>{formatTimeAgo(item.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. PROJECTS LIST (Span 6 → 3 when expanded) */}
          <div style={{ gridColumn: membersExpanded ? "span 3" : "span 6", transition: "all 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
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
                {projectsLoading ? "Loading..." : `${enrichedProjects.length} projects`}
              </span>
            </div>

            {projectsError && (
              <div style={{ marginBottom: "16px", fontSize: "14px", color: "#ef4444", background: "#fef2f2", padding: "12px 16px", borderRadius: "10px", border: "1px solid #fecaca" }}>
                {projectsError}
              </div>
            )}

            {!projectsLoading && enrichedProjects.length === 0 && (
              <div style={{ background: "white", padding: "40px", borderRadius: "16px", border: "2px dashed #e2e8f0", textAlign: "center", color: "#64748b" }}>
                <FolderKanban size={32} color="#94a3b8" style={{ margin: "0 auto 16px" }} />
                <p style={{ fontWeight: 600 }}>No projects yet.</p>
                <p style={{ fontSize: "13px" }}>Create one to get started.</p>
              </div>
            )}

            <div style={{ display: "grid", gap: "20px" }}>
              {enrichedProjects.map((project) => (
                <div 
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  style={{ 
                    background: "white", 
                    padding: "28px", 
                    borderRadius: "16px", 
                    border: "1px solid #e2e8f0", 
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    position: "relative",
                    cursor: "pointer",
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
                  {/* Progress Bar (Manually rounded top corners because of visible overflow) */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "4px",
                    borderTopLeftRadius: "16px",
                    borderTopRightRadius: "16px",
                    background: `linear-gradient(90deg, #3B82F6 0%, #2563EB ${project.progress}%, #e2e8f0 ${project.progress}%)`,
                  }} />
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", margin: 0 }}>{project.name}</h3>
                    <div style={{ 
                      padding: "6px 14px", 
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                      color: "white", 
                      borderRadius: "20px", 
                      fontSize: "13px", 
                      fontWeight: 700
                    }}>
                      {project.progress}%
                    </div>
                  </div>
                  
                  <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "10px", marginBottom: "20px", overflow: "hidden" }}>
                    <div style={{ 
                      height: "100%", 
                      background: "linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)",
                      width: `${project.progress}%`, 
                      borderRadius: "10px", 
                      transition: "width 0.5s ease"
                    }} />
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "20px", fontSize: "14px", color: "#64748b" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                        <ClipboardList size={16} color="#3B82F6" /> {project.tasksCount} tasks
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                        <Users size={16} color="#3B82F6" /> {project.membersCount} members
                      </span>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: "8px", alignItems: "center", position: "relative" }}>
                       <ProjectDeleteButton 
                         projectId={project.id} 
                         projectName={project.name} 
                         onDeleted={() => { 
                           setEnrichedProjects((prev) => prev.filter((p) => p.id !== project.id)); 
                         }} 
                       />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. RIGHT SIDEBAR (Span 3 → 6 when expanded) */}
          <div style={{ gridColumn: membersExpanded ? "span 6" : "span 3", transition: "all 0.3s ease" }}>
            <WorkspaceMembersCard isExpanded={membersExpanded} onExpandAction={setMembersExpanded} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNewProjectModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }} onClick={() => handleCloseNewProject()}>
            <div style={{ background: "white", padding: "32px", borderRadius: "16px", width: "400px" }} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ marginBottom: "16px" }}>New Project</h2>
                <input placeholder="Name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <textarea placeholder="Description" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button onClick={handleCloseNewProject} style={{ padding: "8px 16px", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px" }}>Cancel</button>
                    <button onClick={handleCreateProject} style={{ padding: "8px 16px", background: "#3B82F6", color: "white", border: "none", borderRadius: "8px" }}>Create</button>
                </div>
            </div>
        </div>
      )}

      <AiProjectModal isOpen={showAiModal} onClose={() => setShowAiModal(false)} onAccept={handleAiAccept} />
      <ProjectHealthModal isOpen={healthModalOpen} onClose={() => setHealthModalOpen(false)} projectName={analyzingProjectName} data={healthData} loading={healthLoading} />
      <ReleaseNotesModal isOpen={scribeModalOpen} onClose={() => setScribeModalOpen(false)} projectName={scribeProjectName} content={scribeContent} loading={scribeLoading} />
      <ProjectChatModal isOpen={chatModalOpen} onClose={() => setChatModalOpen(false)} projectName={chatProjectName} contextTasks={chatContextTasks} />
    </div>
  );
}