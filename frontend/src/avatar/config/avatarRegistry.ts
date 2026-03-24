/**
 * avatarRegistry.ts — Registre central de tous les assets visuels
 * ─────────────────────────────────────────────────────────────────────────────
 * RÈGLE : pour remplacer un asset, modifie UNIQUEMENT le fichier dans
 * assets/avatar/<slot>/. Le reste du moteur continue sans modification.
 *
 * Ajouter un asset :
 *  1. Place le fichier .svg ou .png dans assets/avatar/<slot>/
 *  2. Ajoute une entrée ici avec le bon require()
 *  3. C'est tout.
 */

import { AvatarAssetRef } from '../types/avatarTypes';

export const avatarRegistry: Record<string, AvatarAssetRef> = {

  // ── Têtes ────────────────────────────────────────────────────────────────
  head_light_01: {
    id: 'head_light_01',
    type: 'svg',
    source: require('../../../assets/avatar/head/head_light_01.svg'),
  },
  head_tan_01: {
    id: 'head_tan_01',
    type: 'svg',
    source: require('../../../assets/avatar/head/head_tan_01.svg'),
  },

  // ── Yeux ─────────────────────────────────────────────────────────────────
  eyes_soft_brown_01: {
    id: 'eyes_soft_brown_01',
    type: 'svg',
    source: require('../../../assets/avatar/eyes/eyes_soft_brown_01.svg'),
  },
  eyes_soft_green_01: {
    id: 'eyes_soft_green_01',
    type: 'svg',
    source: require('../../../assets/avatar/eyes/eyes_soft_green_01.svg'),
  },

  // ── Sourcils ──────────────────────────────────────────────────────────────
  brows_soft_01: {
    id: 'brows_soft_01',
    type: 'svg',
    source: require('../../../assets/avatar/brows/brows_soft_01.svg'),
  },
  brows_arched_01: {
    id: 'brows_arched_01',
    type: 'svg',
    source: require('../../../assets/avatar/brows/brows_arched_01.svg'),
  },

  // ── Nez ───────────────────────────────────────────────────────────────────
  nose_soft_01: {
    id: 'nose_soft_01',
    type: 'svg',
    source: require('../../../assets/avatar/nose/nose_soft_01.svg'),
  },

  // ── Bouche ────────────────────────────────────────────────────────────────
  mouth_smile_warm_01: {
    id: 'mouth_smile_warm_01',
    type: 'svg',
    source: require('../../../assets/avatar/mouth/mouth_smile_warm_01.svg'),
  },
  mouth_neutral_01: {
    id: 'mouth_neutral_01',
    type: 'svg',
    source: require('../../../assets/avatar/mouth/mouth_neutral_01.svg'),
  },

  // ── Pilosité ──────────────────────────────────────────────────────────────
  beard_none: {
    id: 'beard_none',
    type: 'svg',
    source: require('../../../assets/avatar/beard/beard_none.svg'),
  },
  beard_stubble_dark_01: {
    id: 'beard_stubble_dark_01',
    type: 'svg',
    source: require('../../../assets/avatar/beard/beard_stubble_dark_01.svg'),
  },

  // ── Cheveux arrière ───────────────────────────────────────────────────────
  hair_back_none: {
    id: 'hair_back_none',
    type: 'svg',
    source: require('../../../assets/avatar/hair-back/hair_back_none.svg'),
  },
  hair_back_long_dark_01: {
    id: 'hair_back_long_dark_01',
    type: 'svg',
    source: require('../../../assets/avatar/hair-back/hair_back_long_dark_01.svg'),
  },

  // ── Cheveux avant ─────────────────────────────────────────────────────────
  hair_front_short_dark_01: {
    id: 'hair_front_short_dark_01',
    type: 'svg',
    source: require('../../../assets/avatar/hair-front/hair_front_short_dark_01.svg'),
  },
  hair_front_long_dark_01: {
    id: 'hair_front_long_dark_01',
    type: 'svg',
    source: require('../../../assets/avatar/hair-front/hair_front_long_dark_01.svg'),
  },
  hair_front_bun_dark_01: {
    id: 'hair_front_bun_dark_01',
    type: 'svg',
    source: require('../../../assets/avatar/hair-front/hair_front_bun_dark_01.svg'),
  },

  // ── Réactions d'offrandes ─────────────────────────────────────────────────
  reaction_wellbeing_smile_01: {
    id: 'reaction_wellbeing_smile_01',
    type: 'svg',
    source: require('../../../assets/avatar/reactions/wellbeing_smile_01.svg'),
  },
  reaction_slurp_01: {
    id: 'reaction_slurp_01',
    type: 'svg',
    source: require('../../../assets/avatar/reactions/slurp_01.svg'),
  },
  reaction_romantic_receive_01: {
    id: 'reaction_romantic_receive_01',
    type: 'svg',
    source: require('../../../assets/avatar/reactions/romantic_receive_01.svg'),
  },
  reaction_read_letter_01: {
    id: 'reaction_read_letter_01',
    type: 'svg',
    source: require('../../../assets/avatar/reactions/read_letter_01.svg'),
  },

  // ── Accessoires ───────────────────────────────────────────────────────────
  accessory_none: {
    id: 'accessory_none',
    type: 'svg',
    source: require('../../../assets/avatar/accessory/accessory_none.svg'),
  },
  accessory_earring_gold_01: {
    id: 'accessory_earring_gold_01',
    type: 'svg',
    source: require('../../../assets/avatar/accessory/accessory_earring_gold_01.svg'),
  },
  accessory_glasses_round_01: {
    id: 'accessory_glasses_round_01',
    type: 'svg',
    source: require('../../../assets/avatar/accessory/accessory_glasses_round_01.svg'),
  },
};
