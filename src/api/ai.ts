const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function generateProjectPlan(prompt: string, callApi: (endpoint: string, options?: RequestInit) => Promise<any>) {
  return callApi('ai/generate-plan', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
export async function generateProjectPlan(prompt: string, token: string) {
  const res = await fetch(`${API_URL}/ai/generate-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`, // ◄ Auth0 Token
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) throw new Error('Failed to generate plan');
  return res.json();
}