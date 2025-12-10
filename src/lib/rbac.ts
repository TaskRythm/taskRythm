import type { WorkspaceRole } from "@/store/workspaceStore";

export const canViewWorkspace = (role?: WorkspaceRole | null) => !!role;

export const canManageTasks = (role?: WorkspaceRole | null) =>
  role === "OWNER" || role === "ADMIN" || role === "MEMBER";

export const canManageProjects = (role?: WorkspaceRole | null) =>
  role === "OWNER" || role === "ADMIN" || role === "MEMBER";

export const canArchiveProjects = (role?: WorkspaceRole | null) =>
  role === "OWNER" || role === "ADMIN";

export const canInviteMembers = (role?: WorkspaceRole | null) =>
  role === "OWNER" || role === "ADMIN";

export const canManageMembers = (role?: WorkspaceRole | null) =>
  role === "OWNER"; // if you later want ADMIN to manage members, extend this
