/**
 * OfferProjectileLayer — Projectile animé d'une offrande
 * ─────────────────────────────────────────────────────────────────────────────
 * Trajectoires pilotées par offerRegistry.trajectory :
 *  arcToMouth       → arc parabolique vers la bouche (boissons)
 *  softFloatToTorso → flottement doux vers le torse (rose, fleur)
 *  glideToTorso     → glissement avec légère rotation (lettre)
 *
 * Rendu : emoji placeholder → remplacé par Image(assetId) quand l'asset existe.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { OfferTrajectoryKey } from '../types/avatarTypes';

interface Props {
  visible:    boolean;
  emoji:      string;
  trajectory: OfferTrajectoryKey;
}

export function OfferProjectileLayer({ visible, emoji, trajectory }: Props) {
  const tx      = useRef(new Animated.Value(-60)).current;
  const ty      = useRef(new Animated.Value(60)).current;
  const scale   = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Reset
    tx.setValue(-60);
    ty.setValue(60);
    scale.setValue(0.7);
    opacity.setValue(0);
    rotate.setValue(0);

    const fadeIn = Animated.timing(opacity, {
      toValue: 1, duration: 130, useNativeDriver: true,
    });
    const fadeOut = Animated.timing(opacity, {
      toValue: 0, duration: 180, useNativeDriver: true,
    });

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
        // Impact
        Animated.spring(scale, { toValue: 1.4, tension: 320, friction: 4, useNativeDriver: true }),
        fadeOut,
      ]),

      softFloatToTorso: Animated.sequence([
        Animated.parallel([
          fadeIn,
          Animated.timing(tx,    { toValue: -8,  duration: 850, useNativeDriver: true }),
          Animated.timing(ty,    { toValue: 10,  duration: 850, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1,   duration: 850, useNativeDriver: true }),
        ]),
        Animated.spring(scale, { toValue: 1.2, tension: 200, friction: 5, useNativeDriver: true }),
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
        Animated.spring(scale, { toValue: 1.2, tension: 200, friction: 5, useNativeDriver: true }),
        fadeOut,
      ]),
    };

    trajectories[trajectory].start();
  }, [visible, trajectory, tx, ty, scale, opacity, rotate]);

  if (!visible) return null;

  const rotateDeg = rotate.interpolate({
    inputRange:  [0, 1],
    outputRange: ['-8deg', '0deg'],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
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
  projectile: {
    position:   'absolute',
    left:       '45%',
    top:        '52%',
    marginLeft: -18,
    marginTop:  -18,
    zIndex:     100,
  },
  emoji: {
    fontSize: 36,
  },
});
