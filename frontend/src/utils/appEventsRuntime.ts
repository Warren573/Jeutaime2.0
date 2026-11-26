import type { NotificationDto } from '../api/notifications';
import { selectEventsToPresent, type EventQueue } from '../data/appEvents';

/**
 * Moteur du système événementiel : transforme un SIGNAL (push reçu application ouverte, compteur de notifications en hausse)
 * en fenêtres, à partir des notifications d'historique du compte.
 *
 * Coût réseau : UNE lecture (la première page de l'historique) par rafale de signaux, jamais de sondage propre. Les signaux
 * rapprochés (un push ET la hausse du compteur pour le même événement) sont regroupés en une seule lecture.
 */
export interface EventsRuntimeDeps {
  queue: EventQueue;
  /** Dernières notifications du compte (première page, petite). */
  fetchLatest: () => Promise<NotificationDto[]>;
  pseudoOf: (n: NotificationDto) => string | null;
  routeOf: (n: NotificationDto) => string | null;
  currentPath: () => string | null;
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => unknown;
  debounceMs?: number;
}

export interface EventsRuntime {
  /** Nouvelle session au premier plan : tout ce qui est antérieur est ignoré (déjà montré par un push, ou dans l'historique). */
  startSession(): void;
  /** Un événement vient peut-être d'arriver. Regroupé, une seule lecture. */
  signal(): void;
  /** Hausse du compteur de non lues : ignorée pendant le chargement initial de la session. */
  signalCountIncrease(): void;
  /** Lecture immédiate (tests, fin de regroupement). */
  run(): Promise<void>;
  sessionStartMs(): number;
}

const INITIAL_LOAD_GRACE_MS = 5000;

export function createEventsRuntime(deps: EventsRuntimeDeps): EventsRuntime {
  const now = deps.now ?? Date.now;
  const schedule = deps.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const debounceMs = deps.debounceMs ?? 600;
  let windowStartMs = now();
  let timer: unknown = null;
  let running = false;
  let again = false;

  async function run(): Promise<void> {
    if (running) { again = true; return; }
    running = true;
    try {
      const items = await deps.fetchLatest();
      const { models, markSeen } = selectEventsToPresent(
        items,
        { windowStartMs, currentPath: deps.currentPath(), seen: deps.queue.seenKeys() },
        { pseudoOf: deps.pseudoOf, routeOf: deps.routeOf },
      );
      if (markSeen.length) deps.queue.markSeen(markSeen);
      if (models.length) deps.queue.enqueue(models);
    } catch {
      // Réseau indisponible : aucune fenêtre, l'historique et la cloche restent la source de vérité.
    } finally {
      running = false;
      if (again) { again = false; void run(); }
    }
  }

  function signal() {
    if (timer !== null) return;
    timer = schedule(() => { timer = null; void run(); }, debounceMs);
  }

  return {
    startSession() { windowStartMs = now(); },
    signal,
    signalCountIncrease() {
      if (now() - windowStartMs < INITIAL_LOAD_GRACE_MS) return;
      signal();
    },
    run,
    sessionStartMs: () => windowStartMs,
  };
}
