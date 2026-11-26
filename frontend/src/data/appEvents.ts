/**
 * Système ÉVÉNEMENTIEL de JeuTaime : fenêtre au milieu de l'écran pour les événements importants, application ouverte.
 *
 * Trois systèmes distincts (ne jamais les confondre) :
 *   1. PUSH système iOS : application en arrière-plan ou fermée (envoyé par le serveur, affiché par iOS) ;
 *   2. FENÊTRE ÉVÉNEMENTIELLE (ce module) : application OUVERTE, uniquement pour les événements importants ;
 *   3. HISTORIQUE + cloche : toujours, pour tous les événements.
 * Application ouverte : jamais de bannière iOS (voir pushNavigation.foregroundPresentation) — la fenêtre la remplace.
 *
 * Source de vérité : les notifications INTERNES du compte (celles de l'historique), jamais le contenu d'un push. Une fenêtre
 * est donc construite à partir d'une ligne d'historique, identifiée par son id : impossible de l'afficher deux fois.
 *
 * Module PUR : aucun accès à React Native ni au réseau (testé unitairement).
 */
import type { NotificationDto, NotificationType } from '../api/notifications';
import { categoryFor, type NotificationIconName } from '../utils/notificationsView';

/**
 *  - 'dialog'   : fenêtre au milieu de l'écran (+ historique) ;
 *  - 'history'  : historique et cloche seulement (ne doit pas interrompre) ;
 *  - 'existing' : déjà annoncé par un système existant à ne pas remplacer (annonce de match).
 */
export type EventMode = 'dialog' | 'history' | 'existing';

export interface EventPolicy {
  mode: EventMode;
  /** Plus grand = présenté en premier quand plusieurs événements attendent. */
  priority: number;
  title?: string;
  /** Libellé du bouton d'accès à la fonctionnalité ; absent = aucun bouton d'accès (fermeture seulement). */
  cta?: string;
  /**
   * Ne jamais afficher le pseudo de la personne : anonymat (bouteilles) et règles de dévoilement (Refuge : aucun pseudo
   * avant le dévoilement, et même alors c'est l'écran du Refuge qui le montre).
   */
  anonymous?: boolean;
  /** Écrans sur lesquels la fenêtre est inutile (l'utilisateur voit déjà l'événement) : le chemin commence par l'un d'eux. */
  suppressOnPathPrefixes?: readonly string[];
}

const history = (): EventPolicy => ({ mode: 'history', priority: 0 });

/** Matrice COMPLÈTE : chaque type de notification du serveur y figure (vérifié par un test). */
export const EVENT_POLICIES: Record<NotificationType, EventPolicy> = {
  // ── Rencontres ─────────────────────────────────────────────────────────────
  MATCH_CREATED: { mode: 'existing', priority: 0 }, // annonce « C'est un match ! » existante, conservée telle quelle
  QUESTIONS_TURN: { mode: 'dialog', priority: 60, title: 'À toi de jouer', cta: 'Répondre aux 3 questions' },
  QUESTIONS_PASSED: { mode: 'dialog', priority: 60, title: 'Les 3 questions sont réussies !', cta: 'Écrire une lettre' },
  QUESTIONS_FAILED: { mode: 'dialog', priority: 40, title: 'Une rencontre s’achève' },
  // ── Lettres ────────────────────────────────────────────────────────────────
  LETTER_RECEIVED: { mode: 'dialog', priority: 50, title: 'Du courrier pour toi', cta: 'Lire la lettre', suppressOnPathPrefixes: ['/(tabs)/letters'] },
  // ── Bouteilles à la mer (anonymat) : les réponses courantes restent dans l'historique ─────────────────────
  BOTTLE_REPLY: history(),
  BOTTLE_REVEAL_REQUEST: { mode: 'dialog', priority: 55, title: 'Quelqu’un souhaite se dévoiler', cta: 'Voir la demande', anonymous: true },
  BOTTLE_REVEAL_ACCEPTED: { mode: 'dialog', priority: 55, title: 'Une correspondance s’ouvre', cta: 'Ouvrir la correspondance', anonymous: true },
  BOTTLE_REVEAL_REFUSED: { mode: 'dialog', priority: 35, title: 'Pas cette fois', anonymous: true },
  // ── Duels ──────────────────────────────────────────────────────────────────
  DUEL_RECEIVED: { mode: 'dialog', priority: 60, title: 'Un duel t’attend', cta: 'Voir le duel', suppressOnPathPrefixes: ['/duel'] },
  DUEL_RESULT: { mode: 'dialog', priority: 55, title: 'Résultat du duel', cta: 'Voir le résultat', suppressOnPathPrefixes: ['/duel'] },
  DUEL_DECLINED: history(),
  DUEL_EXPIRED: history(),
  // ── Offrandes ──────────────────────────────────────────────────────────────
  OFFERING_RECEIVED: { mode: 'dialog', priority: 40, title: 'Une offrande pour toi', cta: 'Voir l’offrande', suppressOnPathPrefixes: ['/offerings'] },
  // ── Salons ─────────────────────────────────────────────────────────────────
  MAGIE_RECEIVED: { mode: 'dialog', priority: 30, title: 'Un sort t’a touché', suppressOnPathPrefixes: ['/salon'] }, // visible dans le salon lui-même
  MAGIE_BROKEN: history(),
  PRIVATE_SALON_INVITE: { mode: 'dialog', priority: 45, title: 'Invitation à un salon privé', cta: 'Voir l’invitation', suppressOnPathPrefixes: ['/private-salons'] },
  // ── Refuge (aucun pseudo, aucune action nommée : voir refuge.notifications.ts côté serveur) ──────────────
  REFUGE_ADOPTED: { mode: 'dialog', priority: 65, title: 'Ton refuge commence', cta: 'Aller au Refuge', anonymous: true, suppressOnPathPrefixes: ['/refuge/'] },
  REFUGE_CHOICE_READY: { mode: 'dialog', priority: 50, title: 'Ton compagnon est prêt', cta: 'Aller au Refuge', anonymous: true, suppressOnPathPrefixes: ['/refuge/'] },
  REFUGE_RESULT_READY: { mode: 'dialog', priority: 50, title: 'Le résultat du jour', cta: 'Découvrir le résultat', anonymous: true, suppressOnPathPrefixes: ['/refuge/'] },
  REFUGE_DAY_RESULT: history(), // le parrain / la marraine voit déjà le score en validant
  REFUGE_NEW_DAY: { mode: 'dialog', priority: 30, title: 'Le Refuge s’éveille', cta: 'Choisir mes actions', anonymous: true, suppressOnPathPrefixes: ['/refuge/'] },
  REFUGE_COINS: history(),
  REFUGE_REVEAL_PHASE: { mode: 'dialog', priority: 70, title: 'Le moment du dévoilement', cta: 'Aller au Refuge', anonymous: true, suppressOnPathPrefixes: ['/refuge/'] },
  REFUGE_REVEALED: { mode: 'dialog', priority: 70, title: 'Vous vous dévoilez', cta: 'Aller au Refuge', anonymous: true, suppressOnPathPrefixes: ['/refuge/'] },
  REFUGE_REVEAL_REFUSED: { mode: 'dialog', priority: 40, title: 'Une page se tourne', anonymous: true, suppressOnPathPrefixes: ['/refuge/'] },
  REFUGE_EXPIRED: { mode: 'dialog', priority: 35, title: 'Refuge terminé', anonymous: true, suppressOnPathPrefixes: ['/refuge/'] },
  // ── Compte, sécurité, administration ───────────────────────────────────────
  SECURITY_ALERT: { mode: 'dialog', priority: 100, title: 'Alerte de sécurité', cta: 'Voir mon compte', suppressOnPathPrefixes: ['/security'] },
  ADMIN_MESSAGE: { mode: 'dialog', priority: 90, title: 'Message de l’équipe JeuTaime', cta: 'Lire le message', suppressOnPathPrefixes: ['/admin-messages'] },
  PREMIUM_SUBSCRIBED: history(), // action de l'utilisateur lui-même
  PREMIUM_CANCELLED: history(),
  REPORT_PROCESSED: history(),
  ACCOUNT_RESTORED: history(),
};

export function policyFor(type: unknown): EventPolicy | null {
  return typeof type === 'string' && Object.prototype.hasOwnProperty.call(EVENT_POLICIES, type) ? EVENT_POLICIES[type as NotificationType] : null;
}

// ============================================================
// Modèle d'une fenêtre
// ============================================================
export interface EventDialogModel {
  /** Identité de l'événement = id de la notification d'historique : jamais deux fenêtres pour le même événement. */
  key: string;
  type: NotificationType;
  title: string;
  /** Texte du serveur (déjà au bon vocabulaire : compagnon, parrain/marraine selon le genre, pseudo d'un duel…). */
  message: string;
  /** Pseudo de la personne concernée, seulement si la règle d'anonymat le permet. */
  pseudo: string | null;
  icon: NotificationIconName;
  label: string;
  cta: { label: string; route: string } | null;
  priority: number;
  createdAtMs: number;
}

/** Fenêtre d'un événement, ou null s'il ne doit pas en avoir (historique seulement, annonce existante, type inconnu). */
export function buildEventDialog(
  notification: Pick<NotificationDto, 'id' | 'type' | 'message' | 'createdAt'>,
  options: { pseudo?: string | null; route?: string | null } = {},
): EventDialogModel | null {
  const policy = policyFor(notification.type);
  if (!policy || policy.mode !== 'dialog' || !policy.title) return null;
  if (typeof notification.id !== 'string' || !notification.id) return null;
  const category = categoryFor(notification.type);
  const route = typeof options.route === 'string' && options.route.startsWith('/') ? options.route : null;
  const pseudo = !policy.anonymous && typeof options.pseudo === 'string' && options.pseudo.trim() ? options.pseudo.trim().slice(0, 30) : null;
  const createdAtMs = Date.parse(String(notification.createdAt));
  return {
    key: notification.id,
    type: notification.type,
    title: policy.title,
    message: typeof notification.message === 'string' ? notification.message : '',
    pseudo,
    icon: category.icon,
    label: category.label,
    cta: policy.cta && route ? { label: policy.cta, route } : null,
    priority: policy.priority,
    createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
  };
}

// ============================================================
// Admissibilité : quels événements méritent une fenêtre MAINTENANT
// ============================================================
export interface PresentContext {
  /** Début de la session au premier plan : ce qui est arrivé avant a déjà été montré par un push ou est dans l'historique. */
  windowStartMs: number;
  /** Écran actuellement affiché (chemin expo-router). */
  currentPath: string | null;
  /** Identifiants d'événements déjà présentés (persistés). */
  seen: ReadonlySet<string>;
  /** Marge d'horloge entre l'appareil et le serveur. */
  skewMs?: number;
}

/**
 * Chemin comparable : sans groupes de routes « (tabs) » (expo-router ne les expose pas toujours dans le chemin affiché).
 * Les préfixes de dossier (« /refuge/ ») gardent leur barre finale.
 */
export function normalizePath(path: string | null | undefined): string {
  return (path ?? '').replace(/\/\([^/]+\)/g, '');
}

export type RejectReason = 'not-dialog' | 'read' | 'seen' | 'before-session' | 'viewing' | 'invalid';

export function presentability(
  notification: Pick<NotificationDto, 'id' | 'type' | 'isRead' | 'createdAt'>,
  ctx: PresentContext,
): { ok: true } | { ok: false; reason: RejectReason } {
  const policy = policyFor(notification.type);
  if (!policy || policy.mode !== 'dialog') return { ok: false, reason: 'not-dialog' };
  if (typeof notification.id !== 'string' || !notification.id) return { ok: false, reason: 'invalid' };
  if (notification.isRead) return { ok: false, reason: 'read' };
  if (ctx.seen.has(notification.id)) return { ok: false, reason: 'seen' };
  const created = Date.parse(String(notification.createdAt));
  if (!Number.isFinite(created)) return { ok: false, reason: 'invalid' };
  if (created < ctx.windowStartMs - (ctx.skewMs ?? 5000)) return { ok: false, reason: 'before-session' };
  const path = normalizePath(ctx.currentPath);
  if (path && policy.suppressOnPathPrefixes?.some((prefix) => path.startsWith(normalizePath(prefix)))) return { ok: false, reason: 'viewing' };
  return { ok: true };
}

// ============================================================
// File d'attente : une fenêtre à la fois, sans doublon, sans réapparition
// ============================================================
export interface SeenStore {
  load(): Promise<string[]>;
  save(keys: string[]): Promise<void>;
}

export const MAX_SEEN_EVENTS = 200;
export const MAX_QUEUED_EVENTS = 20;

export interface EventQueue {
  hydrate(): Promise<void>;
  /** Ajoute les événements pas encore vus ni en file ; retourne combien ont été retenus. */
  enqueue(models: readonly EventDialogModel[]): number;
  /** Marque comme vus SANS fenêtre (historique seulement, annonce existante, écran déjà ouvert). */
  markSeen(keys: readonly string[]): void;
  /** Fenêtre à afficher maintenant, ou null. */
  current(): EventDialogModel | null;
  /** Ferme la fenêtre courante (vue, quoi qu'il arrive) ; la suivante devient courante. */
  dismiss(): EventDialogModel | null;
  seenKeys(): ReadonlySet<string>;
  pending(): number;
  subscribe(listener: () => void): () => void;
  /** Efface tout (déconnexion). */
  reset(): void;
}

export function createEventQueue(store: SeenStore): EventQueue {
  let seen = new Set<string>();
  let order: string[] = []; // ordre d'insertion des clés vues (pour borner)
  let queue: EventDialogModel[] = [];
  let shown: EventDialogModel | null = null;
  const listeners = new Set<() => void>();
  const emit = () => { for (const l of [...listeners]) { try { l(); } catch { /* un abonné défaillant n'arrête pas les autres */ } } };

  function remember(keys: readonly string[]) {
    let changed = false;
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      order.push(key);
      changed = true;
    }
    while (order.length > MAX_SEEN_EVENTS) {
      const old = order.shift();
      if (old !== undefined) seen.delete(old);
    }
    if (changed) void store.save([...order]).catch(() => { /* mémoire locale indisponible : le risque est une réapparition, pas une perte */ });
  }

  const sortQueue = () => queue.sort((a, b) => b.priority - a.priority || a.createdAtMs - b.createdAtMs);
  const knownKeys = () => new Set([...seen, ...queue.map((m) => m.key), ...(shown ? [shown.key] : [])]);

  return {
    async hydrate() {
      try {
        const keys = (await store.load()).filter((k) => typeof k === 'string').slice(-MAX_SEEN_EVENTS);
        order = [...new Set([...keys, ...order])];
        seen = new Set(order);
      } catch {
        // Mémoire illisible : on repart à vide ; la fenêtre de session évite de rejouer l'ancien.
      }
    },
    enqueue(models) {
      const known = knownKeys();
      let added = 0;
      for (const model of models) {
        if (known.has(model.key)) continue;
        known.add(model.key);
        queue.push(model);
        added++;
      }
      if (added === 0) return 0;
      sortQueue();
      if (queue.length > MAX_QUEUED_EVENTS) queue = queue.slice(0, MAX_QUEUED_EVENTS);
      if (!shown) shown = queue.shift() ?? null;
      emit();
      return added;
    },
    markSeen(keys) {
      remember(keys);
    },
    current: () => shown,
    dismiss() {
      if (shown) remember([shown.key]);
      shown = queue.shift() ?? null;
      emit();
      return shown;
    },
    seenKeys: () => seen,
    pending: () => queue.length,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    reset() {
      seen = new Set();
      order = [];
      queue = [];
      shown = null;
      emit();
    },
  };
}

/**
 * Admet les notifications d'une page d'historique : retient celles qui méritent une fenêtre, marque comme « vues » celles
 * qui n'en méritent pas mais ne doivent plus jamais se présenter (annonce de match déjà faite, écran déjà ouvert).
 */
export function selectEventsToPresent(
  items: readonly NotificationDto[],
  ctx: PresentContext,
  helpers: { pseudoOf: (n: NotificationDto) => string | null; routeOf: (n: NotificationDto) => string | null },
): { models: EventDialogModel[]; markSeen: string[] } {
  const models: EventDialogModel[] = [];
  const markSeen: string[] = [];
  for (const n of items) {
    const verdict = presentability(n, ctx);
    if (verdict.ok) {
      const model = buildEventDialog(n, { pseudo: helpers.pseudoOf(n), route: helpers.routeOf(n) });
      if (model) models.push(model);
    } else if (verdict.reason === 'viewing') {
      markSeen.push(n.id);
    } else if (verdict.reason === 'not-dialog' && policyFor(n.type)?.mode === 'existing' && !n.isRead && !ctx.seen.has(n.id)) {
      markSeen.push(n.id);
    }
  }
  return { models, markSeen };
}
