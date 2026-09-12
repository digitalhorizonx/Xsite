import 'server-only';

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function databaseConfigured() {
  return Boolean(url && serviceKey);
}

export async function dbRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!url || !serviceKey) throw new Error('Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY server-side.');
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...init.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error('Database request failed', response.status, detail.slice(0, 500));
    throw new Error('Database operation failed');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
