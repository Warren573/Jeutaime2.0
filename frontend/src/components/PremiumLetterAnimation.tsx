/**
 * PremiumLetterAnimation
 *
 * SÉQUENCE :
 *   1. Enveloppe fermée (lettre invisible à l'intérieur)
 *   2. Rabat glisse vers le haut et quitte le cadre
 *   3. Lettre glisse depuis l'intérieur, sort par le haut
 *   4. Fondu de sortie
 *
 * STRUCTURE :
 *   Container (overflow:visible — permet à la lettre de dépasser en haut)
 *   ├── LetterPaper   z=1  — derrière le corps, monte vers le haut
 *   ├── EnvelopeBody  z=2  — opaque, masque la lettre quand elle est à l'intérieur
 *   └── Flap          z=3  — monte et sort du cadre (clippé par overflow:hidden du wrapper)
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
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
import Svg, { Polygon } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW } = Dimensions.get('window');

const ENV_W = Math.min(SW - 64, 280);
const ENV_H = Math.round(ENV_W * 0.62);
const FLAP_H = Math.round(ENV_H * 0.48);

// Combien la lettre dépasse au-dessus de l'enveloppe (zone visible)
const LETTER_PEEK = Math.round(ENV_H * 0.38);
// Combien la lettre part en bas à l'intérieur (zone masquée par le corps opaque)
const LETTER_INSIDE = Math.round(ENV_H * 0.32);
// Hauteur totale de la lettre = peek + inside
const LETTER_H = LETTER_PEEK + LETTER_INSIDE;

// SVG
const FLAP_TRI  = `0,0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`;
const FOLD_L = `0,0 0,${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;
const FOLD_R = `${ENV_W},0 ${ENV_W},${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;
const FOLD_B = `0,${ENV_H} ${ENV_W},${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;

interface Props { senderName?: string }

export function PremiumLetterAnimation({ senderName: _ = '' }: Props) {

  // Arrivée de la scène
  const sceneOp = useSharedValue(0);
  const sceneY  = useSharedValue(24);

  // Cachet
  const sealSc = useSharedValue(1);
  const sealOp = useSharedValue(1);

  // Rabat : part de 0 et monte hors du cadre
  const flapY  = useSharedValue(0);
  const flapOp = useSharedValue(1);

  // Lettre : part de l'intérieur (translateY = +LETTER_INSIDE) et monte vers le haut
  // Départ : derrière l'enveloppe, opacity 0 → invisible
  // Arrivée : translateY = -LETTER_PEEK (dépasse en haut), opacity 1
  const letterY  = useSharedValue(LETTER_INSIDE);
  const letterOp = useSharedValue(0);

  // Sortie globale
  const exitOp = useSharedValue(1);
  const exitSc = useSharedValue(1);

  useEffect(() => {
    // 1 — Arrivée (0–300ms)
    sceneOp.value = withTiming(1, { duration: 250 });
    sceneY.value  = withSpring(0, { damping: 18, stiffness: 145 });

    // 2 — Cachet pulse (300–520ms)
    sealSc.value = withDelay(300, withSequence(
      withTiming(1.18, { duration: 140 }),
      withTiming(1.00, { duration: 120 }),
      withTiming(1.10, { duration: 100 }),
      withTiming(1.00, { duration: 100 }),
    ));
    sealOp.value = withDelay(510, withTiming(0, { duration: 140 }));

    // 3 — Rabat monte et sort du cadre (560–960ms)
    flapY.value  = withDelay(560, withTiming(-(FLAP_H + 24), {
      duration: 400,
      easing: Easing.inOut(Easing.quad),
    }));
    flapOp.value = withDelay(730, withTiming(0, { duration: 180 }));

    // 4 — Lettre sort de l'intérieur (660–1000ms)
    //     Démarre 100ms après le rabat, sort vers le haut
    letterOp.value = withDelay(660, withTiming(1, { duration: 280 }));
    letterY.value  = withDelay(660, withSpring(-LETTER_PEEK, {
      damping: 22,
      stiffness: 140,
      mass: 0.85,
    }));

    // 5 — Sortie (1200–1520ms)
    exitOp.value = withDelay(1200, withTiming(0, {
      duration: 320, easing: Easing.in(Easing.quad),
    }));
    exitSc.value = withDelay(1200, withTiming(0.93, { duration: 320 }));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: sceneOp.value,
    transform: [{ translateY: sceneY.value }],
  }));

  const exitStyle = useAnimatedStyle(() => ({
    opacity: exitOp.value,
    transform: [{ scale: exitSc.value }],
  }));

  const sealStyle = useAnimatedStyle(() => ({
    opacity: sealOp.value,
    transform: [{ scale: sealSc.value }],
  }));

  // Rabat glisse vers le haut + légère compression (effet perspective)
  const flapStyle = useAnimatedStyle(() => {
    const t = interpolate(flapY.value, [0, -(FLAP_H + 24)], [0, 1], 'clamp');
    return {
      opacity: flapOp.value,
      transform: [
        { translateY: flapY.value },
        { scaleY: interpolate(t, [0, 1], [1, 0.62]) },
      ],
    };
  });

  // Lettre monte depuis l'intérieur
  const letterStyle = useAnimatedStyle(() => ({
    opacity: letterOp.value,
    transform: [{ translateY: letterY.value }],
  }));

  return (
    // Wrapper qui laisse déborder la lettre vers le haut (overflow:visible)
    // mais clipe le bas (le corps opaque de l'enveloppe s'en charge)
    <View style={[styles.wrapper, { width: ENV_W, height: ENV_H + LETTER_PEEK }]}>
      <Animated.View style={exitStyle}>
        {/*
          Container principal positionné en bas du wrapper.
          overflow:visible → la lettre peut dépasser vers le haut.
          Le corps opaque (z=2) masque la lettre quand elle est à l'intérieur.
        */}
        <Animated.View
          style={[styles.envelope, { width: ENV_W, height: ENV_H, top: LETTER_PEEK }, sceneStyle]}
        >
          {/* z=1 — Lettre : part de l'intérieur, monte vers le haut */}
          <Animated.View
            style={[
              styles.letter,
              { width: ENV_W - 18, height: LETTER_H, left: 9, top: 0 },
              letterStyle,
            ]}
          >
            <LinearGradient
              colors={['#F8F0DC', '#F0E4C4', '#E8D8B0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Bord gauche décoratif */}
            <View style={styles.letterBar} />
            {/* Lignes simulées (suggestion de texte) */}
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.letterLine,
                  {
                    top: 14 + i * 13,
                    width: i === 3 ? '48%' : i === 0 ? '70%' : '82%',
                    opacity: 0.20 + i * 0.03,
                  },
                ]}
              />
            ))}
            {/* Ombre en bas de la lettre */}
            <View style={styles.letterBottomShadow} />
          </Animated.View>

          {/* z=2 — Corps opaque de l'enveloppe */}
          <View style={[styles.body, { width: ENV_W, height: ENV_H }]}>
            <LinearGradient
              colors={['#DFBF6A', '#D0A84E', '#C09438']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Plis en X */}
            <Svg width={ENV_W} height={ENV_H} style={StyleSheet.absoluteFill}>
              <Polygon points={FOLD_L} fill="rgba(140,90,8,0.12)"  stroke="rgba(120,75,5,0.28)" strokeWidth="0.8" />
              <Polygon points={FOLD_R} fill="rgba(190,148,38,0.07)" stroke="rgba(120,75,5,0.28)" strokeWidth="0.8" />
              <Polygon points={FOLD_B} fill="rgba(150,100,12,0.10)" stroke="rgba(120,75,5,0.28)" strokeWidth="0.8" />
            </Svg>
            {/* Bordure intérieure */}
            <View style={styles.bodyInner} />
          </View>

          {/* z=3 — Rabat triangulaire */}
          <Animated.View style={[styles.flap, { width: ENV_W, height: FLAP_H }, flapStyle]}>
            <Svg width={ENV_W} height={FLAP_H} style={StyleSheet.absoluteFill}>
              <Polygon points={FLAP_TRI} fill="#C08830" />
              <Polygon points={`0,0 ${ENV_W / 2},0 ${ENV_W / 2},${FLAP_H}`}  fill="rgba(148,92,8,0.20)" />
              <Polygon points={`${ENV_W / 2},0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`} fill="rgba(255,210,100,0.12)" />
              <Polygon points={FLAP_TRI} fill="none" stroke="rgba(110,68,4,0.45)" strokeWidth="1.1" />
            </Svg>

            {/* Cachet de cire */}
            <Animated.View style={[styles.seal, sealStyle]}>
              <LinearGradient
                colors={['#C02828', '#7A0C0C', '#520808']}
                start={{ x: 0.3, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.sealRing} />
              <View style={styles.sealDot} />
            </Animated.View>
          </Animated.View>

        </Animated.View>
      </Animated.View>
    </View>
  );
}

const SEAL_R = 23;

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    // overflow:visible par défaut sur RN → la lettre peut sortir vers le haut
  },

  envelope: {
    position: 'absolute',
    left: 0,
    // overflow:visible → lettre visible au-dessus
    shadowColor: '#3A2000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },

  // z=1 — Lettre
  letter: {
    position: 'absolute',
    borderRadius: 4,
    overflow: 'hidden',
    zIndex: 1,
    shadowColor: '#1A1000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 4,
    elevation: 3,
  },
  letterBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: '#A07820',
    opacity: 0.45,
  },
  letterLine: {
    position: 'absolute',
    left: 12,
    height: 1,
    backgroundColor: '#8A6A18',
    borderRadius: 1,
  },
  letterBottomShadow: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 8,
    backgroundColor: 'rgba(80,48,0,0.07)',
  },

  // z=2 — Corps enveloppe (opaque, masque la lettre à l'intérieur)
  body: {
    position: 'absolute',
    top: 0, left: 0,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(140,90,10,0.35)',
  },
  bodyInner: {
    position: 'absolute',
    inset: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(200,155,40,0.22)',
  },

  // z=3 — Rabat
  flap: {
    position: 'absolute',
    top: 0, left: 0,
    zIndex: 3,
  },

  // Cachet de cire
  seal: {
    position: 'absolute',
    bottom: 8,
    left: ENV_W / 2 - SEAL_R,
    width: SEAL_R * 2,
    height: SEAL_R * 2,
    borderRadius: SEAL_R,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#180000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 9,
  },
  sealRing: {
    position: 'absolute',
    inset: 3,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(255,160,100,0.28)',
  },
  sealDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,180,130,0.42)',
  },
});
