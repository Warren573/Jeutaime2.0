/**
 * ProjectileAnimationLayer — Animation de l'offrande vers l'avatar
 * ─────────────────────────────────────────────────────────────────────────────
 * Affiche un asset (emoji placeholder → futur PNG) qui se déplace
 * depuis le bas vers le point d'ancrage cible, puis disparaît.
 *
 * Usage :
 *  <ProjectileAnimationLayer
 *    visible={true}
 *    actionType="coffee"
 *    onComplete={() => setVisible(false)}
 *  />
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';
import { OfferType } from '../types/avatarTypes';

interface Props {
  visible:    boolean;
  actionType: OfferType;
  onComplete?: () => void;
}

const OFFER_EMOJI: Record<OfferType, string> = {
  coffee: '☕',
  beer:   '🍺',
  rose:   '🌹',
  letter: '💌',
};

// Durées par animation (ms)
const ANIMATION_DURATION: Record<OfferType, number> = {
  coffee: 700,
  beer:   700,
  rose:   900,
  letter: 850,
};

export function ProjectileAnimationLayer({ visible, actionType, onComplete }: Props) {
  const translateX = useRef(new Animated.Value(-30)).current;
  const translateY = useRef(new Animated.Value(60)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!visible) return;

    // Reset
    translateX.setValue(-30);
    translateY.setValue(60);
    opacity.setValue(0);
    scale.setValue(0.5);

    const duration = ANIMATION_DURATION[actionType];

    Animated.sequence([
      // Phase 1 : arrivée (arc vers le centre)
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0,   duration,              useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0,   duration,              useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 1,   duration: duration * 0.3, useNativeDriver: true }),
        Animated.spring(scale,      { toValue: 1.1, useNativeDriver: true, tension: 200, friction: 8 }),
      ]),
      // Phase 2 : impact (léger flash)
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, tension: 300, friction: 4 }),
      // Phase 3 : disparition
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 0.5, duration: 200, useNativeDriver: true }),
      ]),
    ]).start(() => onComplete?.());
  }, [visible, actionType, translateX, translateY, opacity, scale, onComplete]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position:  'absolute',
        left:      '40%',
        top:       '45%',
        transform: [{ translateX }, { translateY }, { scale }],
        opacity,
        zIndex:    100,
      }}
    >
      <Text style={{ fontSize: 36 }}>{OFFER_EMOJI[actionType]}</Text>
    </Animated.View>
  );
}
