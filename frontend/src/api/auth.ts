import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, API_URL } from "./client";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  pseudo: string;
  birthDate: string;
  gender: "HOMME" | "FEMME" | "AUTRE";
  city: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Direct fetch for auth endpoints (no Authorization header)
async function authFetch(path: string, payload: unknown): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(body?.error?.message || body?.message || text || `HTTP ${res.status}`);
  }

  return body;
}

function extractTokens(res: unknown): AuthTokens {
  const payload = (res as any)?.data?.data ?? (res as any)?.data ?? res;
  const accessToken = payload?.accessToken;
  const refreshToken = payload?.refreshToken;
  if (!accessToken || !refreshToken) {
    throw new Error("Tokens manquants dans la réponse du serveur");
  }
  return { accessToken, refreshToken };
}

export async function login(payload: LoginPayload): Promise<{ tokens: AuthTokens; rawResponse: any; apiUrl: string }> {
  const loginUrl = `${API_URL}/auth/login`;
  const res = await authFetch("/auth/login", payload);
  const tokens = extractTokens(res);
  return { tokens, rawResponse: res, apiUrl: loginUrl };
}

export async function register(payload: RegisterPayload): Promise<AuthTokens> {
  const res = await authFetch("/auth/register", payload);
  return extractTokens(res);
}

export async function logout(refreshToken: string): Promise<void> {
  await apiFetch("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {
    // Ignore logout errors — session already cleaned locally
  });
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await res.json() as { data?: { accessToken?: string; refreshToken?: string } };
  const accessToken = data?.data?.accessToken;
  const newRefresh = data?.data?.refreshToken;
  if (!accessToken || !newRefresh) throw new Error("Refresh échoué");
  return { accessToken, refreshToken: newRefresh };
}

export async function saveSession(tokens: AuthTokens): Promise<void> {
  await AsyncStorage.multiSet([
    ["auth_token", tokens.accessToken],
    ["auth_refresh_token", tokens.refreshToken],
  ]);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove(["auth_token", "auth_refresh_token"]);
}
