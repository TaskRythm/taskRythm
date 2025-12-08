// src/api/activity.ts

export type ActivityType =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_STATUS_CHANGED"
  | "PROJECT_CREATED"
  | "PROJECT_ARCHIVED"
  | string; // fallback

export interface ActivityItem {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  taskId?: string | null;
  type: ActivityType;
  message?: string | null;
  createdAt: string;

  project?: { id: string; name: string | null };
  task?: { id: string; title: string | null };
  user?: { id: string; name: string | null; email: string | null };
}

type CallApiFn = (endpoint: string, options?: RequestInit) => Promise<any>;

export async function fetchWorkspaceActivity(
  callApi: CallApiFn,
  workspaceId: string
): Promise<ActivityItem[]> {
  const res = await callApi(
    `activity/workspace/${encodeURIComponent(workspaceId)}`,
    { method: "GET" }
  );

  return (res && res.activity) || [];
}
