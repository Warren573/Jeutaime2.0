/**
 * reactionRegistry.ts — Réactions visuelles post-offrande
 * ─────────────────────────────────────────────────────────────────────────────
 * Chaque clé correspond à un OfferReactionKey.
 * L'assetId pointe vers une entrée de avatarRegistry.
 *
 * position : exprimé en % de la taille de l'avatar
 *  - topPercent   : décalage depuis le haut
 *  - rightPercent : décalage depuis la droite
 *  - sizeRatio    : taille du badge = avatarSize × sizeRatio
 */

import type { OfferReactionKey } from '../types/avatarTypes';

export type ReactionDefinition = {
  assetId:  string;
  position: {
    topPercent:   number;
    rightPercent: number;
    sizeRatio:    number;
  };
};

export const reactionRegistry: Record<OfferReactionKey, ReactionDefinition> = {

  wellbeingSmile: {
    assetId:  'reaction_wellbeing_smile_01',
    position: { topPercent: 4, rightPercent: 4, sizeRatio: 0.38 },
  },

  slurp: {
    assetId:  'reaction_slurp_01',
    position: { topPercent: 4, rightPercent: 4, sizeRatio: 0.38 },
  },

  romanticReceive: {
    assetId:  'reaction_romantic_receive_01',
    position: { topPercent: 2, rightPercent: 2, sizeRatio: 0.42 },
  },

  readLetter: {
    assetId:  'reaction_read_letter_01',
    position: { topPercent: 2, rightPercent: 2, sizeRatio: 0.44 },
  },

};
