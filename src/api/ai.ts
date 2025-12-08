const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function generateProjectPlan(prompt: string, callApi: (endpoint: string, options?: RequestInit) => Promise<any>) {
  return callApi('ai/generate-plan', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}