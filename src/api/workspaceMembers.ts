// src/api/workspaceMembers.ts
import type { WorkspaceRole } from "@/store/workspaceStore";
import type { RequestInit } from "next/dist/server/web/spec-extension/request";

type CallApiFn = (
  endpoint: string,
  options?: RequestInit
) => Promise<any>;

export interface WorkspaceUser {
  id: string;
  auth0Id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  user: WorkspaceUser;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
}

export interface InvitePayload {
  email: string;
  role: WorkspaceRole;
}

// ---- API helpers ----

export async function fetchWorkspaceMembers(
  callApi: CallApiFn,
  workspaceId: string
): Promise<WorkspaceMember[]> {
  return callApi(`/workspaces/${workspaceId}/members`);
}

export async function fetchWorkspaceInvites(
  callApi: CallApiFn,
  workspaceId: string
): Promise<WorkspaceInvite[]> {
  return callApi(`/workspaces/${workspaceId}/invites`);
}

export async function inviteWorkspaceMember(
  callApi: CallApiFn,
  workspaceId: string,
  payload: InvitePayload
): Promise<WorkspaceInvite> {
  return callApi(`/workspaces/${workspaceId}/invites`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWorkspaceMemberRole(
  callApi: CallApiFn,
  workspaceId: string,
  memberId: string,
  role: WorkspaceRole
): Promise<WorkspaceMember> {
  return callApi(`/workspaces/${workspaceId}/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeWorkspaceMember(
  callApi: CallApiFn,
  workspaceId: string,
  memberId: string
): Promise<void> {
  await callApi(`/workspaces/${workspaceId}/members/${memberId}`, {
    method: "DELETE",
  });
}