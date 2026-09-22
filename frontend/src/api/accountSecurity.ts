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
}): Promise<{ email: string }> {
  const res = await apiFetch('/auth/change-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data as { email: string };
}
