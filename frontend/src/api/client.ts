import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://jeutaime-staging.onrender.com/api";

const ACCESS_TOKEN_KEY  = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

// Cold-start Render Free peut prendre jusqu'à 60s.
// GET requests retried 3x; POST/PATCH/DELETE/PUT tried once only (not idempotent).
const TIMEOUT_MS     = 15_000;  // Réduit de 65s à 15s pour feedback plus rapide
const MAX_RETRIES    = 3;
const RETRY_DELAY_MS = 2_000;

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

/**
 * Erreur HTTP structurée : expose le statut et le code métier renvoyés par le
 * backend ({ error: { code, message } }). Les consommateurs détectent les cas
 * métier via `status`/`code` — jamais en comparant le texte du message.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseResponse(res: Response): Promise<any> {
  const text = await res.text();
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let code: string | null = null;
    try {
      const parsed = text ? JSON.parse(text) : null;
      message = parsed?.error?.message || parsed?.message || (typeof parsed?.error === "string" ? parsed.error : "") || text || message;
      code = typeof parsed?.error?.code === "string" ? parsed.error.code : null;
    } catch {
      message = text || message;
    }
    throw new ApiError(message, res.status, code);
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
        `Délai dépassé (${TIMEOUT_MS / 1000}s) — le serveur ne répond pas. Vérife que l'API est accessible à ${API_URL}`,
      );
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new TypeError(
        `Erreur réseau: impossible de joindre ${API_URL}. Vérife ta connexion et que l'API est en ligne.`,
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
  const method = (options?.method ?? "GET").toUpperCase();
  const fullUrl = `${API_URL}${path}`;

  console.log('[HTTP] START', { method, url: fullUrl, attempt: 1, maxRetries });
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await doFetch(path, options);
      const duration = Date.now() - startTime;

      console.log('[HTTP] RESPONSE', { method, path, status: res.status, duration });

      // 2xx (including 201 Created) — return parsed body immediately
      if (res.status !== 401) {
        const result = await parseResponse(res);
        console.log('[HTTP] SUCCESS', { status: res.status, duration });
        return result;
      }

      // 401 — attempt token refresh then retry once
      const errorBody = await res.text();
      const newToken = await attemptTokenRefresh();
      if (!newToken) {
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
        const err = new Error(`[401] Session expirée. Response: ${errorBody.substring(0, 200)}`);
        throw err;
      }
      const retryRes = await doFetch(path, options, newToken);
      return await parseResponse(retryRes);

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError   = error;
      const duration = Date.now() - startTime;

      console.error('[HTTP] ERROR', {
        method,
        path,
        attempt,
        duration,
        error: error.message,
        url: fullUrl,
        isNetworkError: isNetworkError(err),
      });

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

  const errorMsg = `${method} ${path}\nAPI: ${API_URL}\nÉrreur: ${lastError.message}`;
  console.error("[apiFetch] Final error:", errorMsg);
  throw new Error(errorMsg);
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
