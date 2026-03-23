/**
 * AvatarTransformationLayer
 * ─────────────────────────────────────────────────────────────────────────────
 * Overlay de transformation actif sur l'avatar (couche z:3).
 * - Emoji de transformation sur fond semi-transparent
 * - Animation d'apparition (scale spring)
 * - Hint de rupture sous l'avatar (comment briser le sort)
 * - Tap sur le hint = tentative de rupture (appelle onBreakAttempt)
 *
 * Transformations disponibles :
 *   grenouille | ane | invisible | fantome | pirate | rockstar | statue | poule
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';

// ─── Config des transformations ───────────────────────────────────────────────

export const TRANSFORMATION_CONFIG: Record<
  string,
  { emoji: string; label: string; breakHint: string; breakEmoji: string; bg: string }
> = {
  grenouille: {
    emoji: '🐸',
    label: 'Grenouille',
    breakHint: 'Un bisou',
    breakEmoji: '💋',
    bg: 'rgba(44, 130, 44, 0.72)',
  },
  ane: {
    emoji: '🫏',
    label: 'Âne',
    breakHint: 'Un compliment',
    breakEmoji: '👏',
    bg: 'rgba(120, 80, 30, 0.72)',
  },
  invisibilite: {
    emoji: '🫥',
    label: 'Invisible',
    breakHint: 'Un grand rire',
    breakEmoji: '😂',
    bg: 'rgba(100, 100, 180, 0.45)',
  },
  fantome: {
    emoji: '👻',
    label: 'Fantôme',
    breakHint: "De l'eau",
    breakEmoji: '💧',
    bg: 'rgba(200, 200, 220, 0.65)',
  },
  pirate: {
    emoji: '🏴‍☠️',
    label: 'Pirate',
    breakHint: 'Dansez !',
    breakEmoji: '💃',
    bg: 'rgba(30, 20, 10, 0.72)',
  },
  rockstar: {
    emoji: '🎸',
    label: 'Rockstar',
    breakHint: 'Encore une guitare',
    breakEmoji: '🎸',
    bg: 'rgba(50, 0, 80, 0.72)',
  },
  statue: {
    emoji: '🗿',
    label: 'Statue',
    breakHint: '3 compliments',
    breakEmoji: '👏👏👏',
    bg: 'rgba(100, 85, 70, 0.72)',
  },
  poule: {
    emoji: '🐔',
    label: 'Poule',
    breakHint: '5 rires',
    breakEmoji: '😂😂😂',
    bg: 'rgba(240, 180, 30, 0.72)',
  },
  // Pouvoirs de salon Metal
  chat_noir: {
    emoji: '🐈‍⬛',
    label: 'Chat noir',
    breakHint: 'Un arc-en-ciel',
    breakEmoji: '🌈',
    bg: 'rgba(10, 10, 10, 0.80)',
  },
  licorne: {
    emoji: '🦄',
    label: 'Licorne',
    breakHint: 'La réalité reprend',
    breakEmoji: '⏱️',
    bg: 'rgba(200, 50, 180, 0.72)',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  transformationId: string;   // clé dans TRANSFORMATION_CONFIG
  size: number;                // diamètre de l'avatar
  onBreakAttempt?: () => void; // appelé quand l'utilisateur tape sur le hint
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function AvatarTransformationLayer({
  transformationId,
  size,
  onBreakAttempt,
}: Props) {
  const config = TRANSFORMATION_CONFIG[transformationId];
  if (!config) return null;

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Apparition : scale spring
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();

    // 2. Pulsation légère en boucle
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.96, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // 3. Hint apparaît après 1.2s
    Animated.delay(1200).start(() => {
      Animated.timing(hintOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });

    return () => pulse.stop();
  }, [transformationId]);

  const emojiSize = size * 0.72;

  return (
    <>
      {/* Overlay sur l'avatar */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.overlay,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: config.bg,
            transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
          },
        ]}
      >
        <Text style={{ fontSize: emojiSize }}>{config.emoji}</Text>
      </Animated.View>

      {/* Hint de rupture — appuyable */}
      <Animated.View style={[styles.hintContainer, { opacity: hintOpacity }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBreakAttempt}
          style={styles.hintPill}
        >
          <Text style={styles.hintEmoji}>{config.breakEmoji}</Text>
          <Text style={styles.hintText}>{config.breakHint}</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    position:        'absolute',
    alignSelf:       'center',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          3,
  },
  hintContainer: {
    position:  'absolute',
    alignSelf: 'center',
    bottom:    -26,
    zIndex:    5,
  },
  hintPill: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: 'rgba(30, 20, 10, 0.82)',
    borderRadius:    12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap:             3,
  },
  hintEmoji: {
    fontSize: 11,
  },
  hintText: {
    fontSize:   9,
    color:      '#FFF',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
