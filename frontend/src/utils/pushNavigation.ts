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
// Présentation d'une notification reçue application ouverte
// ============================================================
export interface ForegroundPrefs {
  sound: boolean;
  vibration: boolean;
}

export interface ForegroundPresentation {
  showBanner: boolean;
  showList: boolean;
  playSound: boolean;
  vibrate: boolean;
}

/**
 * Bannière, son ET vibration obéissent à la MÊME décision : si l'écran (et la ressource) concernés
 * sont déjà affichés, les trois sont supprimés ; sinon ils suivent les réglages de l'utilisateur.
 * Une notification d'une autre correspondance, d'un autre écran ou inconnue n'est jamais masquée.
 */
export function foregroundPresentation(
  current: CurrentLocation | null | undefined,
  data: unknown,
  prefs: ForegroundPrefs,
): ForegroundPresentation {
  const show = shouldShowForegroundBanner(current, data);
  return { showBanner: show, showList: show, playSound: show && prefs.sound, vibrate: show && prefs.vibration };
}

export interface ForegroundDeps {
  current: CurrentLocation | null | undefined;
  data: unknown;
  prefs: ForegroundPrefs;
  vibrate: () => void;
  /** Recharge le compteur de notifications non lues : TOUJOURS appelé, même quand tout est supprimé. */
  refreshUnread: () => void;
}

/** Traitement d'une notification reçue au premier plan : vibration selon la décision, compteur toujours. */
export function onForegroundNotification(deps: ForegroundDeps): ForegroundPresentation {
  const presentation = foregroundPresentation(deps.current, deps.data, deps.prefs);
  try {
    if (presentation.vibrate) deps.vibrate();
  } finally {
    deps.refreshUnread();
  }
  return presentation;
}

/** Écran correspondant à une route : sert à ne pas rouvrir l'écran déjà affiché. */
export function routeToLocation(route: string): CurrentLocation {
  const [pathname = '', query = ''] = route.split('?');
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    const [k, v] = pair.split('=');
    if (k && v !== undefined) params[k] = v;
  }
  return { pathname, params };
}

/** Vrai si l'utilisateur est déjà sur cette route (même correspondance pour une correspondance). */
export function isAlreadyAtRoute(current: CurrentLocation | null | undefined, route: string): boolean {
  if (!current) return false;
  const target = routeToLocation(route);
  const path = current.pathname.replace(/\/+$/, '') || '/';
  if (path !== target.pathname) return false;
  if (target.pathname === '/match-profile') {
    return firstParam(current.params?.['matchId']) === target.params?.['matchId'];
  }
  return true;
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
// Contrôleur d'ouverture : file d'attente, authentification, routeur prêt, doublons
// ============================================================
export type PushAuthState = 'unknown' | 'authenticated' | 'unauthenticated';

/** Forme minimale d'une réponse de notification Expo (seuls les champs lus). */
export interface PushResponseLike {
  actionIdentifier?: string;
  notification?: { request?: { identifier?: string; content?: { data?: unknown } } };
}

export type PushDiscardReason =
  | 'unauthenticated'
  | 'session-changed'
  | 'expired'
  | 'duplicate'
  | 'ignored'
  | 'overflow'
  | 'same-destination'
  | 'already-there';

export interface PushNavigatorDeps {
  /** Ouvre la route (router.push). */
  navigate: (route: string) => void;
  /**
   * Prépare la destination (ex. recharger les correspondances) et renvoie la route finale,
   * ou le repli si la ressource n'existe plus. Ne doit jamais lever (une erreur = repli).
   */
  prepare?: (dest: PushDestination) => Promise<string>;
  /** L'utilisateur est-il déjà sur cette route ? (évite de rouvrir l'écran affiché) */
  isAtRoute?: (route: string) => boolean;
  /** Marque la réponse comme consommée côté Expo (évite un rejeu après rechargement). */
  consume?: () => void;
  /** Identifiant de l'action « appui simple » d'Expo. */
  defaultActionId: string;
  now?: () => number;
  /** Durée pendant laquelle un même appui n'est pas rejoué. */
  dedupeMs?: number;
  /** Durée maximale d'attente d'une ouverture en file. */
  pendingTtlMs?: number;
  /** Nombre maximal d'ouvertures en file ; au-delà, les plus anciennes sont abandonnées (jamais en silence). */
  maxQueue?: number;
  /** Fenêtre pendant laquelle une même destination n'est pas rouverte. */
  sameDestinationMs?: number;
  onDiscard?: (reason: PushDiscardReason, id?: string) => void;
}

export interface PushNavigatorState {
  auth: PushAuthState;
  navReady: boolean;
  /** Identité de la session (ex. identifiant utilisateur) : un changement abandonne les ouvertures en cours. */
  sessionKey?: string | null;
}

export interface PushNavigator {
  /** À appeler pour chaque réponse reçue : écouteur Expo ET dernière réponse (démarrage à froid). */
  onResponse: (response: PushResponseLike | null | undefined) => void;
  /** À appeler à chaque changement d'authentification, de session ou de disponibilité du routeur. */
  update: (state: PushNavigatorState) => void;
  /** Nombre d'ouvertures en attente ou en cours de préparation. */
  pendingCount: () => number;
  hasPending: () => boolean;
}

interface QueueItem {
  id: string;
  dest: PushDestination;
  at: number;
}

/**
 * Chaque appui sur une notification DISTINCTE est conservé dans une file ordonnée et traité à tour de
 * rôle : une seconde notification n'écrase jamais la première, y compris pendant le rechargement d'une
 * correspondance ou avant la restauration de la session. À l'arrivée, l'utilisateur voit la dernière
 * destination demandée.
 *
 * Garde-fous : un même appui n'est traité qu'une fois (identifiant) ; une destination identique à celle
 * qui vient d'être ouverte, ou déjà affichée, n'est pas rouverte ; session absente ou différente → les
 * ouvertures en file et en cours sont abandonnées (jamais d'ouverture après une déconnexion ni pour un
 * autre compte).
 */
export function createPushNavigator(deps: PushNavigatorDeps): PushNavigator {
  const now = deps.now ?? (() => Date.now());
  const dedupeMs = deps.dedupeMs ?? 30_000;
  const pendingTtlMs = deps.pendingTtlMs ?? 60_000;
  const maxQueue = deps.maxQueue ?? 5;
  const sameDestinationMs = deps.sameDestinationMs ?? 5_000;

  let state: PushNavigatorState = { auth: 'unknown', navReady: false, sessionKey: null };
  // Relecture explicite : l'état change pendant `await deps.prepare(...)`.
  const readState = (): PushNavigatorState => state;
  // Incrémentée à chaque perte ou changement de session : invalide toute préparation en cours.
  let epoch = 0;
  const queue: QueueItem[] = [];
  // Ouverture en cours de préparation (en tête de file) : jamais abandonnée par saturation.
  let inFlight: QueueItem | null = null;
  let running = false;
  let lastRoute: { route: string; at: number } | null = null;
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

  /** Abandonne toute la file : chaque appui est mémorisé (pas de rejeu) et signalé. */
  function discardAll(reason: PushDiscardReason): void {
    for (const item of queue.splice(0)) {
      remember(item.id);
      deps.onDiscard?.(reason, item.id);
    }
    deps.consume?.();
  }

  async function run(): Promise<void> {
    if (running) return;
    running = true;
    try {
      while (queue.length > 0) {
        const head = queue[0]!;
        if (now() - head.at > pendingTtlMs) {
          queue.shift();
          remember(head.id);
          deps.onDiscard?.('expired', head.id);
          continue;
        }
        const s = readState();
        // Pas encore décidable : on attend l'hydratation de la session et le routeur.
        if (s.auth === 'unknown' || !s.navReady) return;
        if (s.auth === 'unauthenticated') {
          // Jamais de navigation différée vers une future session : l'utilisateur se connecte normalement.
          discardAll('unauthenticated');
          return;
        }

        const startedEpoch = epoch;
        inFlight = head;
        let route = head.dest.route;
        if (deps.prepare) {
          try {
            route = await deps.prepare(head.dest);
          } catch {
            route = PUSH_FALLBACK_ROUTE;
          }
        }
        inFlight = null;
        // Session perdue ou changée pendant la préparation : l'ouverture et la file sont abandonnées.
        if (epoch !== startedEpoch) {
          // `update` a déjà vidé et signalé la file ; ce qui y est entré depuis appartient à la
          // nouvelle session et sera traité normalement au tour suivant.
          if (queue[0] === head) {
            queue.shift();
            remember(head.id);
            deps.onDiscard?.('session-changed', head.id);
          }
          continue;
        }
        const after = readState();
        if (after.auth !== 'authenticated' || !after.navReady) {
          // Routeur indisponible ou session perdue : on réessaie au prochain changement d'état.
          if (after.auth === 'unauthenticated') continue;
          return;
        }

        queue.shift();
        remember(head.id);
        const t = now();
        if (lastRoute && lastRoute.route === route && t - lastRoute.at < sameDestinationMs) {
          deps.onDiscard?.('same-destination', head.id);
        } else if (deps.isAtRoute?.(route)) {
          deps.onDiscard?.('already-there', head.id);
        } else {
          lastRoute = { route, at: t };
          deps.navigate(route);
        }
        deps.consume?.();
      }
    } finally {
      running = false;
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
      if (wasHandled(id) || queue.some((q) => q.id === id)) {
        deps.onDiscard?.('duplicate', id);
        return;
      }
      if (queue.length >= maxQueue) {
        // La plus ancienne ouverture EN ATTENTE est abandonnée (explicitement) ; celle en cours de
        // préparation est conservée.
        const index = queue.findIndex((q) => q !== inFlight);
        if (index !== -1) {
          const [dropped] = queue.splice(index, 1);
          remember(dropped!.id);
          deps.onDiscard?.('overflow', dropped!.id);
        }
      }
      queue.push({ id, dest: resolvePushDestination(request?.content?.data), at: now() });
      void run();
    },
    update(next) {
      const previous = state;
      state = next;
      const lostSession = previous.auth === 'authenticated' && next.auth !== 'authenticated';
      // Changement d'identité connue → connue (une clé qui apparaît après la connexion n'est pas un changement).
      const switchedSession =
        next.auth === 'authenticated' &&
        previous.auth === 'authenticated' &&
        previous.sessionKey != null &&
        next.sessionKey != null &&
        previous.sessionKey !== next.sessionKey;
      if (lostSession || switchedSession) {
        epoch += 1;
        // Les ouvertures en file appartenaient à l'ancienne session : abandonnées, jamais rejouées.
        discardAll(lostSession ? 'unauthenticated' : 'session-changed');
      }
      void run();
    },
    pendingCount: () => queue.length,
    hasPending: () => queue.length > 0,
  };
}
