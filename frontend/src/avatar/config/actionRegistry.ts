/**
 * actionRegistry.ts — Registre des actions / offrandes
 * ─────────────────────────────────────────────────────────────────────────────
 * Pour ajouter une offrande : ajouter une entrée + le fichier asset.
 * Aucun autre code à modifier.
 */

import { AnchorPointName, ProjectileAnimationKey, ReactionType } from '../types/avatarTypes';

export type ActionDefinition = {
  category:           'offer';
  label:              string;
  assetId:            string;         // clé dans avatarRegistry
  targetAnchor:       AnchorPointName;
  projectileAnimation: ProjectileAnimationKey;
  reaction:           ReactionType;
  reactionDurationMs: number;
};

export const actionRegistry: Record<string, ActionDefinition> = {
  coffee: {
    category:            'offer',
    label:               'Café',
    assetId:             'offer_coffee_01',
    targetAnchor:        'mouth',
    projectileAnimation: 'arcToTarget',
    reaction:            'wellbeingSmile',
    reactionDurationMs:  1800,
  },
  beer: {
    category:            'offer',
    label:               'Bière',
    assetId:             'offer_beer_01',
    targetAnchor:        'mouth',
    projectileAnimation: 'arcToTarget',
    reaction:            'slurp',
    reactionDurationMs:  2200,
  },
  rose: {
    category:            'offer',
    label:               'Rose',
    assetId:             'offer_rose_01',
    targetAnchor:        'torso',
    projectileAnimation: 'softFloat',
    reaction:            'romanticReceive',
    reactionDurationMs:  2400,
  },
  letter: {
    category:            'offer',
    label:               'Lettre',
    assetId:             'offer_letter_01',
    targetAnchor:        'torso',
    projectileAnimation: 'glideToTarget',
    reaction:            'readLetter',
    reactionDurationMs:  2800,
  },
};
