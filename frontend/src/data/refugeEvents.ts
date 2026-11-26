/**
 * Événements du Refuge reçus par notification, relayés aux écrans concernés.
 *
 * Quand une notification du Refuge arrive application ouverte, l'écran Refuge et la case « Adoption » de l'accueil se
 * rafraîchissent IMMÉDIATEMENT, une seule fois, au lieu d'attendre le prochain sondage (30 s / 60 s). Aucun sondage
 * n'est ajouté : un rafraîchissement n'a lieu que lorsqu'un événement arrive réellement.
 *
 * Pur : aucune dépendance à React Native ; le minuteur est injectable pour les tests.
 */

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Vrai pour les types de notification du Refuge (REFUGE_ADOPTED, REFUGE_RESULT_READY, …). */
export function isRefugeNotificationType(type: unknown): boolean {
  return typeof type === 'string' && type.startsWith('REFUGE_');
}

/** Identifiant de session valide transporté par une notification, sinon null (jamais une valeur forgée). */
export function refugeSessionIdOf(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const id = (data as Record<string, unknown>)['refugeSessionId'];
  return typeof id === 'string' && SAFE_ID.test(id) ? id : null;
}

export type RefugeEventListener = (refugeSessionId: string | null) => void;

export interface RefugeEventBus {
  subscribe(listener: RefugeEventListener): () => void;
  /** Notification du Refuge reçue : ignorée si le type n'en est pas un. Rafales regroupées en UN rafraîchissement. */
  notify(data: unknown): boolean;
}

export interface BusOptions {
  /** Fenêtre de regroupement : deux notifications arrivées à moins de ce délai ne déclenchent qu'un rafraîchissement. */
  windowMs?: number;
  schedule?: (fn: () => void, ms: number) => unknown;
}

export function createRefugeEventBus(options: BusOptions = {}): RefugeEventBus {
  const windowMs = options.windowMs ?? 250;
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const listeners = new Set<RefugeEventListener>();
  let pending: Set<string | null> | null = null;

  function flush() {
    const batch = pending;
    pending = null;
    if (!batch || batch.size === 0) return;
    // Une seule session concernée → son identifiant ; plusieurs (ou inconnue) → null : chaque écran vérifie sa propre session.
    const target = batch.size === 1 ? [...batch][0]! : null;
    for (const listener of [...listeners]) {
      try {
        listener(target);
      } catch {
        // Un écran en échec ne doit jamais empêcher les autres de se rafraîchir.
      }
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify(data) {
      const type = data && typeof data === 'object' ? (data as Record<string, unknown>)['type'] : undefined;
      if (!isRefugeNotificationType(type)) return false;
      if (pending === null) {
        pending = new Set();
        schedule(flush, windowMs);
      }
      pending.add(refugeSessionIdOf(data));
      return true;
    },
  };
}

/** Instance de l'application. */
export const refugeEvents = createRefugeEventBus();
