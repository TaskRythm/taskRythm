// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// export async function generateProjectPlan(
//   prompt: string,
//   callApi: (endpoint: string, options?: RequestInit) => Promise<any>
// ) {
//   return callApi('ai/generate-plan', {
//     method: 'POST',
//     body: JSON.stringify({ prompt }),
//   });
// }


// Define the structure of a Task to ensure type safety
export interface Task {
  id?: string;
  title: string;
  status: string;
  priority: string;
  description?: string;
  tags?: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Helper function to handle Auth headers automatically
async function fetchWithAuth(endpoint: string, token: string, method: string = 'GET', body?: any) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.statusText}`);
  }

  return response.json();
}

// 1. THE ARCHITECT: Generate Plan
export async function generateProjectPlan(prompt: string, token: string) {
  return fetchWithAuth('/ai/generate-plan', token, 'POST', { prompt });
}

// 2. THE MANAGER: Refine Task
export async function refineTask(taskTitle: string, token: string) {
  return fetchWithAuth('/ai/refine-task', token, 'POST', { taskTitle });
}

// 3. THE DOCTOR: Analyze Project Health
export async function analyzeProjectHealth(tasks: Task[], token: string) {
  return fetchWithAuth('/ai/analyze-project', token, 'POST', { tasks });
}

// 4. THE SCRIBE: Write Release Notes
export async function writeReleaseNotes(tasks: Task[], token: string) {
  return fetchWithAuth('/ai/write-report', token, 'POST', { tasks });
}

// 5. THE BRAIN: Chat with Project
export async function chatWithProject(question: string, tasks: Task[], token: string) {
  return fetchWithAuth('/ai/chat', token, 'POST', { question, tasks });
}