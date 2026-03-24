/**
 * useOfferAnimation — Machine à états pour une offrande
 * ─────────────────────────────────────────────────────────────────────────────
 * États : idle → projectile → reaction → done
 *
 *  idle       : pas d'événement actif
 *  projectile : l'objet vole vers l'avatar (~700 ms)
 *  reaction   : l'avatar réagit (durationMs - 700 ms)
 *  done       : séquence terminée (le parent peut nettoyer)
 */

import { useEffect, useRef, useState } from 'react';
import { offerRegistry, type OfferDefinition } from '../config/offerRegistry';
import type { OfferEvent } from '../types/avatarTypes';

export type OfferPhase = 'idle' | 'projectile' | 'reaction' | 'done';

const PROJECTILE_DURATION_MS = 700;

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

    timers.current.push(
      setTimeout(() => setPhase('reaction'), PROJECTILE_DURATION_MS),
    );

    timers.current.push(
      setTimeout(() => setPhase('done'), config.durationMs),
    );

    return () => clearTimers();
  // Comparer sur l'id de l'événement, pas l'objet entier
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  const config: OfferDefinition | null = event ? offerRegistry[event.type] ?? null : null;

  return { phase, config };
}
