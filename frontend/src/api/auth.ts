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

// DEBUG: Decode JWT payload without verification
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return decoded;
  } catch (e) {
    console.error("[decodeJWT] Failed to decode:", e);
    return null;
  }
}

function extractTokens(res: unknown): AuthTokens {
  console.log("[extractTokens] Input:", res);
  const d = (res as { data?: { accessToken?: string; refreshToken?: string } })?.data;
  console.log("[extractTokens] Extracted data:", d);
  const accessToken = d?.accessToken;
  const refreshToken = d?.refreshToken;
  console.log("[extractTokens] Tokens found:", { accessToken: !!accessToken, refreshToken: !!refreshToken });
  if (!accessToken || !refreshToken) {
    console.error("[extractTokens] MISSING TOKENS! Response was:", JSON.stringify(res));
    const errorMsg = `Tokens manquants. Response structure: ${JSON.stringify(Object.keys(res as any))}. Data keys: ${d ? JSON.stringify(Object.keys(d)) : "no data"}`;
    throw new Error(errorMsg);
  }
  return { accessToken, refreshToken };
}

export async function login(payload: LoginPayload): Promise<{ tokens: AuthTokens; rawResponse: any; apiUrl: string }> {
  const loginUrl = `${API_URL}/auth/login`;
  console.log("[auth.login] Calling:", loginUrl);
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log("[auth.login] Raw response:", JSON.stringify(res, null, 2));
  const tokens = extractTokens(res);
  return { tokens, rawResponse: res, apiUrl: loginUrl };
}

export async function register(payload: RegisterPayload): Promise<AuthTokens> {
  const res = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export async function saveSession(tokens: AuthTokens): Promise<{ tokenDebug: any }> {
  console.log("[saveSession] Saving tokens...");

  // DEBUG: Decode and check expiration
  const accessPayload = decodeJWT(tokens.accessToken);
  const refreshPayload = decodeJWT(tokens.refreshToken);
  const now = Math.floor(Date.now() / 1000);

  const tokenDebug = {
    accessTokenLength: tokens.accessToken.length,
    refreshTokenLength: tokens.refreshToken.length,
    accessExp: accessPayload?.exp,
    refreshExp: refreshPayload?.exp,
    currentTimestamp: now,
    accessExpiredNow: (accessPayload?.exp ?? 0) < now,
    refreshExpiredNow: (refreshPayload?.exp ?? 0) < now,
    accessExpiresIn: (accessPayload?.exp ?? 0) - now,
    refreshExpiresIn: (refreshPayload?.exp ?? 0) - now,
  };

  console.log("[saveSession] Token debug:", tokenDebug);

  await AsyncStorage.multiSet([
    ["auth_token", tokens.accessToken],
    ["auth_refresh_token", tokens.refreshToken],
  ]);

  // Verify tokens were actually stored
  const verify = await AsyncStorage.multiGet(["auth_token", "auth_refresh_token"]);
  console.log("[saveSession] Verification - stored tokens:", {
    accessStored: !!verify[0][1],
    refreshStored: !!verify[1][1],
  });

  return { tokenDebug };
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove(["auth_token", "auth_refresh_token"]);
}
