import type { WorkspaceMembership } from "@/store/workspaceStore";

export interface CreateWorkspacePayload {
  name: string;
  description?: string;
}

// callApi: (endpoint: string, options?: RequestInit) => Promise<any>
export async function fetchWorkspaces(
  callApi: (endpoint: string, options?: RequestInit) => Promise<any>
): Promise<WorkspaceMembership[]> {
  return callApi("workspaces", { method: "GET" });
}

export async function createWorkspace(
  callApi: (endpoint: string, options?: RequestInit) => Promise<any>,
  data: CreateWorkspacePayload
): Promise<WorkspaceMembership> {
  return callApi("workspaces", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
