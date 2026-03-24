/**
 * AvatarOfferMotion — Animation du corps avatar selon l'offrande reçue
 * ─────────────────────────────────────────────────────────────────────────────
 * drinkHot     → micro-scale doux (bien-être)
 * drinkAlcohol → bounce latéral joueur
 * receiveRose  → légère expansion tendre
 * openLetter   → pause + micro-scale focus
 */

import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import type { OfferAnimationKey } from '../types/avatarTypes';

interface Props {
  animationKey?: OfferAnimationKey | null;
  children:      React.ReactNode;
}

export function AvatarOfferMotion({ animationKey, children }: Props) {
  const scale  = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animationKey) return;

    if (animationKey === 'drinkHot') {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.05, duration: 180, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,    duration: 260, useNativeDriver: true }),
      ]).start();
    }

    if (animationKey === 'drinkAlcohol') {
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1,  duration: 130, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: 130, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1,  duration: 110, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0,  duration: 110, useNativeDriver: true }),
      ]).start();
    }

    if (animationKey === 'receiveRose') {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,    duration: 300, useNativeDriver: true }),
      ]).start();
    }

    if (animationKey === 'openLetter') {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.03, duration: 160, useNativeDriver: true }),
        Animated.delay(300),
        Animated.timing(scale, { toValue: 1,    duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [animationKey, scale, rotate]);

  const rotateDeg = rotate.interpolate({
    inputRange:  [-1, 0, 1],
    outputRange: ['-4deg', '0deg', '4deg'],
  });

  return (
    <Animated.View style={{ transform: [{ scale }, { rotate: rotateDeg }] }}>
      {children}
    </Animated.View>
  );
}
