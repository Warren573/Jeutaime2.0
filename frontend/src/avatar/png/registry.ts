/**
 * registry.ts — Registre des assets PNG de l'avatar modulaire.
 * ─────────────────────────────────────────────────────────────────────────────
 * Chaque entrée mappe un ID string vers un `require()` de PNG.
 * Tous les assets sont des PNG 512×512 transparents, alignés pixel-perfect.
 *
 * ─── COMMENT AJOUTER UN ASSET ────────────────────────────────────────────────
 * 1. Dépose le fichier dans le bon dossier :
 *      assets/avatar/<slot>/<id>.png
 *
 * 2. Ajoute une ligne dans la section correspondante :
 *      '<id>': require('../../../assets/avatar/<slot>/<id>.png'),
 *
 * 3. Utilise l'ID dans les props d'<Avatar> :
 *      <Avatar hair="hair_01" />
 *
 * ─── STRUCTURE DES DOSSIERS ──────────────────────────────────────────────────
 *   assets/avatar/
 *     base/           body.png, head.png
 *     clothes/        clothes_01.png, clothes_02.png…
 *     nose/           nose_01.png, nose_02.png…
 *     mouth/          mouth_01.png, mouth_02.png…
 *     pilosite/       beard_01.png, mustache_01.png…
 *     hair/           hair_01.png, hair_02.png…
 *     earrings/       earrings_01.png…
 *     accessories/    glasses_01.png, hat_01.png…
 *     effects/        glow_01.png, sparkles_01.png…
 *     transformations/ ghost_01.png, pirate_01.png…
 */

import type { ImageSourcePropType } from 'react-native';

// ─── Type ─────────────────────────────────────────────────────────────────────

type AssetMap = Record<string, ImageSourcePropType>;

// ─── Registre ─────────────────────────────────────────────────────────────────
// Décommentez chaque ligne au fur et à mesure que vous ajoutez les fichiers PNG.

const assets: AssetMap = {

  // ── Base (body + head — toujours présents) ─────────────────────────────────
  // 'body_default':   require('../../../assets/avatar/base/body.png'),
  // 'head_default':   require('../../../assets/avatar/base/head.png'),

  // ── Vêtements ──────────────────────────────────────────────────────────────
  // 'clothes_01':     require('../../../assets/avatar/clothes/clothes_01.png'),
  // 'clothes_02':     require('../../../assets/avatar/clothes/clothes_02.png'),

  // ── Nez ────────────────────────────────────────────────────────────────────
  // 'nose_01':        require('../../../assets/avatar/nose/nose_01.png'),
  // 'nose_02':        require('../../../assets/avatar/nose/nose_02.png'),

  // ── Bouche ─────────────────────────────────────────────────────────────────
  // 'mouth_01':       require('../../../assets/avatar/mouth/mouth_01.png'),
  // 'mouth_02':       require('../../../assets/avatar/mouth/mouth_02.png'),

  // ── Pilosité (barbe, moustache…) ───────────────────────────────────────────
  // 'beard_01':       require('../../../assets/avatar/pilosite/beard_01.png'),
  // 'mustache_01':    require('../../../assets/avatar/pilosite/mustache_01.png'),

  // ── Cheveux ────────────────────────────────────────────────────────────────
  // 'hair_01':        require('../../../assets/avatar/hair/hair_01.png'),
  // 'hair_02':        require('../../../assets/avatar/hair/hair_02.png'),

  // ── Boucles d'oreilles ─────────────────────────────────────────────────────
  // 'earrings_01':    require('../../../assets/avatar/earrings/earrings_01.png'),

  // ── Accessoires ────────────────────────────────────────────────────────────
  // 'glasses_01':     require('../../../assets/avatar/accessories/glasses_01.png'),
  // 'hat_01':         require('../../../assets/avatar/accessories/hat_01.png'),

  // ── Effets ─────────────────────────────────────────────────────────────────
  // 'glow_01':        require('../../../assets/avatar/effects/glow_01.png'),
  // 'sparkles_01':    require('../../../assets/avatar/effects/sparkles_01.png'),

  // ── Transformations ────────────────────────────────────────────────────────
  // 'ghost_01':       require('../../../assets/avatar/transformations/ghost_01.png'),
  // 'pirate_01':      require('../../../assets/avatar/transformations/pirate_01.png'),
  // 'frog_01':        require('../../../assets/avatar/transformations/frog_01.png'),

};

// ─── Accès ────────────────────────────────────────────────────────────────────

/**
 * Retourne la source PNG pour un ID donné.
 * Retourne `null` si l'ID est absent, vide, ou non enregistré.
 *
 * @example
 *   const src = getAsset('hair_01');
 *   if (src) <Image source={src} ... />
 */
export function getAsset(id: string | null | undefined): ImageSourcePropType | null {
  if (!id) return null;
  return assets[id] ?? null;
}

/** Liste tous les IDs enregistrés (utile pour les sélecteurs). */
export function listAssets(): string[] {
  return Object.keys(assets);
}
