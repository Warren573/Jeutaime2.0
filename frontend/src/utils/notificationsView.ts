/**
 * Présentation de « Mes notifications » — logique PURE (sans React Native), testée à part.
 *
 * Réutilise les types et les données du système de notifications existant
 * (api/notifications.ts, store) : aucune donnée ni règle nouvelle.
 */
import type { NotificationType } from '../api/notifications';

// ============================================================
// Badge de la cloche
// ============================================================
/** Texte du badge : rien si aucune non lue, « 99+ » au-delà de 99. */
export function badgeLabel(count: unknown): string | null {
  const n = typeof count === 'number' && Number.isFinite(count) ? Math.trunc(count) : 0;
  if (n <= 0) return null;
  return n > 99 ? '99+' : String(n);
}

/** Phrase de l'en-tête : « 16 non lues », « 1 non lue », « Tout est lu ». */
export function unreadSummary(count: unknown): string {
  const n = typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  if (n === 0) return 'Tout est lu';
  return n === 1 ? '1 non lue' : `${n} non lues`;
}

// ============================================================
// Catégorie et icône de chaque type
// ============================================================
export type NotificationIconName =
  | 'letter'
  | 'heart'
  | 'lock'
  | 'gift'
  | 'sparkle'
  | 'megaphone'
  | 'shield'
  | 'crown'
  | 'bell';

export interface NotificationCategory {
  /** Libellé discret affiché au-dessus du message. */
  label: string;
  icon: NotificationIconName;
}

export const NOTIFICATION_CATEGORIES: Record<NotificationType, NotificationCategory> = {
  LETTER_RECEIVED: { label: 'Lettres', icon: 'letter' },
  MATCH_CREATED: { label: 'Rencontres', icon: 'heart' },
  QUESTIONS_PASSED: { label: 'Rencontres', icon: 'heart' },
  QUESTIONS_FAILED: { label: 'Rencontres', icon: 'heart' },
  OFFERING_RECEIVED: { label: 'Offrandes', icon: 'gift' },
  MAGIE_RECEIVED: { label: 'Salons', icon: 'sparkle' },
  MAGIE_BROKEN: { label: 'Salons', icon: 'sparkle' },
  PRIVATE_SALON_INVITE: { label: 'Salons', icon: 'lock' },
  PREMIUM_SUBSCRIBED: { label: 'Abonnement', icon: 'crown' },
  PREMIUM_CANCELLED: { label: 'Abonnement', icon: 'crown' },
  ADMIN_MESSAGE: { label: 'Administration', icon: 'megaphone' },
  SECURITY_ALERT: { label: 'Sécurité', icon: 'shield' },
};

const UNKNOWN_CATEGORY: NotificationCategory = { label: 'Notification', icon: 'bell' };

/** Catégorie d'un type, y compris un type inconnu (ancien serveur, type futur) : jamais d'erreur. */
export function categoryFor(type: unknown): NotificationCategory {
  return typeof type === 'string' && Object.prototype.hasOwnProperty.call(NOTIFICATION_CATEGORIES, type)
    ? NOTIFICATION_CATEGORIES[type as NotificationType]
    : UNKNOWN_CATEGORY;
}

// ============================================================
// Dates : regroupement par jour et heure affichée
// ============================================================
export type DayGroupKey = 'today' | 'yesterday' | 'week' | 'older';

export const DAY_GROUP_LABELS: Record<DayGroupKey, string> = {
  today: "AUJOURD'HUI",
  yesterday: 'HIER',
  week: 'CETTE SEMAINE',
  older: 'PLUS ANCIEN',
};

/** Numéro de jour calendaire (dans le fuseau demandé, sinon celui de l'appareil). */
function dayNumber(date: Date, timeZone?: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Math.floor(Date.UTC(get('year'), get('month') - 1, get('day')) / 86_400_000);
}

/** Nombre de jours calendaires écoulés (0 = aujourd'hui ; négatif ramené à 0, horloge décalée). */
export function daysAgo(iso: string, now: Date, timeZone?: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, dayNumber(now, timeZone) - dayNumber(d, timeZone));
}

export function dayGroupOf(iso: string, now: Date, timeZone?: string): DayGroupKey {
  const diff = daysAgo(iso, now, timeZone);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff <= 6) return 'week';
  return 'older';
}

/** Heure pour aujourd'hui et hier (« 14:32 »), date courte au-delà (« lun. 9 nov. »). */
export function formatNotificationTime(iso: string, now: Date, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = daysAgo(iso, now, timeZone);
  if (diff <= 1) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  }
  const sameYear = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric' }).format(d) === new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric' }).format(now);
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    ...(diff <= 6 ? { weekday: 'short' as const } : {}),
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' as const }),
  }).format(d);
}

export interface NotificationLike {
  id: string;
  createdAt: string;
  isRead: boolean;
}

export interface DaySection<T> {
  key: DayGroupKey;
  title: string;
  data: T[];
}

/**
 * Notifications de la plus récente à la plus ancienne, regroupées par jour. Les entrées dont la date
 * est illisible vont dans « plus ancien », sans jamais disparaître.
 */
export function groupByDay<T extends NotificationLike>(items: readonly T[], now: Date, timeZone?: string): DaySection<T>[] {
  const stamp = (n: T) => {
    const t = new Date(n.createdAt).getTime();
    return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
  };
  const sorted = [...items].sort((a, b) => stamp(b) - stamp(a));
  const order: DayGroupKey[] = ['today', 'yesterday', 'week', 'older'];
  const buckets: Record<DayGroupKey, T[]> = { today: [], yesterday: [], week: [], older: [] };
  for (const item of sorted) buckets[dayGroupOf(item.createdAt, now, timeZone)].push(item);
  return order.filter((k) => buckets[k].length > 0).map((k) => ({ key: k, title: DAY_GROUP_LABELS[k], data: buckets[k] }));
}
