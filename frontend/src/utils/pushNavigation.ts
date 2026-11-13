/**
 * Navigation déclenchée par l'appui sur une notification push — logique PURE.
 *
 * Aucune dépendance à React Native, Expo ni au routeur : tout ce qui peut se tester
 * (choix de la destination, sécurité, attente de l'authentification, doublons,
 * bannières inutiles, badge) vit ici ; `usePushNotifications` ne fait que brancher
 * les événements Expo sur ce module.
 *
 * Sécurité : la destination est TOUJOURS reconstruite à partir d'une liste fermée de
 * routes et d'identifiants validés. Une route, une URL ou un schéma fourni par la
 * notification n'est jamais suivi.
 */

/** Écran de repli sûr : la liste des notifications de l'application. */
export const PUSH_FALLBACK_ROUTE = '/notifications';

/** Identifiants de ressources (cuid, uuid, slugs) : strictement alphanumériques, `-` et `_`. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID.test(value);
}

export type PushDestinationKind = 'match' | 'salon' | 'static' | 'fallback';

export interface PushDestination {
  /** Route expo-router complète à ouvrir. */
  route: string;
  /** Chemin sans paramètres, pour comparer avec l'écran affiché. */
  pathname: string;
  kind: PushDestinationKind;
  /** Identifiant de correspondance à vérifier avant d'ouvrir (kind === 'match'). */
  matchId?: string;
  /** Identifiant de salon (kind === 'salon'). */
  salonId?: string;
}

const staticDest = (pathname: string): PushDestination => ({ route: pathname, pathname, kind: 'static' });
const fallbackDest = (): PushDestination => ({ route: PUSH_FALLBACK_ROUTE, pathname: PUSH_FALLBACK_ROUTE, kind: 'fallback' });
const matchDest = (matchId: string): PushDestination => ({
  route: `/match-profile?matchId=${matchId}`,
  pathname: '/match-profile',
  kind: 'match',
  matchId,
});
const salonDest = (salonId: string): PushDestination => ({
  route: `/salon/${salonId}`,
  pathname: `/salon/${salonId}`,
  kind: 'salon',
  salonId,
});

/**
 * Destination d'une charge push (`content.data`). Ne lève jamais.
 *
 *  - lettres, match, questions réussies : la correspondance (repli si l'identifiant manque) ;
 *  - questions échouées : la correspondance est rompue → liste des notifications ;
 *  - offrande : le salon, sinon les offrandes reçues ; magie : le salon, sinon le repli ;
 *  - bouteille, invitation de salon privé, administration, abonnement, sécurité, Journal : écran fixe.
 */
export function resolvePushDestination(data: unknown): PushDestination {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return fallbackDest();
  const d = data as Record<string, unknown>;
  const type = typeof d['type'] === 'string' ? d['type'] : undefined;

  if (!type) {
    // Charge historique de l'Édition du jour : aucune route libre n'est suivie, seule celle-ci.
    return d['route'] === '/journal' ? staticDest('/journal') : fallbackDest();
  }

  switch (type) {
    case 'LETTER_RECEIVED':
    case 'MATCH_CREATED':
    case 'QUESTIONS_PASSED':
      return isSafeId(d['matchId']) ? matchDest(d['matchId']) : fallbackDest();
    case 'QUESTIONS_FAILED':
      return fallbackDest();
    case 'OFFERING_RECEIVED':
      return isSafeId(d['salonId']) ? salonDest(d['salonId']) : staticDest('/offerings');
    case 'MAGIE_RECEIVED':
      return isSafeId(d['salonId']) ? salonDest(d['salonId']) : fallbackDest();
    case 'BOTTLE_REPLY':
      return staticDest('/bottles-main');
    case 'PRIVATE_SALON_INVITE':
      return staticDest('/private-salons');
    case 'ADMIN_MESSAGE':
      return staticDest('/admin-messages');
    case 'PREMIUM_SUBSCRIBED':
    case 'PREMIUM_CANCELLED':
      return staticDest('/premium');
    case 'SECURITY_ALERT':
      return staticDest('/security');
    case 'DAILY_EDITION':
      return staticDest('/journal');
    default:
      return fallbackDest();
  }
}

// ============================================================
// Écran actuellement affiché ↔ destination (bannière inutile)
// ============================================================
export interface CurrentLocation {
  pathname: string;
  params?: Record<string, string | string[] | undefined>;
}

const firstParam = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** Vrai si l'utilisateur consulte déjà l'écran (et la ressource) que la notification ouvrirait. */
export function isViewingDestination(current: CurrentLocation | null | undefined, dest: PushDestination): boolean {
  if (!current) return false;
  // Le repli n'est jamais « consulté » : une notification inconnue reste visible.
  if (dest.kind === 'fallback') return false;
  const path = current.pathname.replace(/\/+$/, '') || '/';
  if (dest.kind === 'match') {
    return path === '/match-profile' && firstParam(current.params?.['matchId']) === dest.matchId;
  }
  return path === dest.pathname;
}

/** Faux quand la bannière (et le son) seraient redondants avec l'écran déjà ouvert. */
export function shouldShowForegroundBanner(current: CurrentLocation | null | undefined, data: unknown): boolean {
  return !isViewingDestination(current, resolvePushDestination(data));
}

// ============================================================
// Badge de l'icône (iOS)
// ============================================================
/** Valeur sûre pour `setBadgeCountAsync` : entier entre 0 et 9999. */
export function badgeCountFor(unread: unknown): number {
  const n = typeof unread === 'number' && Number.isFinite(unread) ? Math.trunc(unread) : 0;
  return Math.min(9999, Math.max(0, n));
}

// ============================================================
// Préparation d'une destination (ressource encore disponible ?)
// ============================================================
export interface PrepareDeps {
  /** La correspondance est-elle connue de l'application (magasin) ? */
  hasMatch: (matchId: string) => boolean;
  /** Recharge les correspondances depuis le serveur. */
  refreshMatches: () => Promise<unknown>;
  /** Délai maximal d'attente du rechargement. */
  timeoutMs: number;
}

/**
 * Une correspondance absente du magasin (nouveau match reçu pendant que l'application dormait,
 * démarrage à froid) est rechargée ; si elle n'existe toujours pas (rompue, bloquée, supprimée) ou si
 * le rechargement échoue ou dépasse le délai, on ouvre le repli plutôt qu'un écran « introuvable ».
 * Ne lève jamais.
 */
export async function prepareDestinationWith(dest: PushDestination, deps: PrepareDeps): Promise<string> {
  if (dest.kind !== 'match' || !dest.matchId) return dest.route;
  const matchId = dest.matchId;
  try {
    if (!deps.hasMatch(matchId)) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, deps.timeoutMs);
        deps.refreshMatches().then(
          () => { clearTimeout(timer); resolve(); },
          () => { clearTimeout(timer); resolve(); },
        );
      });
    }
    return deps.hasMatch(matchId) ? dest.route : PUSH_FALLBACK_ROUTE;
  } catch {
    return PUSH_FALLBACK_ROUTE;
  }
}

// ============================================================
// Contrôleur d'ouverture : authentification, routeur prêt, doublons
// ============================================================
export type PushAuthState = 'unknown' | 'authenticated' | 'unauthenticated';

/** Forme minimale d'une réponse de notification Expo (seuls les champs lus). */
export interface PushResponseLike {
  actionIdentifier?: string;
  notification?: { request?: { identifier?: string; content?: { data?: unknown } } };
}

export interface PushNavigatorDeps {
  /** Ouvre la route (router.push). */
  navigate: (route: string) => void;
  /**
   * Prépare la destination (ex. recharger les correspondances) et renvoie la route finale,
   * ou le repli si la ressource n'existe plus. Ne doit jamais lever (une erreur = repli).
   */
  prepare?: (dest: PushDestination) => Promise<string>;
  /** Marque la réponse comme consommée côté Expo (évite un rejeu après rechargement). */
  consume?: () => void;
  /** Identifiant de l'action « appui simple » d'Expo. */
  defaultActionId: string;
  now?: () => number;
  /** Durée pendant laquelle un même appui n'est pas rejoué. */
  dedupeMs?: number;
  /** Durée maximale d'attente avant d'abandonner une ouverture en attente. */
  pendingTtlMs?: number;
  onDiscard?: (reason: 'unauthenticated' | 'expired' | 'duplicate' | 'ignored') => void;
}

export interface PushNavigator {
  /** À appeler pour chaque réponse reçue : écouteur Expo ET dernière réponse (démarrage à froid). */
  onResponse: (response: PushResponseLike | null | undefined) => void;
  /** À appeler à chaque changement d'état d'authentification ou de disponibilité du routeur. */
  update: (state: { auth: PushAuthState; navReady: boolean }) => void;
  /** Réservé aux tests et au diagnostic. */
  hasPending: () => boolean;
}

export function createPushNavigator(deps: PushNavigatorDeps): PushNavigator {
  const now = deps.now ?? (() => Date.now());
  const dedupeMs = deps.dedupeMs ?? 30_000;
  const pendingTtlMs = deps.pendingTtlMs ?? 60_000;

  let state: { auth: PushAuthState; navReady: boolean } = { auth: 'unknown', navReady: false };
  // Relecture explicite : l'état peut changer pendant `await deps.prepare(...)`.
  const readState = (): { auth: PushAuthState; navReady: boolean } => state;
  let pending: { id: string; dest: PushDestination; at: number } | null = null;
  let busy = false;
  const handled = new Map<string, number>();

  const wasHandled = (id: string): boolean => {
    const at = handled.get(id);
    if (at !== undefined && now() - at < dedupeMs) return true;
    if (at !== undefined) handled.delete(id);
    return false;
  };
  const remember = (id: string) => {
    handled.set(id, now());
    if (handled.size > 50) {
      const oldest = handled.keys().next().value;
      if (oldest !== undefined) handled.delete(oldest);
    }
  };

  async function flush(): Promise<void> {
    if (busy || !pending) return;
    if (now() - pending.at > pendingTtlMs) {
      deps.onDiscard?.('expired');
      pending = null;
      return;
    }
    // Pas encore décidable : on attend l'hydratation de la session et le routeur.
    if (state.auth === 'unknown' || !state.navReady) return;
    const current = pending;
    if (state.auth === 'unauthenticated') {
      // Jamais de navigation différée vers une session future : l'utilisateur se connecte normalement.
      remember(current.id);
      deps.consume?.();
      deps.onDiscard?.('unauthenticated');
      pending = null;
      return;
    }
    busy = true;
    try {
      let route = current.dest.route;
      if (deps.prepare) {
        try {
          route = await deps.prepare(current.dest);
        } catch {
          route = PUSH_FALLBACK_ROUTE;
        }
      }
      // L'état a pu changer pendant la préparation (déconnexion) : on ne navigue plus.
      const after = readState();
      if (after.auth !== 'authenticated' || !after.navReady) {
        if (after.auth === 'unauthenticated') {
          remember(current.id);
          deps.consume?.();
          if (pending === current) pending = null;
        }
        return;
      }
      remember(current.id);
      if (pending === current) pending = null;
      deps.consume?.();
      deps.navigate(route);
    } finally {
      busy = false;
      // Une autre notification a pu arriver pendant la préparation.
      if (pending) void flush();
    }
  }

  return {
    onResponse(response) {
      if (!response) return;
      if (response.actionIdentifier !== undefined && response.actionIdentifier !== deps.defaultActionId) {
        deps.onDiscard?.('ignored');
        return;
      }
      const request = response.notification?.request;
      const id = typeof request?.identifier === 'string' && request.identifier ? request.identifier : null;
      if (!id) {
        deps.onDiscard?.('ignored');
        return;
      }
      if (wasHandled(id) || pending?.id === id) {
        deps.onDiscard?.('duplicate');
        return;
      }
      pending = { id, dest: resolvePushDestination(request?.content?.data), at: now() };
      void flush();
    },
    update(next) {
      state = next;
      void flush();
    },
    hasPending: () => pending !== null,
  };
}
