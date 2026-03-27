/**
 * haptics.ts — Utilitaire haptics pour les interactions du salon
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps expo-haptics avec :
 *  - Guard web (Platform.OS === 'web' → no-op)
 *  - Mapping par famille d'offrande
 *  - Fonctions pures, pas de React
 *
 * Mapping MVP :
 *  hotDrink  : envoi=selection (subtil), impact=Light (chaleureux)
 *  alcohol   : envoi=selection,          impact=Medium (dynamique)
 *  symbolic  : envoi=selection (délicat), impact=Light (doux)
 *
 * Les fonctions sont fire-and-forget : jamais await, jamais de catch visible.
 * → Ne bloque pas l'UI, ne propage pas d'erreurs.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import type { OfferFamily } from '../types/avatarTypes';

// ── Guard ───────────────────────────────────────────────────────────────────

const isNative = Platform.OS !== 'web';

function safely(fn: () => Promise<void>): void {
  if (!isNative) return;
  fn().catch(() => {
    // Silencieux : l'appareil peut ne pas supporter les haptics
  });
}

// ── API publique ─────────────────────────────────────────────────────────────

/**
 * Haptic de départ : déclenché quand l'offrande est envoyée.
 * Identique pour toutes les familles — léger, discret.
 */
export function triggerOfferSend(_family: OfferFamily): void {
  safely(() => Haptics.selectionAsync());
}

/**
 * Haptic d'impact : déclenché quand le projectile atteint l'avatar.
 * Varie selon la famille pour renforcer le ressenti.
 */
export function triggerOfferImpact(family: OfferFamily): void {
  switch (family) {
    case 'hotDrink':
      safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      break;
    case 'alcohol':
      safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
      break;
    case 'symbolic':
      safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      break;
  }
}
