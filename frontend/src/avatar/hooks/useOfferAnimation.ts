/**
 * useOfferAnimation — Machine à états pour une offrande
 * ─────────────────────────────────────────────────────────────────────────────
 * États : idle → projectile → reaction → done
 *
 *  idle       : pas d'événement actif
 *  projectile : l'objet vole vers l'avatar (~700 ms)
 *  reaction   : l'avatar réagit (durationMs - 700 ms)
 *  done       : séquence terminée (le parent peut nettoyer)
 *
 * Timing :
 *  PROJECTILE_DURATION_MS : durée du vol (700ms)
 *  REACTION_DELAY_MS      : pause émotionnelle avant la réaction (180ms)
 *    → le projectile « atterrit », micro-pause, puis l'avatar réagit
 *    → les deux timers (reaction + done) sont décalés du même montant
 */

import { useEffect, useRef, useState } from 'react';
import { offerRegistry, type OfferDefinition } from '../config/offerRegistry';
import type { OfferEvent } from '../types/avatarTypes';

export type OfferPhase = 'idle' | 'projectile' | 'reaction' | 'done';

const PROJECTILE_DURATION_MS = 700;
const REACTION_DELAY_MS      = 180;

export function useOfferAnimation(event?: OfferEvent | null) {
  const [phase, setPhase] = useState<OfferPhase>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  useEffect(() => {
    clearTimers();

    if (!event) {
      setPhase('idle');
      return;
    }

    const config = offerRegistry[event.type];
    if (!config) {
      setPhase('idle');
      return;
    }

    setPhase('projectile');

    // Pause émotionnelle : le projectile arrive → micro-délai → l'avatar réagit
    timers.current.push(
      setTimeout(() => setPhase('reaction'), PROJECTILE_DURATION_MS + REACTION_DELAY_MS),
    );

    timers.current.push(
      setTimeout(() => setPhase('done'), config.durationMs + REACTION_DELAY_MS),
    );

    return () => clearTimers();
  // Comparer sur l'id de l'événement, pas l'objet entier
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  const config: OfferDefinition | null = event ? offerRegistry[event.type] ?? null : null;

  return { phase, config };
}
