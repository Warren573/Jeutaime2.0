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
  postalCode?: string;
  acceptedTerms: true;
  acceptedCommunityRules: true;
}

export interface LoginPayload {
  email: string;
  password: string;
  /** Code de l'application d'authentification ou code de secours (comptes avec double authentification). */
  totpCode?: string;
}

/** Erreur d'un appel d'authentification, avec le code renvoyé par le serveur. */
export class AuthRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "AuthRequestError";
  }
}


// Direct fetch for auth endpoints (no Authorization header)
async function authFetch(path: string, payload: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Le serveur ne répond pas (20 secondes). Réessaie dans un instant.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new AuthRequestError(
      body?.error?.message || body?.message || text || `HTTP ${res.status}`,
      res.status,
      body?.error?.code,
    );
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

// ------------------------------------------------------------------
// Parcours publics par lien reçu par e-mail
// ------------------------------------------------------------------
function messageOf(res: unknown, fallback: string): string {
  return ((res as any)?.data?.message as string) || fallback;
}

export async function requestPasswordReset(email: string): Promise<string> {
  const res = await authFetch("/auth/password/forgot", { email });
  return messageOf(res, "Si un compte existe pour cette adresse, un e-mail vient de lui être envoyé.");
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
  const res = await authFetch("/auth/password/reset", { token, newPassword });
  return messageOf(res, "Mot de passe modifié. Tu peux te connecter.");
}

export async function verifyEmail(token: string): Promise<string> {
  const res = await authFetch("/auth/email/verify", { token });
  return messageOf(res, "Adresse e-mail confirmée.");
}

export async function confirmEmailChange(token: string): Promise<string> {
  const res = await authFetch("/auth/email/change/confirm", { token });
  return messageOf(res, "Nouvelle adresse confirmée.");
}

/** Le serveur peut-il réellement envoyer des e-mails ? Par défaut non : aucune promesse d'e-mail sans certitude. */
export async function getEmailDeliveryAvailable(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${API_URL}/auth/capabilities`, { signal: controller.signal });
    if (!res.ok) return false;
    const body = await res.json();
    return body?.data?.emailDelivery === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
