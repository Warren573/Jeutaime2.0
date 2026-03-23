/**
 * AvatarCircle — rendu circulaire de l'avatar SVG, prêt à l'emploi partout
 * ─────────────────────────────────────────────────────────────────────────────
 * Crop et zoom automatiques pour centrer le visage dans le cercle.
 * Le ViewBox SVG est 240×300 — on montre y=55 à y=255 (la zone tête+cou).
 *
 * Usage :
 *   <AvatarCircle config={avatarConfig} size={80} />
 */

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { AvatarRenderer } from './AvatarRenderer';
import { AvatarConfig, DEFAULT_AVATAR } from '../../types/avatar';

interface Props {
  config?:    AvatarConfig;   // si undefined → avatar par défaut
  size:       number;          // diamètre du cercle en px
  style?:     ViewStyle;
  borderColor?: string;
  borderWidth?: number;
  shadow?:    boolean;
}

export function AvatarCircle({
  config = DEFAULT_AVATAR,
  size,
  style,
  borderColor = '#FFF',
  borderWidth = 2.5,
  shadow      = true,
}: Props) {
  // ── Calcul du crop ────────────────────────────────────────────────────────
  // On veut afficher SVG y∈[55, 255] dans une fenêtre `size` px de haut.
  // renderHeight = size * (300 / 200) = size * 1.5  (200 = 255-55)
  // topOffset    = -(55 / 300) * renderHeight = -0.275 * size
  // renderWidth  = renderHeight * (240/300)   = size * 1.2
  // leftOffset   = -(renderWidth - size) / 2  = -0.1 * size
  const renderHeight = size * 1.5;
  const renderWidth  = renderHeight * (240 / 300);   // = size * 1.2
  const topOffset    = -0.275 * size;
  const leftOffset   = -(renderWidth - size) / 2;    // = -0.1 * size

  return (
    <View
      style={[
        styles.circle,
        {
          width:        size,
          height:       size,
          borderRadius: size / 2,
          borderColor,
          borderWidth,
        },
        shadow && styles.shadow,
        style,
      ]}
    >
      <View
        style={{
          position: 'absolute',
          top:  topOffset,
          left: leftOffset,
        }}
      >
        <AvatarRenderer config={config} size={renderHeight} />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  circle: {
    overflow:        'hidden',
    backgroundColor: '#F5EDE6',
  },
  shadow: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius:  6,
    elevation:     5,
  },
});
