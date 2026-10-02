import { apiFetch } from './client';

export type AdminMessageDTO = {
  id: string;
  adminId: string | null;
  userId: string;
  subject: string | null;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export async function listAdminMessages(): Promise<AdminMessageDTO[]> {
  const res = await apiFetch('/admin-messages');
  return res?.data ?? [];
}

export async function markAdminMessageRead(id: string): Promise<AdminMessageDTO> {
  const res = await apiFetch(`/admin-messages/${id}/read`, { method: 'PATCH' });
  return res.data;
}
