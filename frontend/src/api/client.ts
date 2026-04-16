import { getToken, removeToken } from '../utils/session';

const API_URL = "https://jeutaime2-0.onrender.com/api";

export async function apiFetch(path: string, options?: RequestInit) {
  // Auto-inject auth token from session storage when available
  const token = await getToken();

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  const text = await res.text();

  if (!res.ok) {
    // Clear stale token on 401 so the app redirects to login on next mount
    if (res.status === 401) {
      await removeToken();
    }

    let message = `HTTP ${res.status}`;
    if (text) {
      try {
        const parsed = JSON.parse(text);
        message = parsed?.error?.message || parsed?.message || text;
      } catch {
        message = text;
      }
    }
    throw new Error(message);
  }

  return text ? JSON.parse(text) : null;
}

export async function apiAuthFetch(
  path: string,
  token: string,
  options?: RequestInit
) {
  return apiFetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
}
