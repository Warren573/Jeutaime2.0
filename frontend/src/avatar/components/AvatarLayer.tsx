/**
 * AvatarLayer — Rendu d'un asset SVG ou PNG dans la pile de couches
 * ─────────────────────────────────────────────────────────────────────────────
 * SVG  → composant importé via react-native-svg-transformer
 * PNG  → Image React Native standard
 */

import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { avatarRegistry } from '../config/avatarRegistry';

interface Props {
  assetId?: string;
  size:     number;
}

export function AvatarLayer({ assetId, size }: Props) {
  if (!assetId) return null;

  const asset = avatarRegistry[assetId];
  if (!asset) return null;

  if (asset.type === 'svg') {
    // SVG importé par react-native-svg-transformer → composant React
    const SvgComponent = asset.source as React.FC<{ width: number; height: number; style?: any }>;
    return (
      <SvgComponent
        width={size}
        height={size}
        style={StyleSheet.absoluteFillObject}
      />
    );
  }

  if (asset.type === 'png') {
    return (
      <Image
        source={asset.source as number | { uri: string }}
        style={[StyleSheet.absoluteFillObject, { width: size, height: size }]}
        resizeMode="contain"
      />
    );
  }

  return null;
}
