import { apiFetch } from './client';

export type AdminUser = {
  id: string;
  email: string;
  pseudo?: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isBanned: boolean;
  banReason: string | null;
};

export type AdminReport = {
  id: string;
  reporter: { id: string; email: string; role: string; isBanned: boolean };
  target: { id: string; email: string; role: string; isBanned: boolean };
  reason: string;
  details: string | null;
  status: 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED';
  resolution: string | null;
  createdAt: string;
};

export type AdminSalon = {
  id: string;
  kind: string;
  name: string;
  isActive: boolean;
  order: number;
};

export type AuditEntry = {
  id: string;
  actorId: string | null;
  action: string;
  target: string | null;
  meta: unknown;
  createdAt: string;
};

export async function listAdminUsers(q = ''): Promise<AdminUser[]> {
  const suffix = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  const res = await apiFetch(`/admin/users${suffix}`);
  return res?.data ?? [];
}

export async function banAdminUser(id: string, reason: string): Promise<AdminUser> {
  const res = await apiFetch(`/admin/users/${id}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}

export async function unbanAdminUser(id: string): Promise<AdminUser> {
  const res = await apiFetch(`/admin/users/${id}/unban`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return res.data;
}

export async function listAdminReports(status?: string): Promise<{ items: AdminReport[]; total: number }> {
  const suffix = status ? `?status=${encodeURIComponent(status)}&page=1&pageSize=50` : '?page=1&pageSize=50';
  const res = await apiFetch(`/admin/reports${suffix}`);
  return { items: res?.data ?? [], total: res?.meta?.total ?? 0 };
}

export async function updateAdminReport(
  id: string,
  status: AdminReport['status'],
  resolution?: string,
): Promise<AdminReport> {
  const res = await apiFetch(`/admin/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(resolution ? { resolution } : {}) }),
  });
  return res.data;
}

export async function listAdminSalons(): Promise<AdminSalon[]> {
  const res = await apiFetch('/admin/salons');
  return res?.data ?? [];
}

export async function setAdminSalonActive(id: string, isActive: boolean): Promise<AdminSalon> {
  const res = await apiFetch(`/admin/salons/${id}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  return res.data;
}

export async function listAuditLog(): Promise<AuditEntry[]> {
  const res = await apiFetch('/admin/audit-log?page=1&pageSize=50');
  return res?.data ?? [];
}
