/**
 * useAvatarActionQueue — File d'attente d'offrandes par avatar
 * ─────────────────────────────────────────────────────────────────────────────
 * Chaque avatar possède SA file. L'appelant push() des événements ; le hook
 * les joue séquentiellement. SalonAvatarCard appelle markDone() quand
 * useOfferAnimation passe en phase 'done'.
 *
 * Garanties :
 *  - une seule offrande active à la fois (runningRef empêche la ré-entrance)
 *  - zéro perte : push() pendant une animation → mis en file, jamais droppé
 *  - ordre FIFO
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OfferEvent } from '../types/avatarTypes';

export function useAvatarActionQueue(): {
  currentEvent: OfferEvent | null;
  push:         (event: OfferEvent) => void;
  markDone:     () => void;
  hasQueue:     boolean;
} {
  const queueRef   = useRef<OfferEvent[]>([]);
  const runningRef = useRef(false);
  const [current, setCurrent] = useState<OfferEvent | null>(null);

  const processNext = useCallback(() => {
    if (runningRef.current) return;
    if (queueRef.current.length === 0) return;
    runningRef.current = true;
    setCurrent(queueRef.current.shift()!);
  }, []);

  const push = useCallback((event: OfferEvent) => {
    queueRef.current.push(event);
    processNext();
  }, [processNext]);

  const markDone = useCallback(() => {
    runningRef.current = false;
    setCurrent(null);
  }, []);

  // Quand current revient à null, démarrer l'item suivant s'il y en a un
  useEffect(() => {
    if (current === null) processNext();
  }, [current, processNext]);

  return { currentEvent: current, push, markDone, hasQueue: queueRef.current.length > 0 };
}
