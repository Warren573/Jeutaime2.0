import { apiFetch } from './client';

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}


export async function changeEmail(payload: {
  currentPassword: string;
  newEmail: string;
}): Promise<ChangeEmailResult> {
  const res = await apiFetch('/auth/change-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = (res?.data ?? {}) as Partial<ChangeEmailResult> & { email?: string };
  // Serveur antérieur à la confirmation par e-mail : la réponse ne contient que l'adresse.
  if (data.status === 'pending_confirmation') {
    return { status: 'pending_confirmation', message: data.message ?? '' };
  }
  return { status: 'changed', email: data.email ?? payload.newEmail, message: data.message ?? '' };
}

export type ChangeEmailResult =
  | { status: 'changed'; email: string; message: string }
  | { status: 'pending_confirmation'; message: string };

// ------------------------------------------------------------------
// Sessions, historique, double authentification
// ------------------------------------------------------------------
export interface SessionDTO {
  id: string;
  device: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface LoginEventDTO {
  id: string;
  success: boolean;
  reason: string | null;
  createdAt: string;
}

export interface SecurityStatusDTO {
  available: boolean;
  enabled: boolean;
  backupCodesRemaining: number;
  emailVerified: boolean;
  emailDelivery: boolean;
}

export async function getSecurityStatus(): Promise<SecurityStatusDTO> {
  return (await apiFetch('/auth/security')).data as SecurityStatusDTO;
}

export async function listSessions(): Promise<SessionDTO[]> {
  return ((await apiFetch('/auth/sessions')).data ?? []) as SessionDTO[];
}

export async function revokeSession(id: string): Promise<void> {
  await apiFetch(`/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function logoutAllDevices(): Promise<void> {
  await apiFetch('/auth/logout-all', { method: 'POST' });
}

export async function getLoginHistory(): Promise<LoginEventDTO[]> {
  return ((await apiFetch('/auth/login-history')).data ?? []) as LoginEventDTO[];
}

export async function resendEmailVerification(): Promise<string> {
  return ((await apiFetch('/auth/email/verify/resend', { method: 'POST' })).data?.status ?? '') as string;
}

export async function startTwoFactorSetup(currentPassword: string): Promise<{ secret: string; otpauthUri: string }> {
  const res = await apiFetch('/auth/2fa/setup', { method: 'POST', body: JSON.stringify({ currentPassword }) });
  return res.data as { secret: string; otpauthUri: string };
}

export async function enableTwoFactor(code: string): Promise<{ backupCodes: string[] }> {
  const res = await apiFetch('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) });
  return res.data as { backupCodes: string[] };
}

export async function disableTwoFactor(currentPassword: string, code: string): Promise<void> {
  await apiFetch('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ currentPassword, code }) });
}
