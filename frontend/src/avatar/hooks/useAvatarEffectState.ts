/**
 * useAvatarEffectState — gestion des effets temporaires d'un avatar.
 * ─────────────────────────────────────────────────────────────────────────────
 * Gère en un seul hook :
 *   - Des effets magiques multiples simultanés, avec expiration optionnelle.
 *   - Une transformation active (scalaire), avec expiration optionnelle.
 *
 * Usage typique (profil ou salon) :
 *
 *   const { activeEffects, activeTransformation, addEffect, applyTransformation } =
 *     useAvatarEffectState();
 *
 *   // Ajouter un halo pendant 2 minutes
 *   addEffect('halo', 2 * 60 * 1000);
 *
 *   // Ajouter une pluie permanente (jusqu'à clearAllEffects ou removeEffect)
 *   addEffect('rain');
 *
 *   // Transformer en rockstar pendant 45 minutes
 *   applyTransformation('rockstar', 45 * 60 * 1000);
 *
 *   // Brancher sur Avatar
 *   <Avatar
 *     avatar={myAvatar}
 *     activeEffects={activeEffects}
 *     transformation={activeTransformation}
 *   />
 *
 * Garanties :
 *   - Un seul timer par effet actif → pas de fuite mémoire.
 *   - Remplacer un effet (même type) annule l'ancien timer et démarre le nouveau.
 *   - Les effets expirés sont retirés automatiquement (pas de résidu en state).
 */

import { useCallback, useEffect, useState } from 'react';
import type { MagicType, TransformationType } from '../types/avatarTypes';

// ─── Types internes ───────────────────────────────────────────────────────────

/** Clé = type d'effet, valeur = timestamp d'expiration (undefined = permanent). */
type EffectExpiryMap = Partial<Record<MagicType, number | undefined>>;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAvatarEffectState() {

  // ── Effets magiques ────────────────────────────────────────────────────────

  const [expiryMap, setExpiryMap] = useState<EffectExpiryMap>({});

  /**
   * Chaque changement de la map relance les timers.
   * Cleanup → tous les anciens timers annulés → nouveaux timers pour
   * chaque effet qui a une date d'expiration valide.
   */
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();

    (Object.entries(expiryMap) as [MagicType, number | undefined][]).forEach(([type, expiresAt]) => {
      if (expiresAt === undefined) return;         // permanent, aucun timer
      const remaining = expiresAt - now;
      if (remaining <= 0) {
        // Effet déjà expiré : nettoyage immédiat (ex. montage avec state persisté)
        setExpiryMap(prev => { const { [type]: _, ...rest } = prev; return rest; });
        return;
      }
      timers.push(
        setTimeout(() => {
          setExpiryMap(prev => { const { [type]: _, ...rest } = prev; return rest; });
        }, remaining),
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [expiryMap]);

  /**
   * Active ou remplace un effet magique.
   * @param type       'halo' | 'rain' | 'ghost'
   * @param durationMs Durée en ms. Absent = permanent.
   */
  const addEffect = useCallback((type: MagicType, durationMs?: number) => {
    setExpiryMap(prev => ({
      ...prev,
      [type]: durationMs !== undefined ? Date.now() + durationMs : undefined,
    }));
  }, []);

  /** Retire immédiatement un effet sans attendre l'expiration. */
  const removeEffect = useCallback((type: MagicType) => {
    setExpiryMap(prev => {
      const { [type]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /** Retire tous les effets. */
  const clearAllEffects = useCallback(() => setExpiryMap({}), []);

  /** Liste des effets actuellement actifs (utilisé directement dans <Avatar>). */
  const activeEffects: MagicType[] = Object.keys(expiryMap) as MagicType[];

  // ── Transformation (scalaire : une seule à la fois) ────────────────────────

  const [transformation,  setTransformation]  = useState<TransformationType | null>(null);
  const [transExpiresAt,  setTransExpiresAt]  = useState<number | null>(null);
  const [isTransActive,   setIsTransActive]   = useState(false);

  useEffect(() => {
    if (!transExpiresAt) return;
    const remaining = transExpiresAt - Date.now();
    if (remaining <= 0) { setIsTransActive(false); return; }
    setIsTransActive(true);
    const t = setTimeout(() => setIsTransActive(false), remaining);
    return () => clearTimeout(t);
  }, [transExpiresAt]);

  /**
   * Applique une transformation.
   * @param type       'pirate' | 'rockstar' | 'invisible' | 'donkey' | …
   * @param durationMs Durée en ms. Absent = permanente jusqu'au prochain appel.
   */
  const applyTransformation = useCallback((
    type: TransformationType,
    durationMs?: number,
  ) => {
    setTransformation(type);
    setIsTransActive(true);
    setTransExpiresAt(durationMs !== undefined ? Date.now() + durationMs : null);
  }, []);

  /** Retire la transformation active immédiatement. */
  const clearTransformation = useCallback(() => {
    setTransformation(null);
    setIsTransActive(false);
    setTransExpiresAt(null);
  }, []);

  /** Transformation effective (null si expirée ou clearTransformation appelé). */
  const activeTransformation: TransformationType | null = isTransActive ? transformation : null;

  // ── Retour ────────────────────────────────────────────────────────────────

  return {
    // Effets magiques
    activeEffects,
    addEffect,
    removeEffect,
    clearAllEffects,

    // Transformation
    activeTransformation,
    applyTransformation,
    clearTransformation,
  };
}
