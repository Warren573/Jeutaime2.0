/**
 * AvatarLayer — Rendu d'un asset SVG ou PNG dans la pile de couches
 * ─────────────────────────────────────────────────────────────────────────────
 * SVG  → SvgUri (react-native-svg) si source est une string URI
 *        ou composant injecté (legacy SVG transformer, natif uniquement)
 * PNG  → Image React Native standard
 */

import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { avatarRegistry } from '../config/avatarRegistry';

interface Props {
  assetId?: string;
  size:     number;
}

export function AvatarLayer({ assetId, size }: Props) {
  if (!assetId) return null;

  const asset = avatarRegistry[assetId];
  if (!asset) return null;

  if (asset.type === 'png') {
    return (
      <Image
        source={asset.source as number | { uri: string }}
        style={[StyleSheet.absoluteFillObject, { width: size, height: size }]}
        resizeMode="contain"
      />
    );
  }

  if (asset.type === 'svg') {
    // Cas URI string (web ou registry migré vers URIs)
    if (typeof asset.source === 'string') {
      return (
        <SvgUri
          uri={asset.source}
          width={size}
          height={size}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }
    // Cas legacy : SVG transformer natif → composant React (function)
    if (typeof asset.source === 'function') {
      const SvgComponent = asset.source as React.FC<{ width: number; height: number; style?: any }>;
      return (
        <SvgComponent
          width={size}
          height={size}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }
  }

  return null;
}

