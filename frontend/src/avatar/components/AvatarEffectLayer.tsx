/**
 * AvatarEffectLayer — Couche d'overlay pour les effets magiques
 * ─────────────────────────────────────────────────────────────────────────────
 * Affiche un ou plusieurs assets superposés selon le magicRegistry.
 * Animations :
 *   pulseGlow  (halo)  → légère pulsation de scale
 *   rainFall   (rain)  → oscillation verticale des gouttes
 *   ghostFloat (ghost) → fondu cyclique d'opacité
 *
 * Usage dans SalonAvatarCard :
 *   <AvatarEffectLayer magic={magic} avatarSize={size} />
 *
 * Pour remplacer un effet : changer le SVG dans assets/avatar/magic/.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import type { MagicType } from '../types/avatarTypes';
import { magicRegistry } from '../config/magicRegistry';
import { AvatarLayer } from './AvatarLayer';

interface Props {
  magic:          MagicType | null | undefined;
  avatarSize:     number;
  /** Filtre de couche : ne rend que si l'effet correspond à ce zLayer */
  zLayerFilter?:  'behind' | 'front';
}

export function AvatarEffectLayer({ magic, avatarSize, zLayerFilter }: Props) {
  const opacity    = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Arrêter toutes les animations précédentes
    opacity.stopAnimation();
    translateY.stopAnimation();
    scale.stopAnimation();
    opacity.setValue(1);
    translateY.setValue(0);
    scale.setValue(1);

    if (!magic) return;

    const def = magicRegistry[magic];
    if (!def) return;

    let loop: Animated.CompositeAnimation;

    if (def.animationKey === 'pulseGlow') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.045, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1,     duration: 900, useNativeDriver: true }),
        ]),
      );
    } else if (def.animationKey === 'rainFall') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, { toValue: 5, duration: 420, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 420, useNativeDriver: true }),
        ]),
      );
    } else {
      // ghostFloat
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.68, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1,    duration: 1000, useNativeDriver: true }),
        ]),
      );
    }

    loop.start();
    return () => loop.stop();
  }, [magic, opacity, translateY, scale]);

  if (!magic) return null;

  const def = magicRegistry[magic];
  if (!def) return null;

  // Ne rien rendre si le filtre de couche ne correspond pas
  if (zLayerFilter && def.zLayer !== zLayerFilter) return null;

  const effectSize = avatarSize * def.position.sizeRatio;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width:    effectSize,
        height:   effectSize,
        top:      `${def.position.topOffsetPercent}%`,
        left:     `${def.position.leftOffsetPercent}%`,
        zIndex:   def.zLayer === 'behind' ? 0 : 100,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      {def.assetIds.map((assetId) => (
        <View
          key={assetId}
          style={{ position: 'absolute', width: effectSize, height: effectSize }}
        >
          <AvatarLayer assetId={assetId} size={effectSize} />
        </View>
      ))}
    </Animated.View>
  );
}
