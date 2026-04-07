/**
 * PremiumLetterAnimation — 4-asset PNG approach
 *
 * Assets (frontend/assets/envelope/) :
 *   envelope-closed.png      — enveloppe fermée (z=4, fade-out)
 *   envelope-open-back.png   — dos de l'enveloppe ouverte (z=1, fade-in)
 *   letter.png               — lettre qui sort (z=2, monte)
 *   envelope-open-front.png  — devant de l'enveloppe ouverte (z=3, masque bas lettre)
 *
 * Timeline (~4 680 ms) :
 *   t=  0 ms  scène visible, enveloppe fermée
 *   t=600 ms  closed fade-out (320 ms) + open-back fade-in (360 ms)
 *   t=720 ms  open-front fade-in (360 ms, offset 120 ms)
 *   t=1080 ms lettre monte (-54 px, 900 ms) + fade-in (260 ms)
 *   t=2980 ms hold (1 800 ms)
 *   t=4780 ms scène fade-out (700 ms)   ← LettersScreen unmount > 5 100 ms ✓
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Easing } from 'react-native';

const { width: SW } = Dimensions.get('window');
const ENV_W = Math.min(SW * 0.84, 360);
const ENV_H = Math.round(ENV_W / 1.45);
const LETTER_RISE = 54; // px the letter rises above its rest position

interface Props { senderName?: string }

export function PremiumLetterAnimation({ senderName: _ = '' }: Props) {
  const closedOp   = useRef(new Animated.Value(1)).current;
  const openBackOp = useRef(new Animated.Value(0)).current;
  const letterOp   = useRef(new Animated.Value(0)).current;
  const letterY    = useRef(new Animated.Value(0)).current;
  const frontOp    = useRef(new Animated.Value(0)).current;
  const sceneOp    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // ── pause avant départ ────────────────────────────────────────────────
      Animated.delay(600),

      // ── ouverture : closed sort, open-back + open-front entrent ──────────
      Animated.parallel([
        Animated.timing(closedOp, {
          toValue: 0, duration: 320, useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(openBackOp, {
          toValue: 1, duration: 360, useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.sequence([
          Animated.delay(120),
          Animated.timing(frontOp, {
            toValue: 1, duration: 360, useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
        ]),
        // lettre commence à monter 480 ms après le début de l'ouverture
        Animated.sequence([
          Animated.delay(480),
          Animated.parallel([
            Animated.timing(letterOp, {
              toValue: 1, duration: 260, useNativeDriver: true,
              easing: Easing.out(Easing.ease),
            }),
            Animated.timing(letterY, {
              toValue: -LETTER_RISE, duration: 900, useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
          ]),
        ]),
      ]),

      // ── hold ──────────────────────────────────────────────────────────────
      Animated.delay(1800),

      // ── fade-out de toute la scène ────────────────────────────────────────
      Animated.timing(sceneOp, {
        toValue: 0, duration: 700, useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.scene, { opacity: sceneOp }]}>
      {/* z=1 — dos enveloppe ouverte */}
      <Animated.Image
        source={require('../../assets/envelope/envelope-open-back.png')}
        style={[styles.layer, { zIndex: 1, opacity: openBackOp }]}
        resizeMode="contain"
      />

      {/* z=2 — lettre qui monte */}
      <Animated.Image
        source={require('../../assets/envelope/letter.png')}
        style={[styles.layer, { zIndex: 2, opacity: letterOp,
          transform: [{ translateY: letterY }] }]}
        resizeMode="contain"
      />

      {/* z=3 — devant enveloppe ouverte (masque la partie basse de la lettre) */}
      <Animated.Image
        source={require('../../assets/envelope/envelope-open-front.png')}
        style={[styles.layer, { zIndex: 3, opacity: frontOp }]}
        resizeMode="contain"
      />

      {/* z=4 — enveloppe fermée (disparaît en premier) */}
      <Animated.Image
        source={require('../../assets/envelope/envelope-closed.png')}
        style={[styles.layer, { zIndex: 4, opacity: closedOp }]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: ENV_W,
    height: ENV_H,
    alignSelf: 'center',
  },
  layer: {
    position: 'absolute',
    width: ENV_W,
    height: ENV_H,
  },
});
