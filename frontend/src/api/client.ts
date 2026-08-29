import AsyncStorage from "@react-native-async-storage/async-storage";

function resolveApiUrl(): string {
  // TEST-CORE: on the dedicated Vercel preview, always use the backend
  // deployed on the same origin. This intentionally takes precedence over
  // Vercel EXPO_PUBLIC_API_URL / NEXT_PUBLIC_API_URL values, which may still
  // point at the shared Render staging service.
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (
      hostname.includes("git-test-core") ||
      hostname.includes("jeutaime2-0-") && hostname.endsWith(".vercel.app")
    ) {
      return "/api";
    }
  }

  return (
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://jeutaime-staging.onrender.com/api"
  );
}

export const API_URL = resolveApiUrl();

const ACCESS_TOKEN_KEY  = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

// Cold-start Render Free peut prendre jusqu'à 60s.
// GET requests retried 3x; POST/PATCH/DELETE/PUT tried once only (not idempotent).
const TIMEOUT_MS     = 15_000;
const MAX_RETRIES    = 3;
const RETRY_DELAY_MS = 2_000;

const DEV_HTTP_LOGS = typeof __DEV__ !== 'undefined' && __DEV__;

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
  return method === "GET" || method === "HEAD" ? MAX_RETRIES : 1;
}

async function buildHeaders(token?: string | null): Promise<Record<string, string>> {
  const stored = token ?? (await AsyncStorage.getItem(ACCESS_TOKEN_KEY));
  return {
    "Content-Type": "application/json",
    ...(stored ? { Authorization: `Bearer ${stored}` } : {}),
  };
}

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
      message = parsed?.error?.message || parsed?.message || (typeof parsed?.error === "string" ? parsed.error : "") || message;
      code = typeof parsed?.error?.code === "string" ? parsed.error.code : null;
    } catch {
      // Ne jamais recopier un body brut potentiellement sensible dans l'erreur UI.
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
  const headers = await buildHeaders(token);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const fullUrl = `${API_URL}${path}`;
  const method = (options?.method ?? "GET").toUpperCase();

  if (DEV_HTTP_LOGS) console.log('[HTTP]', method, path);

  try {
    return await fetch(fullUrl, {
      ...options,
      headers: { ...headers, ...(options?.headers ?? {}) },
      signal: controller.signal,
    });
  } catch (err) {
    if (DEV_HTTP_LOGS) {
      console.warn('[HTTP] network error', { method, path, error: err instanceof Error ? err.message : String(err) });
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TypeError(`Délai dépassé (${TIMEOUT_MS / 1000}s) — le serveur ne répond pas.`);
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new TypeError('Erreur réseau : impossible de joindre le serveur. Vérifie ta connexion.');
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
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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

    const data = await res.json() as { data?: { accessToken?: string; refreshToken?: string } };
    const newAccess = data?.data?.accessToken;
    const newRefresh = data?.data?.refreshToken;
    if (!newAccess) return null;

    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccess);
    if (newRefresh) await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
    return newAccess;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const maxRetries = maxRetriesFor(options);
  let lastError: Error = new Error("Erreur inconnue");
  const method = (options?.method ?? "GET").toUpperCase();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await doFetch(path, options);

      if (res.status !== 401) {
        return await parseResponse(res);
      }

      const newToken = await attemptTokenRefresh();
      if (!newToken) {
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
        throw new ApiError('Session expirée. Reconnecte-toi.', 401, 'SESSION_EXPIRED');
      }

      const retryRes = await doFetch(path, options, newToken);
      return await parseResponse(retryRes);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      if (!isNetworkError(err)) throw error;

      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * attempt;
        if (DEV_HTTP_LOGS) console.warn(`[apiFetch] ${path} retry ${attempt}/${maxRetries}`);
        await sleep(delay);
      }
    }
  }

  if (DEV_HTTP_LOGS) console.error('[apiFetch] final error', { method, path, error: lastError.message });
  throw lastError;
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
