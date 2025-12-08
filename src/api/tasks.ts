export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type TaskType = "TASK" | "BUG" | "FEATURE" | "IMPROVEMENT" | "SPIKE";
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  estimateMinutes?: number | null;
  type?: TaskType | null;

  orderIndex?: number | null;

  createdAt: string;
  updatedAt: string;

  subtasks?: Subtask[];
  title: string;
  description?: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

type CallApiFn = (endpoint: string, options?: RequestInit) => Promise<any>;

// ---------- Tasks ----------

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
  data: {
    projectId: string;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string; // ISO
    estimateMinutes?: number;
    type?: TaskType;
    parentTaskId?: string;
  }
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
    priority: TaskPriority;
    dueDate: string; // ISO
    estimateMinutes: number | null;
    type: TaskType;
    parentTaskId: string | null;
  }>
): Promise<Task> {
  const res = await callApi(`tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  return (res && res.task) || res;
}

export async function deleteTask(
  callApi: CallApiFn,
  id: string
): Promise<void> {
  await callApi(`tasks/${id}`, {
    method: "DELETE",
  });
}

// ---------- Subtasks ----------

export async function createSubtask(
  callApi: CallApiFn,
  taskId: string,
  data: { title: string }
): Promise<Subtask> {
  const res = await callApi(`tasks/${encodeURIComponent(taskId)}/subtasks`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  return (res && res.subtask) || res;
}

export async function updateSubtask(
  callApi: CallApiFn,
  subtaskId: string,
  data: Partial<{
    title: string;
    isCompleted: boolean;
  }>
): Promise<Subtask> {
  const res = await callApi(
    `tasks/subtasks/${encodeURIComponent(subtaskId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );

  return (res && res.subtask) || res;
}

export async function deleteSubtask(
  callApi: CallApiFn,
  subtaskId: string
): Promise<void> {
  await callApi(`tasks/subtasks/${encodeURIComponent(subtaskId)}`, {
    method: "DELETE",
  });
}
}
