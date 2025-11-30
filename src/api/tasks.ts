export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

type CallApiFn = (endpoint: string, options?: RequestInit) => Promise<any>;

export async function fetchTasks(
  callApi: CallApiFn,
  projectId: string
): Promise<Task[]> {
  const res = await callApi(
    `tasks/project/${encodeURIComponent(projectId)}`,
    { method: "GET" }
  );

  return (res && res.tasks) || [];
}

export async function createTask(
  callApi: CallApiFn,
  data: { projectId: string; title: string; description?: string }
): Promise<Task> {
  const res = await callApi("tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return (res && res.task) || res;
}

export async function updateTask(
  callApi: CallApiFn,
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
  }>
): Promise<Task> {
  const res = await callApi(`tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  return (res && res.task) || res;
}