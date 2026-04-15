const API_URL = "http://192.168.0.40:3000/api";

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  const text = await res.text();

  if (!res.ok) {
    try {
      const parsed = text ? JSON.parse(text) : null;
      const message =
        parsed?.error?.message ||
        parsed?.message ||
        text ||
        `HTTP ${res.status}`;
      throw new Error(message);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
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