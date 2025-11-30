// src/api/projects.ts
export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;

  // Optional “computed” fields – backend can add these later
  progress?: number | null;
  tasksCount?: number | null;
  membersCount?: number | null;
}

type CallApiFn = (
  endpoint: string,
  options?: RequestInit
) => Promise<any>;

export async function fetchProjects(
  callApi: CallApiFn,
  workspaceId: string
): Promise<Project[]> {
  const res = await callApi(
    `projects?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: "GET" }
  );

  return (res && res.projects) || [];
}

export async function createProject(
  callApi: CallApiFn,
  data: { workspaceId: string; name: string; description?: string }
): Promise<Project> {
  const res = await callApi("projects", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return (res && res.project) || res;
}