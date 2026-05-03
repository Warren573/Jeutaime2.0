import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://192.168.0.40:3000/api";

const ACCESS_TOKEN_KEY  = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

// Cold-start Render Free peut prendre jusqu'à 60s.
// GET requests retried 3x; POST/PATCH/DELETE/PUT tried once only (not idempotent).
const TIMEOUT_MS     = 65_000;
const MAX_RETRIES    = 3;
const RETRY_DELAY_MS = 4_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof TypeError) return true;
  return false;
}

function maxRetriesFor(options?: RequestInit): number {
  const method = (options?.method ?? "GET").toUpperCase();
  // Only retry idempotent read-only methods — never retry writes to avoid duplicates
  return method === "GET" || method === "HEAD" ? MAX_RETRIES : 1;
}

async function buildHeaders(token?: string | null): Promise<Record<string, string>> {
  const stored = token ?? (await AsyncStorage.getItem(ACCESS_TOKEN_KEY));
  return {
    "Content-Type": "application/json",
    ...(stored ? { Authorization: `Bearer ${stored}` } : {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseResponse(res: Response): Promise<any> {
  const text = await res.text();
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const parsed = text ? JSON.parse(text) : null;
      message = parsed?.error?.message || parsed?.message || text || message;
    } catch {
      message = text || message;
    }
    throw new Error(message);
  }
  return text ? JSON.parse(text) : null;
}

async function doFetch(
  path: string,
  options?: RequestInit,
  token?: string | null,
): Promise<Response> {
  const headers    = await buildHeaders(token);
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...(options?.headers ?? {}) },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TypeError(
        `Délai dépassé (${TIMEOUT_MS / 1000}s) — le serveur démarre, réessaie dans quelques secondes`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) return null;

    const data       = await res.json() as { data?: { accessToken?: string; refreshToken?: string } };
    const newAccess  = data?.data?.accessToken;
    const newRefresh = data?.data?.refreshToken;
    if (!newAccess) return null;

    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccess);
    if (newRefresh) await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
    return newAccess;
  } catch {
    return null;
  }
}

// ─── apiFetch ─────────────────────────────────────────────────────────────────
// - GET/HEAD: up to 3 retries on network error (cold-start recovery)
// - POST/PATCH/PUT/DELETE: single attempt — no retry (not idempotent)
// - Any 2xx response (including 201) is treated as success
// - On 401: attempt one token refresh then retry once
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const maxRetries = maxRetriesFor(options);
  let lastError: Error = new Error("Erreur inconnue");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await doFetch(path, options);

      // 2xx (including 201 Created) — return parsed body immediately
      if (res.status !== 401) {
        return await parseResponse(res);
      }

      // 401 — attempt token refresh then retry once
      const newToken = await attemptTokenRefresh();
      if (!newToken) {
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
        throw new Error("Session expirée, veuillez vous reconnecter");
      }
      const retryRes = await doFetch(path, options, newToken);
      return await parseResponse(retryRes);

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError   = error;

      // HTTP errors (4xx/5xx) and auth errors — fail immediately, no retry
      if (!isNetworkError(err)) throw error;

      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(
          `[apiFetch] ${path} — tentative ${attempt}/${maxRetries} (${error.message}), retry dans ${delay / 1000}s`,
        );
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Réseau inaccessible — ${lastError.message}\nAPI: ${API_URL}`,
  );
}

export async function apiAuthFetch(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<unknown> {
  return apiFetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
}
