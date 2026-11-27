import { apiFetch } from './client';

export type NotificationType =
  | 'LETTER_RECEIVED'
  | 'MATCH_CREATED'
  | 'QUESTIONS_PASSED'
  | 'QUESTIONS_FAILED'
  | 'OFFERING_RECEIVED'
  | 'MAGIE_RECEIVED'
  | 'MAGIE_BROKEN'
  | 'PREMIUM_SUBSCRIBED'
  | 'PREMIUM_CANCELLED'
  | 'ADMIN_MESSAGE'
  | 'PRIVATE_SALON_INVITE'
  | 'SECURITY_ALERT'
  // Phase 2 : événements des fonctionnalités existantes
  | 'DUEL_RECEIVED'
  | 'DUEL_RESULT'
  | 'DUEL_DECLINED'
  | 'DUEL_EXPIRED'
  | 'BOTTLE_REPLY'
  | 'BOTTLE_REVEAL_REQUEST'
  | 'BOTTLE_REVEAL_ACCEPTED'
  | 'BOTTLE_REVEAL_REFUSED'
  | 'QUESTIONS_TURN'
  | 'REFUGE_ADOPTED'
  | 'REFUGE_REVEAL_PHASE'
  | 'REFUGE_REVEALED'
  | 'REFUGE_CHOICE_READY'
  | 'REFUGE_RESULT_READY'
  | 'REFUGE_DAY_RESULT'
  | 'REFUGE_NEW_DAY'
  | 'REFUGE_COINS'
  | 'REFUGE_REVEAL_REFUSED'
  | 'REFUGE_EXPIRED'
  | 'REFUGE_ATTENTION'
  | 'REPORT_PROCESSED'
  | 'ACCOUNT_RESTORED';

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

export async function unregisterDevice(token: string): Promise<void> {
  await apiFetch('/notifications/unregister-device', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

// ── Diagnostic des notifications push ───────────────────────────────────────
export interface PushStatusDto {
  settings: { notifPush: boolean; notifActivities: boolean; notifMeetings: boolean; notifLetters: boolean };
  devices: Array<{ platform: string; kind: string; suffix: string; valid: boolean; updatedAt: string }>;
}
export interface PushTestDto {
  state: 'none' | 'pending' | 'sent';
  result: { sentAt: string; devices: number; skipped: string | null; tickets: Array<{ status: string; ticketId: string | null }> } | null;
  receipts: string[];
}

export async function getPushStatus(): Promise<PushStatusDto> {
  const res = await apiFetch('/notifications/push-status');
  return res.data as PushStatusDto;
}

/** Demande UNE notification de test visible, envoyée par le serveur après `delaySeconds` (laisse le temps de fermer l'application). */
export async function requestPushTest(delaySeconds = 10): Promise<{ scheduledFor: string }> {
  const res = await apiFetch('/notifications/push-test', { method: 'POST', body: JSON.stringify({ delaySeconds }) });
  return res.data as { scheduledFor: string };
}

export async function getPushTestResult(): Promise<PushTestDto> {
  const res = await apiFetch('/notifications/push-test');
  return res.data as PushTestDto;
}
