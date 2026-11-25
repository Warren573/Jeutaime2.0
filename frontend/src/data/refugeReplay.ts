import { REFUGE_CYCLE_MS, reactionsDurationMs, type RefugeAnimationData } from './refugeAnimation';

/**
 * Rattrapage des réactions immédiates manquées.
 *
 * Les réactions durent ~10 s. L'autre participant n'ouvre souvent le Refuge ou
 * l'accueil que plus tard : sans rattrapage il ne les verrait jamais. Règles :
 *  - le rejeu part de l'instant où l'écran découvre le résultat (heure serveur) ;
 *  - une seule fois par résultat et par appareil (jamais en boucle) ;
 *  - uniquement pendant le cycle d'une heure (au-delà, le compagnon dort) ;
 *  - n'influence PAS le cycle d'une heure, qui reste ancré sur le serveur ;
 *  - le Refuge et l'accueil partagent le même rejeu (même instant de départ).
 * Aucune requête réseau : tout se calcule à partir des données déjà reçues.
 */
export interface ReplayMemory {
  /** Dernier résultat vu, par utilisateur (persisté localement). */
  seen: Map<string, string>;
  /** Instant de départ du rejeu, par résultat. */
  replays: Map<string, number>;
}

export function createReplayMemory(): ReplayMemory {
  return { seen: new Map(), replays: new Map() };
}

export function replayKey(sessionId: string | null | undefined, animation?: RefugeAnimationData | null): string | null {
  if (!sessionId || !animation?.resolvedAt || !Number.isFinite(Date.parse(animation.resolvedAt))) return null;
  if (typeof animation.matches !== 'number' || reactionsDurationMs(animation) === 0) return null;
  return `${sessionId}|${animation.resolvedAt}`;
}

/** Retourne l'instant de départ du rejeu pour ce résultat, ou null s'il n'y a rien à rejouer. */
export function claimReplay(
  memory: ReplayMemory,
  userId: string,
  sessionId: string | null | undefined,
  animation: RefugeAnimationData | null | undefined,
  now: number
): number | null {
  const key = replayKey(sessionId, animation);
  if (!key || !userId) return null;
  const existing = memory.replays.get(key);
  if (existing !== undefined) return existing; // déjà décidé : même rejeu pour tous les écrans
  if (memory.seen.get(userId) === key) return null; // déjà vu sur cet appareil

  const since = now - Date.parse(animation!.resolvedAt!);
  memory.seen.set(userId, key);
  if (since < reactionsDurationMs(animation)) return null; // vu en direct, rien à rattraper
  if (since < reactionsDurationMs(animation) + REFUGE_CYCLE_MS) {
    memory.replays.set(key, now);
    return now;
  }
  return null; // cycle terminé : le compagnon dort, pas de rejeu
}
