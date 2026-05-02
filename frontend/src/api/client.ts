import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://192.168.0.40:3000/api";

const ACCESS_TOKEN_KEY  = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

// Cold-start Render Free peut prendre jusqu'à 60s.
// On donne 65s par tentative et on retry 3 fois sur erreur réseau.
const TIMEOUT_MS     = 65_000;
const MAX_RETRIES    = 3;
const RETRY_DELAY_MS = 4_000; // 4s, 8s entre les tentatives

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkError(err: unknown): boolean {
  // AbortError = notre timeout de 65s écoulé
  if (err instanceof DOMException && err.name === "AbortError") return true;
  // TypeError = erreur réseau native (Load failed / Failed to fetch / Network request failed)
  if (err instanceof TypeError) return true;
  return false;
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
    try {
      const parsed = text ? JSON.parse(text) : null;
      const message =
        parsed?.error?.message ||
        parsed?.message ||
        text ||
        `HTTP ${res.status}`;
      throw new Error(message);
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(text || `HTTP ${res.status}`);
    }
  }
  return text ? JSON.parse(text) : null;
}

async function doFetch(
  path: string,
  options?: RequestInit,
  token?: string | null,
): Promise<Response> {
  const headers   = await buildHeaders(token);
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...(options?.headers ?? {}) },
      signal: controller.signal,
    });
  } catch (err) {
    // Convertit l'AbortError en message lisible
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

    const data      = await res.json() as { data?: { accessToken?: string; refreshToken?: string } };
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

// ─── apiFetch — avec timeout 65s et retry 3x sur erreur réseau ───────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  let lastError: Error = new Error("Erreur inconnue");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await doFetch(path, options);

      if (res.status !== 401) {
        return parseResponse(res);
      }

      // 401 — tente un refresh puis réessaie une fois
      const newToken = await attemptTokenRefresh();
      if (!newToken) {
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
        throw new Error("Session expirée, veuillez vous reconnecter");
      }
      const retryRes = await doFetch(path, options, newToken);
      return parseResponse(retryRes);

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError   = error;

      // Erreurs 4xx/5xx/auth → on ne retry pas
      if (!isNetworkError(err)) throw error;

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt; // 4s, 8s
        console.warn(
          `[apiFetch] ${path} — tentative ${attempt}/${MAX_RETRIES} (${error.message}), retry dans ${delay / 1000}s`,
        );
        await sleep(delay);
      }
    }
  }

  // Toutes les tentatives épuisées
  throw new Error(
    `Serveur inaccessible après ${MAX_RETRIES} tentatives (${(TIMEOUT_MS * MAX_RETRIES) / 1000}s). ` +
    `Cold start en cours — réessaie dans 30 secondes.`,
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
