/**
 * defaults.ts — Configurations avatar par défaut.
 * ─────────────────────────────────────────────────────────────────────────────
 * Ces presets sont utilisés partout dans l'app comme fallback quand
 * un avatar personnalisé n'est pas encore défini.
 *
 * Tous les IDs font référence à des assets enregistrés dans registry.ts.
 * Avant qu'un PNG soit ajouté + enregistré, la couche correspondante
 * est silencieusement ignorée (pas de crash).
 */

import type { AvatarProps } from './Avatar';

/** Props avatar sans `size` (utilisable en spread sur <Avatar>). */
export type AvatarConfig = Omit<AvatarProps, 'size'>;

// ─── Preset neutre ────────────────────────────────────────────────────────────

/** Config par défaut — neutre, aucun accessoire, aucun effet. */
export const DEFAULT_AVATAR: AvatarConfig = {
  body:           'body_default',
  head:           'head_default',
  clothes:        null,
  nose:           'nose_01',
  mouth:          'mouth_01',
  pilosite:       null,
  hair:           'hair_01',
  earrings:       null,
  accessory:      null,
  effects:        [],
  transformation: null,
};

// ─── Presets genrés ──────────────────────────────────────────────────────────

/** Config par défaut féminine — cheveux longs, boucles d'oreilles. */
export const DEFAULT_AVATAR_FEMALE: AvatarConfig = {
  ...DEFAULT_AVATAR,
  hair:     'hair_01',
  earrings: 'earrings_01',
};

/** Config par défaut masculine — cheveux courts, barbe légère. */
export const DEFAULT_AVATAR_MALE: AvatarConfig = {
  ...DEFAULT_AVATAR,
  hair:     'hair_02',
  pilosite: 'beard_01',
};
