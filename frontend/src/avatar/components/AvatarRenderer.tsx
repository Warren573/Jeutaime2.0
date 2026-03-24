/**
 * AvatarRenderer — Assembleur de couches visuelles
 * ─────────────────────────────────────────────────────────────────────────────
 * Rend uniquement les couches de base de l'avatar (pas de transformation
 * ni d'effet magique — gérés par AvatarTransformationLayer / AvatarEffectLayer).
 *
 * Ordre de rendu (z-index bas → haut) :
 *  1. hairBack
 *  2. head
 *  3. eyes
 *  4. brows
 *  5. nose
 *  6. mouth
 *  7. beard
 *  8. hairFront
 *  9. accessory
 */

import React from 'react';
import { View } from 'react-native';
import { AvatarDefinition } from '../types/avatarTypes';
import { AvatarLayer } from './AvatarLayer';

interface Props {
  avatar: AvatarDefinition;
  size?:  number;
}

export function AvatarRenderer({ avatar, size = 220 }: Props) {
  const { layers } = avatar;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <AvatarLayer assetId={layers.hairBack}  size={size} />
      <AvatarLayer assetId={layers.head}      size={size} />
      <AvatarLayer assetId={layers.eyes}      size={size} />
      <AvatarLayer assetId={layers.brows}     size={size} />
      <AvatarLayer assetId={layers.nose}      size={size} />
      <AvatarLayer assetId={layers.mouth}     size={size} />
      <AvatarLayer assetId={layers.beard}     size={size} />
      <AvatarLayer assetId={layers.hairFront} size={size} />
      <AvatarLayer assetId={layers.accessory} size={size} />
    </View>
  );
}
