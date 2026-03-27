/**
 * AvatarOfferMotion — Animation du corps avatar selon l'offrande reçue
 * ─────────────────────────────────────────────────────────────────────────────
 * Idle breathing (toujours actif) :
 *   breatheScale → 1 ↔ 1.015, cycle 2.5s — l'avatar "respire" en permanence
 *
 * Animations d'offrande (s'ajoutent par-dessus le breathing) :
 *   drinkHot     → micro-scale doux (bien-être)
 *   drinkAlcohol → bounce latéral joueur
 *   receiveRose  → légère expansion tendre
 *   openLetter   → pause + micro-scale focus
 *
 * Implémentation :
 *   offerScale   → valeur 1.0 au repos, animée par l'offrande
 *   breatheScale → boucle douce, jamais interrompue
 *   combinedScale = Animated.multiply(breatheScale, offerScale)
 *   → les deux effets coexistent sans se couper
 */

import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import type { OfferAnimationKey } from '../types/avatarTypes';

interface Props {
  animationKey?: OfferAnimationKey | null;
  children:      React.ReactNode;
}

export function AvatarOfferMotion({ animationKey, children }: Props) {
  const breatheScale  = useRef(new Animated.Value(1)).current;
  const offerScale    = useRef(new Animated.Value(1)).current;
  const rotate        = useRef(new Animated.Value(0)).current;
  // Nœud dérivé créé une seule fois — suit breatheScale et offerScale automatiquement
  const combinedScale = useRef(Animated.multiply(breatheScale, offerScale)).current;

  // ── Breathing idle — toujours actif ───────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheScale, { toValue: 1.015, duration: 1250, useNativeDriver: true }),
        Animated.timing(breatheScale, { toValue: 1,     duration: 1250, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breatheScale]);

  // ── Animation d'offrande ───────────────────────────────────────────────────
  useEffect(() => {
    if (!animationKey) return;

    if (animationKey === 'drinkHot') {
      // Bien-être : micro-gonflement doux
      Animated.sequence([
        Animated.timing(offerScale, { toValue: 1.05, duration: 180, useNativeDriver: true }),
        Animated.timing(offerScale, { toValue: 1,    duration: 260, useNativeDriver: true }),
      ]).start();
    }

    if (animationKey === 'drinkAlcohol') {
      // Joueur : wobble latéral
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1,  duration: 130, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: 130, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1,  duration: 110, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0,  duration: 110, useNativeDriver: true }),
      ]).start();
    }

    if (animationKey === 'receiveRose') {
      // Tendre : expansion douce
      Animated.sequence([
        Animated.timing(offerScale, { toValue: 1.06, duration: 200, useNativeDriver: true }),
        Animated.timing(offerScale, { toValue: 1,    duration: 300, useNativeDriver: true }),
      ]).start();
    }

    if (animationKey === 'openLetter') {
      // Focus : micro-scale + pause de lecture
      Animated.sequence([
        Animated.timing(offerScale, { toValue: 1.03, duration: 160, useNativeDriver: true }),
        Animated.delay(300),
        Animated.timing(offerScale, { toValue: 1,    duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [animationKey, offerScale, rotate]);

  const rotateDeg = rotate.interpolate({
    inputRange:  [-1, 0, 1],
    outputRange: ['-4deg', '0deg', '4deg'],
  });

  return (
    <Animated.View style={{ transform: [{ scale: combinedScale }, { rotate: rotateDeg }] }}>
      {children}
    </Animated.View>
  );
}
