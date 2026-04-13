/**
 * OfferReactionLayer — Réaction visuelle de l'avatar après réception
 * ─────────────────────────────────────────────────────────────────────────────
 * Affiche le badge de réaction en haut à droite de l'avatar.
 * Position et taille lues depuis reactionRegistry.
 * Rendu de l'asset via AvatarLayer (svg ou png, registry centralisé).
 *
 * Animation : pop-in spring → maintien → fade-out
 */

import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import type { OfferReactionKey } from '../types/avatarTypes';
import { reactionRegistry } from '../config/reactionRegistry';
import { AvatarLayer } from './AvatarLayer';

interface Props {
  reaction:   OfferReactionKey | null | undefined;
  avatarSize: number;
}

export function OfferReactionLayer({ reaction, avatarSize }: Props) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.setValue(0);
    opacity.setValue(0);

    if (!reaction) return;

    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1,   tension: 260, friction: 7, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,   duration: 120, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(scale,   { toValue: 0.6, duration: 280, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration: 280, useNativeDriver: true }),
      ]),
    ]).start();
  }, [reaction, scale, opacity]);

  if (!reaction) return null;

  const def = reactionRegistry[reaction];
  if (!def) return null;

  const badgeSize = avatarSize * def.position.sizeRatio;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top:      `${def.position.topPercent}%`,
        right:    `${def.position.rightPercent}%`,
        width:    badgeSize,
        height:   badgeSize,
        zIndex:   110,
        opacity,
        transform: [{ scale }],
      }}
    >
      <View style={{ width: badgeSize, height: badgeSize }}>
        <AvatarLayer assetId={def.assetId} size={badgeSize} />
      </View>
    </Animated.View>
  );
}
