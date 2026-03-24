/**
 * OfferProjectileLayer — Projectile animé d'une offrande
 * ─────────────────────────────────────────────────────────────────────────────
 * Trajectoires pilotées par offerRegistry.trajectory :
 *  arcToMouth       → arc parabolique vers la bouche (boissons)
 *  softFloatToTorso → flottement doux vers le torse (rose, fleur, cœur)
 *  glideToTorso     → glissement avec légère rotation (lettre)
 *
 * Impact visuel (à l'arrivée) :
 *  Chaque trajectoire déclenche un glow coloré selon la famille d'offrande :
 *  hotDrink → orange chaud   🟠
 *  alcohol  → doré pétillant 🟡
 *  symbolic → rose romantique 🌸
 *
 * Rendu : emoji placeholder → remplacé par Image(assetId) quand l'asset existe.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { OfferFamily, OfferTrajectoryKey } from '../types/avatarTypes';

/** Couleur du halo d'impact selon la famille */
const IMPACT_GLOW: Record<OfferFamily, string> = {
  hotDrink: 'rgba(255, 148, 40,  0.50)',
  alcohol:  'rgba(255, 210, 55,  0.45)',
  symbolic: 'rgba(255, 120, 175, 0.45)',
};

interface Props {
  visible:    boolean;
  emoji:      string;
  trajectory: OfferTrajectoryKey;
  /** Famille d'offrande — détermine la couleur du glow d'impact */
  family:     OfferFamily;
}

export function OfferProjectileLayer({ visible, emoji, trajectory, family }: Props) {
  const tx          = useRef(new Animated.Value(-60)).current;
  const ty          = useRef(new Animated.Value(60)).current;
  const scale       = useRef(new Animated.Value(0.7)).current;
  const opacity     = useRef(new Animated.Value(0)).current;
  const rotate      = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Reset
    tx.setValue(-60);
    ty.setValue(60);
    scale.setValue(0.7);
    opacity.setValue(0);
    rotate.setValue(0);
    glowOpacity.setValue(0);

    const fadeIn = Animated.timing(opacity, {
      toValue: 1, duration: 130, useNativeDriver: true,
    });
    const fadeOut = Animated.timing(opacity, {
      toValue: 0, duration: 180, useNativeDriver: true,
    });

    // Flash de glow à l'impact — identique pour toutes les trajectoires
    const impactGlow = Animated.sequence([
      Animated.timing(glowOpacity, { toValue: 1, duration: 70,  useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]);

    // Impact : scale spring + glow simultanés
    const impactEffect = Animated.parallel([
      Animated.spring(scale, { toValue: 1.4, tension: 320, friction: 4, useNativeDriver: true }),
      impactGlow,
    ]);

    const trajectories: Record<OfferTrajectoryKey, Animated.CompositeAnimation> = {

      arcToMouth: Animated.sequence([
        Animated.parallel([
          fadeIn,
          Animated.timing(tx, { toValue: 0,   duration: 650, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(ty, { toValue: -15, duration: 280, useNativeDriver: true }),
            Animated.timing(ty, { toValue: -5,  duration: 370, useNativeDriver: true }),
          ]),
          Animated.timing(scale, { toValue: 1.1, duration: 650, useNativeDriver: true }),
        ]),
        impactEffect,
        fadeOut,
      ]),

      softFloatToTorso: Animated.sequence([
        Animated.parallel([
          fadeIn,
          Animated.timing(tx,    { toValue: -8,  duration: 850, useNativeDriver: true }),
          Animated.timing(ty,    { toValue: 10,  duration: 850, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1,   duration: 850, useNativeDriver: true }),
        ]),
        impactEffect,
        fadeOut,
      ]),

      glideToTorso: Animated.sequence([
        Animated.parallel([
          fadeIn,
          Animated.timing(tx,     { toValue: -5,  duration: 720, useNativeDriver: true }),
          Animated.timing(ty,     { toValue: 18,  duration: 720, useNativeDriver: true }),
          Animated.timing(scale,  { toValue: 1,   duration: 720, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 1,   duration: 720, useNativeDriver: true }),
        ]),
        impactEffect,
        fadeOut,
      ]),
    };

    trajectories[trajectory].start();
  }, [visible, trajectory, family, tx, ty, scale, opacity, rotate, glowOpacity]);

  if (!visible) return null;

  const rotateDeg = rotate.interpolate({
    inputRange:  [0, 1],
    outputRange: ['-8deg', '0deg'],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {/* Halo d'impact — flash coloré selon la famille */}
      <Animated.View
        style={[
          styles.impactGlow,
          { backgroundColor: IMPACT_GLOW[family], opacity: glowOpacity },
        ]}
      />
      {/* Projectile */}
      <Animated.View style={[
        styles.projectile,
        { opacity, transform: [{ translateX: tx }, { translateY: ty }, { scale }, { rotate: rotateDeg }] },
      ]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  impactGlow: {
    position:     'absolute',
    left:         '45%',
    top:          '52%',
    width:        56,
    height:       56,
    marginLeft:   -28,
    marginTop:    -28,
    borderRadius: 28,
    zIndex:       101,
  },
  projectile: {
    position:   'absolute',
    left:       '45%',
    top:        '52%',
    marginLeft: -18,
    marginTop:  -18,
    // zIndex 102 : au-dessus des overlays de transformation/magie (100),
    // sous les réactions (110) — toujours visible pendant le vol
    zIndex:     102,
  },
  emoji: {
    fontSize: 36,
  },
});
