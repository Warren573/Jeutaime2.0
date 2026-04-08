/**
 * PremiumLetterAnimation — 4 vrais assets PNG
 *
 * z=1  envelope-open-back.png   (fond enveloppe ouverte, fade-in)
 * z=2  letter.png               (lettre, monte de l'intérieur)
 * z=3  envelope-open-front.png  (devant enveloppe ouverte, masque naturellement le bas)
 * z=4  envelope-closed.png      (enveloppe fermée, fade-out en premier)
 *
 * Layout :
 *   SCENE_H = ENV_H + LETTER_PEEK  — espace en haut pour la lettre qui sort
 *   Toutes les couches enveloppe à top=LETTER_PEEK (bas de la scène)
 *   Lettre : translateY(+START → -PEEK) pour aller de l'intérieur vers le haut
 *
 * Même rendu web et natif via Animated.Image (React Native Web compatible).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Easing } from 'react-native';

// ─── Assets ───────────────────────────────────────────────────────────────────
const ENV_BACK_MOD   = require('../../assets/envelope/envelope-open-back.png');
const LETTER_MOD     = require('../../assets/envelope/letter.png');
const ENV_FRONT_MOD  = require('../../assets/envelope/envelope-open-front.png');
const ENV_CLOSED_MOD = require('../../assets/envelope/envelope-closed.png');

// ─── Dimensions ───────────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const ENV_W       = Math.min(SW * 0.88, 400);
const ENV_H       = Math.round(ENV_W / 1.45);
const LETTER_PEEK = Math.round(ENV_H * 0.45);  // distance que la lettre dépasse en haut
const LETTER_HIDE = Math.round(ENV_H * 0.35);  // distance sous la position repos (caché dans poche)
const SCENE_H     = ENV_H + LETTER_PEEK;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props { senderName?: string }

export function PremiumLetterAnimation({ senderName: _ = '' }: Props) {
  const closedOp = useRef(new Animated.Value(1)).current;
  const backOp   = useRef(new Animated.Value(0)).current;
  const frontOp  = useRef(new Animated.Value(0)).current;
  const letterOp = useRef(new Animated.Value(0)).current;
  const letterY  = useRef(new Animated.Value(LETTER_HIDE)).current;
  const sceneOp  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Pause initiale
      Animated.delay(600),

      // Ouverture : closed disparaît, back + front apparaissent, lettre monte
      Animated.parallel([
        Animated.timing(closedOp, {
          toValue: 0, duration: 320, useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(backOp, {
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
        Animated.sequence([
          Animated.delay(480),
          Animated.parallel([
            Animated.timing(letterOp, {
              toValue: 1, duration: 300, useNativeDriver: true,
              easing: Easing.out(Easing.ease),
            }),
            Animated.timing(letterY, {
              toValue: -LETTER_PEEK, duration: 900, useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
          ]),
        ]),
      ]),

      // Hold
      Animated.delay(1800),

      // Fade-out de toute la scène
      Animated.timing(sceneOp, {
        toValue: 0, duration: 700, useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.scene, { opacity: sceneOp }]}>

      {/* z=1 — fond enveloppe ouverte */}
      <Animated.Image
        source={ENV_BACK_MOD}
        style={[styles.envLayer, { zIndex: 1, opacity: backOp }]}
        resizeMode="contain"
      />

      {/* z=2 — lettre (part dans la poche, monte au-dessus) */}
      <Animated.Image
        source={LETTER_MOD}
        style={[styles.envLayer, {
          zIndex: 2,
          opacity: letterOp,
          transform: [{ translateY: letterY }],
        }]}
        resizeMode="contain"
      />

      {/* z=3 — devant enveloppe ouverte (masque naturellement le bas de la lettre) */}
      <Animated.Image
        source={ENV_FRONT_MOD}
        style={[styles.envLayer, { zIndex: 3, opacity: frontOp }]}
        resizeMode="contain"
      />

      {/* z=4 — enveloppe fermée (disparaît en premier) */}
      <Animated.Image
        source={ENV_CLOSED_MOD}
        style={[styles.envLayer, { zIndex: 4, opacity: closedOp }]}
        resizeMode="contain"
      />

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: ENV_W,
    height: SCENE_H,
    alignSelf: 'center',
  },
  // Toutes les couches enveloppe démarrent à LETTER_PEEK depuis le haut
  // → laisse de l'espace en haut pour la lettre qui sort
  envLayer: {
    position: 'absolute',
    top: LETTER_PEEK,
    left: 0,
    width: ENV_W,
    height: ENV_H,
  },
});
