import { apiFetch } from './client';

export type AdminOverview = {
  users: {
    total: number;
    registrationsToday: number;
    registrations7d: number;
    registrations30d: number;
    activeToday: number;
    active7d: number;
    active30d: number;
    premiumActive: number;
    banned: number;
  };
  moderation: {
    openReports: number;
    totalReports: number;
  };
  activity: {
    matchesToday: number;
    lettersToday: number;
    bottlesActive: number;
    refugesActive: number;
  };
  salons: {
    active: number;
    total: number;
    activeSessions: number;
  };
};

export type AdminUser = {
  id: string;
  email: string;
  pseudo?: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isBanned: boolean;
  banReason: string | null;
};

export type AdminUserDetail = {
  id: string;
  email: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isVerified: boolean;
  isBanned: boolean;
  banReason: string | null;
  premiumTier: 'FREE' | 'PREMIUM';
  premiumUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile: {
    pseudo: string;
    city: string;
    gender: string;
    birthDate: string;
  } | null;
  settings: {
    showInDiscovery: boolean;
    vacationMode: boolean;
    notifPush: boolean;
    notifEmail: boolean;
  } | null;
  wallet: {
    coins: number;
    updatedAt: string;
  } | null;
  stats: {
    matches: number;
    lettersSent: number;
    lettersReceived: number;
    reportsReceived: number;
    reportsMade: number;
    salonParticipations: number;
    offeringsSent: number;
    offeringsReceived: number;
    bottlesSent: number;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    balance: number;
    meta: unknown;
    createdAt: string;
  }>;
  adminHistory: AuditEntry[];
};

export type AdminReport = {
  id: string;
  reporter: { id: string; email: string; role: string; isBanned: boolean };
  target: { id: string; email: string; role: string; isBanned: boolean };
  reason: string;
  details: string | null;
  status: 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED';
  resolution: string | null;
  contentType?: string | null;
  contentId?: string | null;
  contentSnapshot?: unknown;
  createdAt: string;
};

export type AdminSalon = {
  id: string;
  kind: string;
  name: string;
  isActive: boolean;
  order: number;
};

export type AdminSalonSession = {
  salon: {
    id: string;
    kind: string;
    name: string;
  };
  session: null | {
    id: string;
    startedAt: string;
    expiresAt: string;
    status: string;
    isPrivate: boolean;
    participants: Array<{
      id: string;
      userId: string;
      pseudo: string | null;
      email: string;
      lastLoginAt: string | null;
      status: string;
      joinedAt: string;
      leftAt: string | null;
    }>;
  };
};

export type AuditEntry = {
  id: string;
  actorId: string | null;
  action: string;
  target: string | null;
  meta: unknown;
  createdAt: string;
};

export type HealthVersion = {
  service?: string;
  buildSha?: string;
  buildTime?: string;
  environment?: string;
  error?: string;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const res = await apiFetch('/admin/overview');
  return res.data;
}

export async function listAdminUsers(q = ''): Promise<AdminUser[]> {
  const suffix = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  const res = await apiFetch(`/admin/users${suffix}`);
  return res?.data ?? [];
}

export async function getAdminUser(id: string): Promise<AdminUserDetail> {
  const res = await apiFetch(`/admin/users/${id}`);
  return res.data;
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

export async function warnAdminUser(id: string, message: string): Promise<AdminUser> {
  const res = await apiFetch(`/admin/users/${id}/warn`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return res.data;
}

export async function adjustAdminUserCoins(id: string, amount: number, reason: string) {
  const res = await apiFetch(`/admin/users/${id}/coins`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  });
  return res.data;
}

export async function updateAdminUserRole(id: string, role: 'USER' | 'MODERATOR'): Promise<AdminUser> {
  const res = await apiFetch(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
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

export async function getAdminSalonSession(id: string): Promise<AdminSalonSession> {
  const res = await apiFetch(`/admin/salons/${id}/session`);
  return res.data;
}

export async function removeAdminSalonParticipant(salonId: string, participantId: string) {
  const res = await apiFetch(`/admin/salons/${salonId}/session/${participantId}/remove`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return res.data;
}

export async function setAdminSalonActive(id: string, isActive: boolean): Promise<AdminSalon> {
  const res = await apiFetch(`/admin/salons/${id}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  return res.data;
}

export async function listAuditLog(): Promise<AuditEntry[]> {
  const res = await apiFetch('/admin/audit-log?page=1&pageSize=100');
  return res?.data ?? [];
}

export async function getHealthVersion(): Promise<HealthVersion> {
  const res = await apiFetch('/health/version');
  return res ?? {};
}


export type ModerationOverview = {
  photos: { active: number; hidden: number; removed: number };
  salonMessages: { visible: number; hidden: number };
  openReports: number;
};

export type ModerationPhoto = {
  id: string;
  userId: string;
  pseudo: string | null;
  email: string;
  createdAt: string;
  isPrimary: boolean;
  moderationStatus: 'ACTIVE' | 'HIDDEN' | 'REMOVED';
  moderationReason: string | null;
  moderatedAt: string | null;
  moderatedBy: string | null;
  adminPreviewUrl: string;
};

export type ModerationProfile = {
  id: string;
  email: string;
  pseudo: string | null;
  bio: string | null;
  profileUpdatedAt: string | null;
  showInDiscovery: boolean;
  photos: Array<{
    id: string;
    moderationStatus: string;
    moderationReason: string | null;
    createdAt: string;
    adminPreviewUrl: string;
  }>;
};

export type ModerationSalonMessage = {
  id: string;
  salonId: string;
  salonName: string;
  userId: string;
  pseudo: string | null;
  email: string;
  content: string;
  kind: string;
  isHidden: boolean;
  hiddenReason: string | null;
  hiddenAt: string | null;
  hiddenBy: string | null;
  createdAt: string;
};

export async function getModerationOverview(): Promise<ModerationOverview> {
  const res = await apiFetch('/admin/moderation/overview');
  return res.data;
}

export async function listModerationPhotos(status?: 'ACTIVE' | 'HIDDEN' | 'REMOVED'): Promise<ModerationPhoto[]> {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiFetch(`/admin/moderation/photos${suffix}`);
  return res?.data ?? [];
}

export async function moderatePhoto(
  id: string,
  status: 'ACTIVE' | 'HIDDEN' | 'REMOVED',
  reason: string,
): Promise<void> {
  await apiFetch(`/admin/moderation/photos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
}

export async function getModerationProfile(id: string): Promise<ModerationProfile> {
  const res = await apiFetch(`/admin/moderation/profiles/${id}`);
  return res.data;
}

export async function moderateProfile(
  id: string,
  action: 'HIDE_FROM_DISCOVERY' | 'RESTORE_DISCOVERY' | 'CLEAR_BIO',
  reason: string,
): Promise<ModerationProfile> {
  const res = await apiFetch(`/admin/moderation/profiles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, reason }),
  });
  return res.data;
}

export async function listModerationSalonMessages(hidden?: boolean): Promise<ModerationSalonMessage[]> {
  const suffix = hidden === undefined ? '' : `?hidden=${hidden ? 'true' : 'false'}`;
  const res = await apiFetch(`/admin/moderation/salon-messages${suffix}`);
  return res?.data ?? [];
}

export async function moderateSalonMessage(
  id: string,
  hidden: boolean,
  reason: string,
): Promise<void> {
  await apiFetch(`/admin/moderation/salon-messages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ hidden, reason }),
  });
}
