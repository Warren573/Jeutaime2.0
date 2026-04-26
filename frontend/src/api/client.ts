import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://192.168.0.40:3000/api";

const ACCESS_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

async function buildHeaders(token?: string | null): Promise<Record<string, string>> {
  const stored = token ?? (await AsyncStorage.getItem(ACCESS_TOKEN_KEY));
  return {
    "Content-Type": "application/json",
    ...(stored ? { Authorization: `Bearer ${stored}` } : {}),
  };
}

// Returns any to preserve backward compatibility with existing call sites
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
      const err = new Error(message);
      throw err;
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
  const headers = await buildHeaders(token);
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers || {}),
    },
  });
}

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
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

/**
 * Fetch authentifié avec retry automatique sur 401.
 * Sur 401 : tente un refresh puis réessaie la requête une seule fois.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await doFetch(path, options);

  if (res.status !== 401) {
    return parseResponse(res);
  }

  const newAccessToken = await attemptTokenRefresh();

  if (!newAccessToken) {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
    throw new Error("Session expirée, veuillez vous reconnecter");
  }

  const retryRes = await doFetch(path, options, newAccessToken);
  return parseResponse(retryRes);
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
      ...(options?.headers || {}),
    },
  });
}
