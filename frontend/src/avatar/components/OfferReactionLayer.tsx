/**
 * OfferReactionLayer — Réaction visuelle de l'avatar après réception
 * ─────────────────────────────────────────────────────────────────────────────
 * Affiché en haut à droite de l'avatar pendant la phase "reaction".
 * Placeholder emoji → remplaçable par assets SVG/PNG via reactionKey.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { OfferReactionKey } from '../types/avatarTypes';

const REACTION_EMOJI: Record<OfferReactionKey, string> = {
  wellbeingSmile:   '😊',
  slurp:            '😋',
  romanticReceive:  '🥰',
  readLetter:       '💌',
};

interface Props {
  reaction?: OfferReactionKey | null;
}

export function OfferReactionLayer({ reaction }: Props) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!reaction) {
      scale.setValue(0);
      opacity.setValue(0);
      return;
    }

    scale.setValue(0);
    opacity.setValue(0);

    Animated.sequence([
      // Pop in
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1,   tension: 260, friction: 7, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,   duration: 120, useNativeDriver: true }),
      ]),
      // Maintien
      Animated.delay(900),
      // Fade out
      Animated.parallel([
        Animated.timing(scale,   { toValue: 0.6, duration: 280, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration: 280, useNativeDriver: true }),
      ]),
    ]).start();
  }, [reaction, scale, opacity]);

  if (!reaction) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Animated.View style={[styles.badge, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.emoji}>{REACTION_EMOJI[reaction]}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top:      '4%',
    right:    '4%',
    zIndex:   110,
  },
  emoji: {
    fontSize: 22,
  },
});
