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
  analytics: {
    registrations: {
      averagePerDay7d: number;
      averagePerDay30d: number;
      previous7d: number;
      weeklyChangePct: number | null;
    };
    demographics: {
      averageAge: number | null;
      averageAgeMen: number | null;
      averageAgeWomen: number | null;
      men: number;
      women: number;
      other: number;
      menPct: number;
      womenPct: number;
      otherPct: number;
      active7dMen: number;
      active7dWomen: number;
      premiumMen: number;
      premiumWomen: number;
      ageBands: {
        age18to24: number;
        age25to34: number;
        age35to44: number;
        age45to54: number;
        age55plus: number;
      };
    };
    funnel: {
      registered: number;
      profileCreated: number;
      sentSmile: number;
      matched: number;
      sentLetter: number;
      reachedTenLetters: number;
      premiumActive: number;
      profileRatePct: number;
      smileRatePct: number;
      matchRatePct: number;
      letterRatePct: number;
      tenLettersRatePct: number;
      premiumRatePct: number;
    };
    features7d: {
      salonJoins: number;
      refugesStarted: number;
      bottlesSent: number;
      cardGamesStarted: number;
      duelsCreated: number;
    };
    retention: {
      day1: { eligible: number; retained: number; ratePct: number };
      day7: { eligible: number; retained: number; ratePct: number };
      day30: { eligible: number; retained: number; ratePct: number };
    };
  };
};

export type AdminUser = {
  id: string;
  email: string;
  pseudo?: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN' | 'OWNER';
  isBanned: boolean;
  banReason: string | null;
  banUntil: string | null;
};

export type AdminUserDetail = {
  id: string;
  email: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN' | 'OWNER';
  isVerified: boolean;
  isBanned: boolean;
  banReason: string | null;
  banUntil: string | null;
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

export async function banAdminUser(id: string, reason: string, durationDays?: number): Promise<AdminUser> {
  const res = await apiFetch(`/admin/users/${id}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason, ...(durationDays ? { durationDays } : {}) }),
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

export async function updateAdminUserRole(id: string, role: 'USER' | 'MODERATOR' | 'ADMIN'): Promise<AdminUser> {
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


export type OperationsOverview = {
  logins: {
    failedToday: number;
    failedLastHour: number;
    successfulToday: number;
  };
  incidents: {
    unresolved: number;
    today: number;
  };
  support: {
    open: number;
    bugsOpen: number;
  };
};

export type LoginEvent = {
  id: string;
  email: string;
  userId: string | null;
  success: boolean;
  reason: string | null;
  createdAt: string;
};

export type SystemIncident = {
  id: string;
  level: string;
  source: string;
  method: string | null;
  path: string | null;
  code: string | null;
  message: string;
  userId: string | null;
  statusCode: number | null;
  resolved: boolean;
  resolution: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
};

export type AdminSupportTicket = {
  id: string;
  userId: string;
  email: string;
  pseudo: string | null;
  kind: 'BUG' | 'SUPPORT';
  subject: string;
  message: string;
  status: 'OPEN' | 'REVIEWING' | 'CLOSED';
  adminReply: string | null;
  repliedAt: string | null;
  repliedBy: string | null;
  createdAt: string;
};

export type EconomyOverview = {
  wallets: {
    count: number;
    totalCoins: number;
    averageCoins: number;
    maxCoins: number;
  };
  today: {
    transactions: number;
    earnedCoins: number;
    spentCoins: number;
    coinPurchases: number;
    premiumPurchases: number;
    refunds: number;
    offeringsSent: number;
    magiesCast: number;
  };
  transactions7d: number;
  premiumActive: number;
  catalog: {
    offeringsEnabled: number;
    offeringsTotal: number;
    magiesEnabled: number;
    magiesTotal: number;
  };
};

export type EconomyTransaction = {
  id: string;
  userId: string;
  email: string;
  pseudo: string | null;
  type: string;
  amount: number;
  balance: number;
  meta: unknown;
  createdAt: string;
};

export type EconomyCatalog = {
  offerings: Array<{
    id: string;
    emoji: string;
    name: string;
    cost: number;
    category: string;
    durationMs: number | null;
    salonOnly: string | null;
    enabled: boolean;
    consumptionMode: string;
    sentCount: number;
  }>;
  magies: Array<{
    id: string;
    emoji: string;
    name: string;
    cost: number;
    durationSec: number;
    type: string;
    enabled: boolean;
    castCount: number;
  }>;
};

export type PremiumAdminUser = {
  id: string;
  email: string;
  pseudo: string | null;
  premiumUntil: string | null;
  active: boolean;
  coins: number;
  createdAt: string;
};

export async function getOperationsOverview(): Promise<OperationsOverview> {
  const res = await apiFetch('/admin/operations/overview');
  return res.data;
}

export async function listLoginEvents(success?: boolean): Promise<{ items: LoginEvent[]; total: number }> {
  const suffix = success === undefined ? '?page=1&pageSize=100' : `?success=${success ? 'true' : 'false'}&page=1&pageSize=100`;
  const res = await apiFetch(`/admin/operations/logins${suffix}`);
  return res.data;
}

export async function listSystemIncidents(resolved?: boolean): Promise<{ items: SystemIncident[]; total: number }> {
  const suffix = resolved === undefined ? '?page=1&pageSize=100' : `?resolved=${resolved ? 'true' : 'false'}&page=1&pageSize=100`;
  const res = await apiFetch(`/admin/operations/incidents${suffix}`);
  return res.data;
}

export async function updateSystemIncident(
  id: string,
  resolved: boolean,
  resolution?: string,
): Promise<SystemIncident> {
  const res = await apiFetch(`/admin/operations/incidents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ resolved, ...(resolution ? { resolution } : {}) }),
  });
  return res.data;
}

export async function listAdminSupportTickets(): Promise<AdminSupportTicket[]> {
  const res = await apiFetch('/admin/support');
  return res?.data ?? [];
}

export async function updateAdminSupportTicket(
  id: string,
  status: 'OPEN' | 'REVIEWING' | 'CLOSED',
  reply?: string,
): Promise<AdminSupportTicket> {
  const res = await apiFetch(`/admin/support/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(reply?.trim() ? { reply: reply.trim() } : {}) }),
  });
  return res.data;
}

export async function getEconomyOverview(): Promise<EconomyOverview> {
  const res = await apiFetch('/admin/economy/overview');
  return res.data;
}

export async function listEconomyTransactions(): Promise<{ items: EconomyTransaction[]; total: number }> {
  const res = await apiFetch('/admin/economy/transactions?page=1&pageSize=100');
  return res.data;
}

export async function getEconomyCatalog(): Promise<EconomyCatalog> {
  const res = await apiFetch('/admin/economy/catalog');
  return res.data;
}

export async function listPremiumAdminUsers(): Promise<PremiumAdminUser[]> {
  const res = await apiFetch('/admin/economy/premium-users');
  return res?.data ?? [];
}

export async function updateOfferingCatalogItem(
  id: string,
  patch: { enabled?: boolean; cost?: number },
): Promise<void> {
  await apiFetch(`/admin/economy/offerings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function updateMagieCatalogItem(
  id: string,
  patch: { enabled?: boolean; cost?: number },
): Promise<void> {
  await apiFetch(`/admin/economy/magies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}


export type AdminDirectMessage = {
  id: string;
  adminId: string | null;
  userId: string;
  subject: string | null;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type AdminPrivateSalon = {
  id: string;
  salonKind: string;
  privateName: string | null;
  startedAt: string;
  expiresAt: string;
  status: string;
  ownerId: string | null;
  invitedCount: number;
  acceptedCount: number;
  invitations: Array<{
    userId: string;
    accepted: boolean;
    createdAt: string;
  }>;
  participants: Array<{
    userId: string;
    pseudo: string | null;
    email: string;
    joinedAt: string;
  }>;
};

export async function sendAdminDirectMessage(
  userId: string,
  message: string,
  subject?: string,
): Promise<AdminDirectMessage> {
  const res = await apiFetch(`/admin/engagement/users/${userId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, ...(subject?.trim() ? { subject: subject.trim() } : {}) }),
  });
  return res.data;
}

export async function listAdminDirectMessages(userId: string): Promise<AdminDirectMessage[]> {
  const res = await apiFetch(`/admin/engagement/users/${userId}/messages`);
  return res?.data ?? [];
}

export async function createAdminPrivateSalon(input: {
  name: string;
  salonKind?: 'PISCINE' | 'CAFE_DE_PARIS' | 'ILE_PIRATES' | 'THEATRE' | 'BAR_COCKTAILS' | 'METAL' | 'PSY';
  durationDays?: number;
}): Promise<AdminPrivateSalon> {
  const res = await apiFetch('/admin/engagement/private-salons', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      salonKind: input.salonKind ?? 'CAFE_DE_PARIS',
      durationDays: input.durationDays ?? 7,
    }),
  });
  return res.data;
}

export async function listAdminPrivateSalons(): Promise<AdminPrivateSalon[]> {
  const res = await apiFetch('/admin/engagement/private-salons');
  return res?.data ?? [];
}

export async function inviteUserToPrivateSalon(sessionId: string, userId: string): Promise<void> {
  await apiFetch(`/admin/engagement/private-salons/${sessionId}/invite/${userId}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function removeUserFromPrivateSalon(sessionId: string, userId: string): Promise<void> {
  await apiFetch(`/admin/engagement/private-salons/${sessionId}/invite/${userId}`, {
    method: 'DELETE',
  });
}


export async function grantAdminPremium(
  id: string,
  days: number,
  reason: string,
): Promise<{ id: string; premiumTier: string; premiumUntil: string }> {
  const res = await apiFetch(`/admin/users/${id}/premium`, {
    method: 'POST',
    body: JSON.stringify({ days, reason }),
  });
  return res.data;
}

export async function resetAdminUserSalons(id: string, reason: string): Promise<{ resetCount: number }> {
  const res = await apiFetch(`/admin/users/${id}/reset-salons`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}

export async function resetAdminUserRefuge(id: string, reason: string): Promise<{ resetCount: number }> {
  const res = await apiFetch(`/admin/users/${id}/reset-refuge`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}

export async function resetAdminUserBottles(id: string, reason: string): Promise<{ resetCount: number }> {
  const res = await apiFetch(`/admin/users/${id}/reset-bottles`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}

export async function repairAdminUserLetters(id: string, reason: string): Promise<{ resetCount: number }> {
  const res = await apiFetch(`/admin/users/${id}/repair-letters`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}



export type CommunityJournalAdminPost = {
  id: string;
  title: string;
  body: string;
  createdBy: string | null;
  publishedAt: string;
  createdAt: string;
};

export async function listCommunityJournalPosts(): Promise<CommunityJournalAdminPost[]> {
  const res = await apiFetch('/admin/journal');
  return res?.data ?? [];
}

export async function publishCommunityJournalPost(
  title: string,
  body: string,
): Promise<CommunityJournalAdminPost> {
  const res = await apiFetch('/admin/journal', {
    method: 'POST',
    body: JSON.stringify({ title, body }),
  });
  return res.data;
}


export async function updateCommunityJournalPost(
  id: string,
  title: string,
  body: string,
): Promise<CommunityJournalAdminPost> {
  const res = await apiFetch(`/admin/journal/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title, body }),
  });
  return res.data;
}

export async function deleteCommunityJournalPost(id: string): Promise<void> {
  await apiFetch(`/admin/journal/${id}`, {
    method: 'DELETE',
  });
}
