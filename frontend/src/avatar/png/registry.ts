/**
 * registry.ts — Registre des assets PNG de l'avatar modulaire.
 * ─────────────────────────────────────────────────────────────────────────────
 * Chaque entrée mappe un ID string vers un `require()` de PNG.
 * Tous les assets sont des PNG transparents, alignés pixel-perfect.
 *
 * ─── COMMENT AJOUTER UN ASSET ────────────────────────────────────────────────
 * 1. Dépose le fichier dans le bon dossier :
 *      assets/avatar/<slot>/<id>.png
 *
 * 2. Décommente (ou ajoute) la ligne correspondante ci-dessous.
 *
 * 3. Utilise l'ID dans les props d'<Avatar> :
 *      <Avatar hair="hair_01" />
 *
 * ─── REMPLACER UN PLACEHOLDER PAR LE VRAI ASSET ─────────────────────────────
 * Dépose simplement le vrai PNG à la même adresse de fichier.
 * Le require() est résolu à la compilation — pas besoin de modifier ce fichier.
 *
 * ─── STRUCTURE DES DOSSIERS ──────────────────────────────────────────────────
 *   assets/avatar/
 *     base/           body.png, head.png
 *     hair/           hair_01.png … hair_06.png
 *     nose/           nose_01.png … nose_04.png
 *     mouth/          mouth_01.png … mouth_04.png
 *     pilosite/       beard_01.png, beard_02.png, mustache_01.png
 *     clothes/        clothes_01.png … clothes_04.png
 *     earrings/       earrings_01.png … earrings_03.png
 *     accessories/    glasses_01.png, glasses_02.png, hat_01.png, crown_01.png
 *     effects/        glow_01.png, sparkles_01.png…
 *     transformations/ ghost_01.png, pirate_01.png…
 */

import type { ImageSourcePropType } from 'react-native';

// ─── Type ─────────────────────────────────────────────────────────────────────

type AssetMap = Record<string, ImageSourcePropType>;

// ─── Registre ─────────────────────────────────────────────────────────────────

const assets: AssetMap = {

  // ── Base (body + head — socle de tout avatar) ──────────────────────────────
  'body_default':   require('../../../assets/avatar/base/body.png'),
  'head_default':   require('../../../assets/avatar/base/head.png'),

  // ── Cheveux ────────────────────────────────────────────────────────────────
  'hair_01':        require('../../../assets/avatar/hair/hair_01.png'),
  'hair_02':        require('../../../assets/avatar/hair/hair_02.png'),
  'hair_03':        require('../../../assets/avatar/hair/hair_03.png'),
  'hair_04':        require('../../../assets/avatar/hair/hair_04.png'),
  'hair_05':        require('../../../assets/avatar/hair/hair_05.png'),
  'hair_06':        require('../../../assets/avatar/hair/hair_06.png'),
  'hair_07':        require('../../../assets/avatar/hair/hair_07.png'),
  'hair_08':        require('../../../assets/avatar/hair/hair_08.png'),
  'hair_09':        require('../../../assets/avatar/hair/hair_09.png'),
  'hair_10':        require('../../../assets/avatar/hair/hair_10.png'),
  'hair_11':        require('../../../assets/avatar/hair/hair_11.png'),
  'hair_12':        require('../../../assets/avatar/hair/hair_12.png'),
  'hair_13':        require('../../../assets/avatar/hair/hair_13.png'),
  'hair_14':        require('../../../assets/avatar/hair/hair_14.png'),

  // ── Nez ────────────────────────────────────────────────────────────────────
  'nose_01':        require('../../../assets/avatar/nose/nose_01.png'),
  'nose_02':        require('../../../assets/avatar/nose/nose_02.png'),
  'nose_03':        require('../../../assets/avatar/nose/nose_03.png'),
  'nose_04':        require('../../../assets/avatar/nose/nose_04.png'),
  'nose_05':        require('../../../assets/avatar/nose/nose_05.png'),
  'nose_06':        require('../../../assets/avatar/nose/nose_06.png'),

  // ── Bouche ─────────────────────────────────────────────────────────────────
  'mouth_01':       require('../../../assets/avatar/mouth/mouth_01.png'),
  'mouth_02':       require('../../../assets/avatar/mouth/mouth_02.png'),
  'mouth_03':       require('../../../assets/avatar/mouth/mouth_03.png'),
  'mouth_04':       require('../../../assets/avatar/mouth/mouth_04.png'),
  'mouth_05':       require('../../../assets/avatar/mouth/mouth_05.png'),
  'mouth_06':       require('../../../assets/avatar/mouth/mouth_06.png'),
  'mouth_07':       require('../../../assets/avatar/mouth/mouth_07.png'),

  // ── Pilosité ───────────────────────────────────────────────────────────────
  'beard_01':       require('../../../assets/avatar/pilosite/beard_01.png'),
  'beard_02':       require('../../../assets/avatar/pilosite/beard_02.png'),
  'beard_03':       require('../../../assets/avatar/pilosite/beard_03.png'),
  'beard_04':       require('../../../assets/avatar/pilosite/beard_04.png'),
  'mustache_01':    require('../../../assets/avatar/pilosite/mustache_01.png'),

  // ── Vêtements ──────────────────────────────────────────────────────────────
  'clothes_01':     require('../../../assets/avatar/clothes/clothes_01.png'),
  'clothes_02':     require('../../../assets/avatar/clothes/clothes_02.png'),
  'clothes_03':     require('../../../assets/avatar/clothes/clothes_03.png'),
  'clothes_04':     require('../../../assets/avatar/clothes/clothes_04.png'),
  'clothes_05':     require('../../../assets/avatar/clothes/clothes_05.png'),
  'clothes_06':     require('../../../assets/avatar/clothes/clothes_06.png'),
  'clothes_07':     require('../../../assets/avatar/clothes/clothes_07.png'),
  'clothes_08':     require('../../../assets/avatar/clothes/clothes_08.png'),
  'clothes_09':     require('../../../assets/avatar/clothes/clothes_09.png'),
  'clothes_10':     require('../../../assets/avatar/clothes/clothes_10.png'),
  'clothes_11':     require('../../../assets/avatar/clothes/clothes_11.png'),
  'clothes_12':     require('../../../assets/avatar/clothes/clothes_12.png'),
  'clothes_13':     require('../../../assets/avatar/clothes/clothes_13.png'),
  'clothes_14':     require('../../../assets/avatar/clothes/clothes_14.png'),
  'clothes_15':     require('../../../assets/avatar/clothes/clothes_15.png'),
  'clothes_16':     require('../../../assets/avatar/clothes/clothes_16.png'),
  'clothes_17':     require('../../../assets/avatar/clothes/clothes_17.png'),
  'clothes_18':     require('../../../assets/avatar/clothes/clothes_18.png'),
  'clothes_19':     require('../../../assets/avatar/clothes/clothes_19.png'),
  'clothes_20':     require('../../../assets/avatar/clothes/clothes_20.png'),

  // ── Boucles d'oreilles ─────────────────────────────────────────────────────
  'earrings_01':    require('../../../assets/avatar/earrings/earrings_01.png'), // Dorées
  'earrings_02':    require('../../../assets/avatar/earrings/earrings_02.png'), // Argentées
  'earrings_03':    require('../../../assets/avatar/earrings/earrings_03.png'), // Perles

  // ── Accessoires ────────────────────────────────────────────────────────────
  'glasses_01':     require('../../../assets/avatar/accessories/glasses_01.png'), // Lunettes
  'glasses_02':     require('../../../assets/avatar/accessories/glasses_02.png'), // Lunettes soleil
  'hat_01':         require('../../../assets/avatar/accessories/hat_01.png'),     // Chapeau
  'crown_01':       require('../../../assets/avatar/accessories/crown_01.png'),   // Couronne

  // ── Effets (ajouter les PNG puis décommenter) ──────────────────────────────
  // 'glow_01':     require('../../../assets/avatar/effects/glow_01.png'),
  // 'sparkles_01': require('../../../assets/avatar/effects/sparkles_01.png'),

  // ── Transformations (ajouter les PNG puis décommenter) ────────────────────
  // 'ghost_01':    require('../../../assets/avatar/transformations/ghost_01.png'),
  // 'pirate_01':   require('../../../assets/avatar/transformations/pirate_01.png'),
  // 'frog_01':     require('../../../assets/avatar/transformations/frog_01.png'),

};

// ─── Accès ────────────────────────────────────────────────────────────────────

/**
 * Retourne la source PNG pour un ID donné.
 * Retourne `null` si l'ID est absent, vide, ou non enregistré.
 * Log en console si l'ID est inconnu (aide au debug pendant le développement).
 */
export function getAsset(id: string | null | undefined): ImageSourcePropType | null {
  if (!id) return null;
  const source = assets[id] ?? null;
  if (!source) {
    console.warn(`[Avatar registry] asset manquant: "${id}"`);
  }
  return source;
}

/** Liste tous les IDs enregistrés (utile pour les sélecteurs). */
export function listAssets(): string[] {
  return Object.keys(assets);
}
