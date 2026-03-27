/**
 * PremiumLetterAnimation — Journal Moderne Romantique
 *
 * Séquence :
 *   1. Arrivée avec spring naturel (inertie)
 *   2. Glow doré subtil
 *   3. Ouverture du rabat (translateY vers le haut, spring avec résistance)
 *   4. Dissolution enveloppe → révélation de la lettre en dessous
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width: SW } = Dimensions.get('window');
const ENV_W  = Math.min(SW - 64, 280);
const ENV_H  = Math.round(ENV_W * 0.62);
const FLAP_H = Math.round(ENV_H * 0.42);

const C = {
  paperWarm:    '#F1E4D2',
  paperMid:     '#EAD9C0',
  borderEnv:    '#C8A96E',
  letterPaper:  '#FFFDF8',
  sealRed:      '#7B1515',
  glow:         '#C9A96E',
  textMain:     '#2B2B2B',
  textSub:      '#6B6B6B',
  accentPrimary:'#8B2E3C',
  borderSoft:   '#D8D2C4',
};

interface Props {
  senderName?: string;
}

export function PremiumLetterAnimation({ senderName = 'Sophie' }: Props) {
  // Conteneur global
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(52);
  const scale      = useSharedValue(0.91);

  // Glow
  const glowOpacity = useSharedValue(0);
  const glowScale   = useSharedValue(0.8);

  // Rabat
  const flapY       = useSharedValue(0);
  const flapOpacity = useSharedValue(1);

  // Corps enveloppe
  const envOpacity = useSharedValue(1);
  const envScale   = useSharedValue(1);

  // Lettre révélée
  const letterOpacity = useSharedValue(0.4);
  const letterScale   = useSharedValue(0.96);

  useEffect(() => {
    // 1 — Arrivée
    opacity.value    = withTiming(1, { duration: 380 });
    translateY.value = withSpring(0, { damping: 11, stiffness: 110 });
    scale.value      = withSequence(
      withTiming(1.05, { duration: 220 }),
      withTiming(1.0,  { duration: 200 }),
    );

    // 2 — Glow doré
    glowOpacity.value = withDelay(300, withTiming(0.22, { duration: 500 }));
    glowScale.value   = withDelay(300, withTiming(1.18, { duration: 500 }));

    // 3 — Ouverture rabat (spring avec résistance)
    flapY.value       = withDelay(720, withSpring(-(FLAP_H + 56), { damping: 13, stiffness: 92 }));
    flapOpacity.value = withDelay(920, withTiming(0, { duration: 260 }));

    // 4 — Dissolution enveloppe → révélation lettre
    envOpacity.value    = withDelay(1060, withTiming(0, { duration: 480, easing: Easing.out(Easing.quad) }));
    envScale.value      = withDelay(1060, withTiming(0.88, { duration: 480 }));
    letterOpacity.value = withDelay(960,  withTiming(1,   { duration: 440 }));
    letterScale.value   = withDelay(960,  withTiming(1,   { duration: 440 }));
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const flapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: flapY.value }],
    opacity: flapOpacity.value,
  }));

  const envBodyStyle = useAnimatedStyle(() => ({
    opacity: envOpacity.value,
    transform: [{ scale: envScale.value }],
  }));

  const letterStyle = useAnimatedStyle(() => ({
    opacity: letterOpacity.value,
    transform: [{ scale: letterScale.value }],
  }));

  return (
    <View style={[styles.outer, { height: ENV_H + 56 }]}>
      {/* Glow doré derrière tout */}
      <Animated.View
        style={[
          styles.glow,
          { width: ENV_W * 1.1, height: ENV_W * 1.1, borderRadius: ENV_W * 0.55 },
          glowStyle,
        ]}
      />

      <Animated.View style={[styles.wrapper, { width: ENV_W, height: ENV_H }, containerStyle]}>

        {/* ① Lettre — visible en dessous (z-index 1) */}
        <Animated.View style={[styles.letterPaper, letterStyle]}>
          <Text style={styles.letterSender}>✉ {senderName}</Text>
          <View style={styles.letterDivider} />
          <Text style={styles.letterHint}>Toucher pour lire</Text>
        </Animated.View>

        {/* ② Corps de l'enveloppe (z-index 2, se dissout) */}
        <Animated.View style={[styles.envBody, envBodyStyle]}>
          <View style={styles.foldLinesContainer}>
            <View style={[styles.foldLine, styles.foldLL]} />
            <View style={[styles.foldLine, styles.foldLR]} />
          </View>
        </Animated.View>

        {/* ③ Rabat (z-index 3, se lève) */}
        <Animated.View style={[styles.flap, { height: FLAP_H }, flapStyle]}>
          <View style={styles.foldLinesContainer}>
            <View style={[styles.foldLine, styles.flapLL]} />
            <View style={[styles.foldLine, styles.flapLR]} />
          </View>
          <View style={styles.seal}>
            <Text style={styles.sealEmoji}>💌</Text>
          </View>
        </Animated.View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  glow: {
    position: 'absolute',
    backgroundColor: C.glow,
  },

  wrapper: {
    position: 'relative',
  },

  // Lettre révélée
  letterPaper: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: C.letterPaper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  letterSender: {
    fontSize: 15,
    fontWeight: '700',
    color: C.accentPrimary,
    letterSpacing: 0.5,
  },
  letterDivider: {
    width: '60%',
    height: 1,
    backgroundColor: C.borderSoft,
    marginVertical: 8,
  },
  letterHint: {
    fontSize: 12,
    color: C.textSub,
    fontStyle: 'italic',
  },

  // Corps enveloppe
  envBody: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.paperWarm,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.borderEnv,
    overflow: 'hidden',
    zIndex: 2,
  },

  // Lignes de pli
  foldLinesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  foldLine: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: '#A07030',
    opacity: 0.4,
  },
  foldLL: {
    width: ENV_W * 0.75,
    top: ENV_H * 0.45,
    left: -ENV_W * 0.1,
    transform: [{ rotate: '20deg' }],
  },
  foldLR: {
    width: ENV_W * 0.75,
    top: ENV_H * 0.45,
    right: -ENV_W * 0.1,
    transform: [{ rotate: '-20deg' }],
  },

  // Rabat
  flap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: C.paperMid,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: C.borderEnv,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  flapLL: {
    width: ENV_W * 0.75,
    top: FLAP_H * 0.3,
    left: -ENV_W * 0.1,
    transform: [{ rotate: '22deg' }],
  },
  flapLR: {
    width: ENV_W * 0.75,
    top: FLAP_H * 0.3,
    right: -ENV_W * 0.1,
    transform: [{ rotate: '-22deg' }],
  },

  // Sceau
  seal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.sealRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
  },
  sealEmoji: { fontSize: 22 },
});
