import { apiFetch } from './client';

export async function deactivateAccount(currentPassword: string): Promise<void> {
  await apiFetch('/auth/deactivate', {
    method: 'POST',
    body: JSON.stringify({ currentPassword }),
  });
}

export async function deleteAccountPermanently(currentPassword: string): Promise<void> {
  await apiFetch('/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ currentPassword, confirmation: 'SUPPRIMER' }),
  });
}
