/**
 * useAvatarEffects
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestion des effets actifs par participant dans les salons.
 *
 * Catégories :
 *  - offering        : offrande visible (badge temporaire)
 *  - transformation  : une seule active à la fois, remplace la précédente
 *  - visual_effect   : couche visuelle (aura, étincelles…), max 3 simultanées
 *
 * Chaque effet a un timer d'expiration. Un setInterval nettoie toutes les
 * secondes. Une transformation peut être rompue via breakEffect().
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EffectCategory = 'offering' | 'transformation' | 'visual_effect';

export interface ActiveEffect {
  id: string;
  participantId: string;
  category: EffectCategory;
  powerId: string;           // id dans offerings.ts / powers.ts
  emoji: string;
  label: string;
  expiresAt: number;
  breakConditionId?: string; // powerId qui brise cet effet
  breakHint?: string;        // texte affiché sous l'avatar ("Un bisou pour libérer 💋")
  stackPriority: number;     // plus élevé = affiché par-dessus
}

export type EffectsMap = Record<string, ActiveEffect[]>; // participantId → effets actifs

// ─── Max par catégorie ────────────────────────────────────────────────────────

const MAX_VISUAL_EFFECTS = 3;
const MAX_OFFERINGS_BADGES = 6;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAvatarEffects() {
  const [effects, setEffects] = useState<EffectsMap>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Nettoyage des effets expirés — toutes les secondes
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = Date.now();
      setEffects(prev => {
        const next: EffectsMap = {};
        let changed = false;
        for (const pid in prev) {
          const active = prev[pid].filter(e => e.expiresAt > now);
          if (active.length !== prev[pid].length) changed = true;
          next[pid] = active;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  /**
   * Appliquer un effet sur un participant.
   * Règles :
   *  - transformation : remplace toute transformation existante
   *  - visual_effect : max MAX_VISUAL_EFFECTS, ignore si déjà au max
   *  - offering : max MAX_OFFERINGS_BADGES, écrase le plus vieux
   */
  const applyEffect = useCallback(
    (effect: Omit<ActiveEffect, 'id'>): string => {
      const id = `${effect.participantId}_${effect.powerId}_${Date.now()}`;
      setEffects(prev => {
        const existing = prev[effect.participantId] ?? [];

        let next: ActiveEffect[];

        if (effect.category === 'transformation') {
          // Une seule transformation active
          next = [
            ...existing.filter(e => e.category !== 'transformation'),
            { ...effect, id },
          ];
        } else if (effect.category === 'visual_effect') {
          const currentVFX = existing.filter(e => e.category === 'visual_effect');
          if (currentVFX.length >= MAX_VISUAL_EFFECTS) {
            // Remplace le plus ancien
            const oldest = currentVFX.reduce((a, b) => (a.expiresAt < b.expiresAt ? a : b));
            next = [
              ...existing.filter(e => e.id !== oldest.id),
              { ...effect, id },
            ];
          } else {
            next = [...existing, { ...effect, id }];
          }
        } else {
          // offering — bague tournante, max 6
          const currentOfferings = existing.filter(e => e.category === 'offering');
          if (currentOfferings.length >= MAX_OFFERINGS_BADGES) {
            const oldest = currentOfferings.reduce((a, b) => (a.expiresAt < b.expiresAt ? a : b));
            next = [
              ...existing.filter(e => e.id !== oldest.id),
              { ...effect, id },
            ];
          } else {
            next = [...existing, { ...effect, id }];
          }
        }

        return { ...prev, [effect.participantId]: next };
      });
      return id;
    },
    []
  );

  /**
   * Rompre un effet (condition de rupture déclenchée).
   * breakConditionId = powerId utilisé comme "clé de brisure"
   * (ex: 'break_kiss' brise la grenouille).
   */
  const breakEffect = useCallback(
    (participantId: string, breakConditionId: string) => {
      setEffects(prev => ({
        ...prev,
        [participantId]: (prev[participantId] ?? []).filter(
          e => e.breakConditionId !== breakConditionId
        ),
      }));
    },
    []
  );

  /** Supprimer tous les effets d'un participant (ex: quitte le salon) */
  const clearParticipant = useCallback((participantId: string) => {
    setEffects(prev => {
      const next = { ...prev };
      delete next[participantId];
      return next;
    });
  }, []);

  /** Effets actifs pour un participant donné */
  const getParticipantEffects = useCallback(
    (participantId: string): ActiveEffect[] => effects[participantId] ?? [],
    [effects]
  );

  /** Transformation active d'un participant (ou undefined) */
  const getTransformation = useCallback(
    (participantId: string): ActiveEffect | undefined =>
      (effects[participantId] ?? []).find(e => e.category === 'transformation'),
    [effects]
  );

  return {
    effects,
    applyEffect,
    breakEffect,
    clearParticipant,
    getParticipantEffects,
    getTransformation,
  };
}
