/**
 * AvatarTransformationLayer — Overlay de transformation
 * ─────────────────────────────────────────────────────────────────────────────
 * Affiche un overlay visuel par-dessus l'avatar (pirate, fantôme, statue…).
 * Remplacé par asset SVG/PNG quand les illustrations sont disponibles.
 * En attendant : affiche un émoji + badge de durée si défini.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { TransformationType } from '../types/avatarTypes';

interface Props {
  transformation: TransformationType;
  size:           number;
  /** Texte de durée restante à afficher (ex: "2h restantes") */
  durationLabel?: string;
}

const TRANSFORMATION_DISPLAY: Record<TransformationType, { emoji: string; label: string }> = {
  pirate: { emoji: '🏴‍☠️', label: 'Pirate'    },
  ghost:  { emoji: '👻',   label: 'Fantôme'   },
  statue: { emoji: '🗿',   label: 'Statue'    },
  frog:   { emoji: '🐸',   label: 'Grenouille' },
};

export function AvatarTransformationLayer({ transformation, size, durationLabel }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue:         0.82,
      duration:        400,
      useNativeDriver: true,
    }).start();
  }, [transformation, opacity]);

  const { emoji } = TRANSFORMATION_DISPLAY[transformation];

  return (
    <Animated.View
      style={{
        ...require('react-native').StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(20,12,30,0.55)',
        borderRadius:    size / 2,
        alignItems:      'center',
        justifyContent:  'center',
        opacity,
      }}
    >
      <Text style={{ fontSize: size * 0.38 }}>{emoji}</Text>
      {durationLabel && (
        <View style={{
          marginTop:       size * 0.04,
          backgroundColor: 'rgba(255,255,255,0.18)',
          borderRadius:    20,
          paddingHorizontal: 8,
          paddingVertical:   2,
        }}>
          <Text style={{ color: '#fff', fontSize: size * 0.1, fontWeight: '600' }}>
            {durationLabel}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
