/**
 * AvatarReactionLayer — Réaction visuelle temporaire sur l'avatar
 * ─────────────────────────────────────────────────────────────────────────────
 * Affiché pendant `reactionDurationMs` ms après une offrande ou événement.
 * Remplaçable par un asset SVG/PNG quand les illustrations sont prêtes.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { ReactionType } from '../types/avatarTypes';

interface Props {
  reaction: ReactionType;
  size:     number;
}

const REACTION_EMOJI: Record<ReactionType, string> = {
  wellbeingSmile:  '😊',
  slurp:           '😋',
  romanticReceive: '💖',
  readLetter:      '💌',
};

export function AvatarReactionLayer({ reaction, size }: Props) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]),
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(scale,   { toValue: 0.6, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, [reaction, scale, opacity]);

  const emojiSize = size * 0.22;

  return (
    <Animated.View
      style={{
        position:  'absolute',
        top:       size * 0.06,
        right:     size * 0.06,
        transform: [{ scale }],
        opacity,
      }}
    >
      <View style={{
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius:    emojiSize,
        padding:         size * 0.025,
        shadowColor:     '#000',
        shadowOpacity:   0.15,
        shadowRadius:    4,
        shadowOffset:    { width: 0, height: 2 },
        elevation:       4,
      }}>
        <Text style={{ fontSize: emojiSize }}>
          {REACTION_EMOJI[reaction]}
        </Text>
      </View>
    </Animated.View>
  );
}
