/**
 * AvatarRenderer — Assembleur de couches
 * ─────────────────────────────────────────────────────────────────────────────
 * Ordre de rendu (z-index bas → haut) :
 *  1. hairBack
 *  2. head (visage, cou, buste, oreilles)
 *  3. eyes
 *  4. brows
 *  5. nose
 *  6. mouth
 *  7. beard
 *  8. hairFront
 *  9. accessory
 * 10. overlay transformation (optionnel)
 * 11. overlay magie (optionnel)
 * 12. overlay réaction (optionnel)
 */

import React from 'react';
import { View } from 'react-native';
import { AvatarDefinition, MagicType, ReactionType, TransformationType } from '../types/avatarTypes';
import { AvatarLayer } from './AvatarLayer';
import { AvatarReactionLayer } from './AvatarReactionLayer';
import { AvatarTransformationLayer } from './AvatarTransformationLayer';

interface Props {
  avatar:          AvatarDefinition;
  size?:           number;
  transformation?: TransformationType | null;
  magic?:          MagicType | null;
  reaction?:       ReactionType | null;
}

export function AvatarRenderer({
  avatar,
  size = 220,
  transformation = null,
  magic = null,
  reaction = null,
}: Props) {
  const { layers } = avatar;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {/* ── Couches de base (ordre z-index) ─────────────────────────────── */}
      <AvatarLayer assetId={layers.hairBack}   size={size} />
      <AvatarLayer assetId={layers.head}       size={size} />
      <AvatarLayer assetId={layers.eyes}       size={size} />
      <AvatarLayer assetId={layers.brows}      size={size} />
      <AvatarLayer assetId={layers.nose}       size={size} />
      <AvatarLayer assetId={layers.mouth}      size={size} />
      <AvatarLayer assetId={layers.beard}      size={size} />
      <AvatarLayer assetId={layers.hairFront}  size={size} />
      <AvatarLayer assetId={layers.accessory}  size={size} />

      {/* ── Overlays (au-dessus de tout) ─────────────────────────────────── */}
      {transformation && (
        <AvatarTransformationLayer
          transformation={transformation}
          size={size}
        />
      )}

      {reaction && (
        <AvatarReactionLayer reaction={reaction} size={size} />
      )}
    </View>
  );
}
