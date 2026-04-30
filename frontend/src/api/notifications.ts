import { apiFetch } from './client';

export type NotificationType =
  | 'LETTER_RECEIVED'
  | 'MATCH_CREATED'
  | 'OFFERING_RECEIVED'
  | 'MAGIE_RECEIVED'
  | 'MAGIE_BROKEN'
  | 'PREMIUM_SUBSCRIBED'
  | 'PREMIUM_CANCELLED';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  message: string;
  meta: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsPage {
  items: NotificationDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getNotifications(params?: {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}): Promise<NotificationsPage> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params?.unreadOnly) qs.set('unreadOnly', 'true');
  if (params?.type) qs.set('type', params.type);
  const query = qs.toString() ? `?${qs}` : '';
  const res = await apiFetch(`/notifications${query}`);
  return { items: res.data, ...res.meta };
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiFetch('/notifications/unread-count');
  return res.data.count as number;
}

export async function markNotificationRead(id: string): Promise<NotificationDto> {
  const res = await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
  return res.data as NotificationDto;
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const res = await apiFetch('/notifications/read-all', { method: 'POST' });
  return res.data as { updated: number };
}

export async function registerDevice(token: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
  await apiFetch('/notifications/register-device', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
}
