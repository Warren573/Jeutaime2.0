/**
 * useAvatarActionQueue — File d'attente des événements avatar
 * ─────────────────────────────────────────────────────────────────────────────
 * Gère la séquence : offrande reçue → animation projectile → réaction.
 * Supporte plusieurs événements simultanés (file FIFO).
 */

import { useCallback, useRef, useState } from 'react';
import { AvatarEvent, OfferType, ReactionType, TransformationType, MagicType } from '../types/avatarTypes';
import { actionRegistry } from '../config/actionRegistry';
import { transformationRegistry } from '../config/transformationRegistry';
import { magicRegistry } from '../config/magicRegistry';

interface AvatarState {
  reaction?:       ReactionType | null;
  transformation?: TransformationType | null;
  magic?:          MagicType | null;
  projectile?: {
    visible: boolean;
    type:    OfferType;
  };
}

export function useAvatarActionQueue() {
  const [state, setState] = useState<AvatarState>({
    reaction:       null,
    transformation: null,
    magic:          null,
    projectile:     { visible: false, type: 'coffee' },
  });

  const queue   = useRef<AvatarEvent[]>([]);
  const busy    = useRef(false);

  /** Traite le prochain événement de la file */
  const processNext = useCallback(() => {
    if (busy.current || queue.current.length === 0) return;

    const event = queue.current.shift()!;
    busy.current = true;

    if (event.category === 'offer') {
      const def = actionRegistry[event.type];
      if (!def) { busy.current = false; processNext(); return; }

      // Lance le projectile
      setState((s) => ({ ...s, projectile: { visible: true, type: event.type } }));

      // Après animation → réaction
      setTimeout(() => {
        setState((s) => ({
          ...s,
          projectile: { ...s.projectile!, visible: false },
          reaction:   def.reaction,
        }));

        // Efface la réaction après durée
        setTimeout(() => {
          setState((s) => ({ ...s, reaction: null }));
          busy.current = false;
          processNext();
        }, def.reactionDurationMs);
      }, 900); // durée animation projectile

    } else if (event.category === 'transformation') {
      setState((s) => ({ ...s, transformation: event.type }));
      busy.current = false;
      processNext();

    } else if (event.category === 'magic') {
      setState((s) => ({ ...s, magic: event.type }));
      busy.current = false;
      processNext();
    }
  }, []);

  /** Ajoute un événement à la file */
  const enqueue = useCallback((event: AvatarEvent) => {
    queue.current.push(event);
    processNext();
  }, [processNext]);

  /** Efface une transformation active */
  const clearTransformation = useCallback(() => {
    setState((s) => ({ ...s, transformation: null }));
  }, []);

  /** Efface un effet magique actif */
  const clearMagic = useCallback(() => {
    setState((s) => ({ ...s, magic: null }));
  }, []);

  return { state, enqueue, clearTransformation, clearMagic };
}
