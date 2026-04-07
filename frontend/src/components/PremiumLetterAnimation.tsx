/**
 * PremiumLetterAnimation
 *
 * Structure :
 *   Scene (overflow hidden)
 *   ├── EnvelopeBody  — kraft avec plis en X
 *   ├── LetterSlip    — papier crème visible dans l'ouverture
 *   └── FlapWrap      — triangle qui pivote depuis le bord supérieur (rotateX)
 *
 * Séquence (~1500ms) :
 *   0–350ms   arrivée spring
 *   350–500ms cachet pulse
 *   500–900ms rabat rotateX 0 → -170° (pivot bord haut)
 *   600–950ms lettre translateY 24→0 + opacity (100ms après le rabat)
 *   950–1200ms état ouvert visible
 *   1200–1500ms fondu sortie
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
  Easing,
} from 'react-native-reanimated';
import Svg, { Polygon, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW } = Dimensions.get('window');
const ENV_W  = Math.min(SW - 64, 284);
const ENV_H  = Math.round(ENV_W * 0.62);
const FLAP_H = Math.round(ENV_H * 0.48);

// Points SVG — rabat triangulaire pointe vers le bas
const FLAP_PTS = `0,0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`;

// Plis du corps (triangles gauche / droit / bas)
const FOLD_L = `0,0 0,${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;
const FOLD_R = `${ENV_W},0 ${ENV_W},${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;
const FOLD_B = `0,${ENV_H} ${ENV_W},${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;

interface Props { senderName?: string }

export function PremiumLetterAnimation({ senderName: _ = '' }: Props) {

  /* ── valeurs animées ── */
  const sceneOp  = useSharedValue(0);
  const sceneY   = useSharedValue(30);

  const sealSc   = useSharedValue(1);
  const sealOp   = useSharedValue(1);

  const flapRot  = useSharedValue(0);     // 0 → -170 deg
  const flapOp   = useSharedValue(1);

  const letterY  = useSharedValue(24);    // glisse depuis 24px vers 0
  const letterOp = useSharedValue(0);

  const exitOp   = useSharedValue(1);
  const exitSc   = useSharedValue(1);

  useEffect(() => {
    // 1 — arrivée
    sceneOp.value = withTiming(1, { duration: 280 });
    sceneY.value  = withSpring(0, { damping: 16, stiffness: 130 });

    // 2 — cachet pulse
    sealSc.value = withDelay(360, withSequence(
      withTiming(1.20, { duration: 160 }),
      withTiming(1.0,  { duration: 140 }),
      withTiming(1.10, { duration: 110 }),
      withTiming(1.0,  { duration: 110 }),
    ));
    sealOp.value = withDelay(490, withTiming(0, { duration: 180 }));

    // 3 — rabat s'ouvre (pivot haut, ease-in-out)
    flapRot.value = withDelay(520, withTiming(-170, {
      duration: 380,
      easing: Easing.inOut(Easing.quad),
    }));
    // masquer backface une fois invisible
    flapOp.value = withDelay(700, withTiming(0, { duration: 60 }));

    // 4 — lettre monte (100ms après le début du rabat)
    letterOp.value = withDelay(620, withTiming(1, { duration: 260 }));
    letterY.value  = withDelay(620, withSpring(0, {
      damping: 22, stiffness: 160, mass: 0.8,
    }));

    // 5 — sortie
    exitOp.value = withDelay(1200, withTiming(0, {
      duration: 300, easing: Easing.in(Easing.quad),
    }));
    exitSc.value = withDelay(1200, withTiming(0.94, { duration: 300 }));
  }, []);

  /* ── styles animés ── */

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

  /**
   * Pivot au bord SUPÉRIEUR du rabat.
   * Le rabat est positionné top:0, height:FLAP_H.
   * Son centre RN est à y=FLAP_H/2.
   * Pour pivoter sur le bord haut (y=0), on :
   *   1. translateY(+FLAP_H/2)  → déplace le centre vers le bas = bord haut à y=0
   *   2. rotateX               → pivote autour du nouveau centre = bord haut original
   *   3. translateY(-FLAP_H/2) → restitue la position
   */
  const flapStyle = useAnimatedStyle(() => ({
    opacity: flapOp.value,
    transform: [
      { translateY:  FLAP_H / 2 },
      { perspective: 700 },
      { rotateX: `${flapRot.value}deg` },
      { translateY: -FLAP_H / 2 },
    ],
  }));

  const letterStyle = useAnimatedStyle(() => ({
    opacity: letterOp.value,
    transform: [{ translateY: letterY.value }],
  }));

  /* ── rendu ── */
  return (
    <View style={[styles.outer, { height: ENV_H }]}>
      <Animated.View style={exitStyle}>
        <Animated.View style={[styles.scene, { width: ENV_W, height: ENV_H }, sceneStyle]}>

          {/* Corps de l'enveloppe — kraft avec plis */}
          <View style={[styles.body, { width: ENV_W, height: ENV_H }]}>
            <LinearGradient
              colors={['#E2C47A', '#D4AD5C', '#C89A3E']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Svg
              width={ENV_W}
              height={ENV_H}
              style={StyleSheet.absoluteFill}
            >
              <Polygon points={FOLD_L} fill="rgba(150,100,15,0.12)" stroke="rgba(130,85,10,0.28)" strokeWidth="0.7" />
              <Polygon points={FOLD_R} fill="rgba(200,160,50,0.06)" stroke="rgba(130,85,10,0.28)" strokeWidth="0.7" />
              <Polygon points={FOLD_B} fill="rgba(160,110,20,0.10)" stroke="rgba(130,85,10,0.28)" strokeWidth="0.7" />
            </Svg>
            {/* Bordure intérieure fine */}
            <View style={styles.bodyInner} />
          </View>

          {/* Papier lettre — glisse dans l'ouverture quand le rabat s'ouvre */}
          <Animated.View
            style={[
              styles.letterSlip,
              { width: ENV_W - 18, height: FLAP_H - 6, left: 9, top: 3 },
              letterStyle,
            ]}
          >
            <LinearGradient
              colors={['#F9F2E2', '#F4EAD0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Accent gauche */}
            <View style={styles.letterAccent} />
            {/* Lignes simulées */}
            <View style={styles.letterLines}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={[styles.letterLine, { width: i === 2 ? '55%' : '85%', opacity: 0.22 + i * 0.04 }]}
                />
              ))}
            </View>
            {/* Micro shadow bas */}
            <View style={styles.letterShadowBottom} />
          </Animated.View>

          {/* Rabat — triangle qui pivote depuis le bord haut */}
          <Animated.View
            style={[
              styles.flapWrap,
              { width: ENV_W, height: FLAP_H },
              flapStyle,
            ]}
          >
            <Svg width={ENV_W} height={FLAP_H} style={StyleSheet.absoluteFill}>
              {/* Remplissage du triangle */}
              <Polygon points={FLAP_PTS} fill="#C8963A" />
              {/* Ombre légère gauche */}
              <Polygon
                points={`0,0 ${ENV_W / 2},0 ${ENV_W / 2},${FLAP_H}`}
                fill="rgba(160,100,10,0.18)"
              />
              {/* Reflet droit */}
              <Polygon
                points={`${ENV_W / 2},0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`}
                fill="rgba(255,220,120,0.12)"
              />
              {/* Contour du triangle */}
              <Polygon
                points={FLAP_PTS}
                fill="none"
                stroke="rgba(120,75,5,0.45)"
                strokeWidth="1.1"
              />
            </Svg>

            {/* Cachet de cire */}
            <Animated.View style={[styles.seal, sealStyle]}>
              <LinearGradient
                colors={['#B83030', '#7A0F0F', '#550A0A']}
                start={{ x: 0.25, y: 0 }}
                end={{ x: 0.75, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.sealRing} />
              <View style={styles.sealCenter} />
            </Animated.View>
          </Animated.View>

        </Animated.View>
      </Animated.View>
    </View>
  );
}

const SEAL_SIZE = 48;

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  scene: {
    position: 'relative',
    overflow: 'hidden',       // ← contient tous les débordements 3D
    borderRadius: 10,
    shadowColor: '#3A2000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },

  // Corps
  body: {
    position: 'absolute',
    top: 0, left: 0,
    borderRadius: 10,
    overflow: 'hidden',
  },
  bodyInner: {
    position: 'absolute',
    inset: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(190,145,35,0.28)',
  },

  // Papier lettre
  letterSlip: {
    position: 'absolute',
    borderRadius: 4,
    overflow: 'hidden',
    zIndex: 1,
    shadowColor: '#2A1500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
  },
  letterAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 2.5,
    backgroundColor: '#B8902A',
    opacity: 0.55,
  },
  letterLines: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    gap: 9,
  },
  letterLine: {
    height: 1,
    backgroundColor: '#8A6A20',
    borderRadius: 1,
  },
  letterShadowBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 6,
    backgroundColor: 'rgba(100,60,0,0.06)',
  },

  // Rabat
  flapWrap: {
    position: 'absolute',
    top: 0, left: 0,
    zIndex: 2,
  },

  // Cachet
  seal: {
    position: 'absolute',
    bottom: 7,
    left: (ENV_W - SEAL_SIZE) / 2,
    width: SEAL_SIZE,
    height: SEAL_SIZE,
    borderRadius: SEAL_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 7,
    elevation: 9,
  },
  sealRing: {
    position: 'absolute',
    inset: 3,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(255,170,120,0.32)',
  },
  sealCenter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,190,150,0.50)',
  },
});
