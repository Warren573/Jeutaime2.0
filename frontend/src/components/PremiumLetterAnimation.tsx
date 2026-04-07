/**
 * PremiumLetterAnimation — Enveloppe qui s'ouvre (style référence)
 *
 * Séquence :
 *   1. Enveloppe arrive en spring
 *   2. Cachet pulse
 *   3. Rabat se plie vers le haut (scaleY 1→0, pivot en bas du rabat)
 *   4. Enveloppe ouverte visible brièvement
 *   5. Fondu de sortie
 *
 * Pas de rotateX = pas de débordement 3D possible.
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
import Svg, { Polygon, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW } = Dimensions.get('window');
const ENV_W  = Math.min(SW - 64, 280);
const ENV_H  = Math.round(ENV_W * 0.64);
const FLAP_H = Math.round(ENV_H * 0.50);   // hauteur du triangle fermé

// ── Géométrie SVG ───────────────────────────────────────────────────────────────

// Rabat fermé : triangle avec pointe vers le bas (milieu de l'enveloppe)
const FLAP_CLOSED = `0,0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`;

// Corps : triangle gauche, droit, bas (les 3 plis visibles sur le devant)
const FOLD_LEFT  = `0,0 0,${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;
const FOLD_RIGHT = `${ENV_W},0 ${ENV_W},${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;
const FOLD_BTM   = `0,${ENV_H} ${ENV_W},${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;

// Ouverture quand le rabat est levé : triangle pointant vers le HAUT
const OPENING = `0,0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`;

interface Props {
  senderName?: string;
}

export function PremiumLetterAnimation({ senderName: _senderName = 'Sophie' }: Props) {

  // ── Conteneur global ──────────────────────────────────────────────────────────
  const wrapOpacity    = useSharedValue(0);
  const wrapTranslateY = useSharedValue(40);
  const wrapScale      = useSharedValue(0.92);

  // ── Cachet ────────────────────────────────────────────────────────────────────
  const sealScale   = useSharedValue(1);
  const sealOpacity = useSharedValue(1);

  // ── Rabat (plie vers le haut : scaleY 1→0, pivot sur le bord bas du rabat) ───
  const flapScaleY  = useSharedValue(1);
  const flapOpacity = useSharedValue(1);

  // ── Ouverture visible (triangle sombre en haut après pli) ────────────────────
  const openingOpacity = useSharedValue(0);

  // ── Sortie globale ────────────────────────────────────────────────────────────
  const exitOpacity = useSharedValue(1);
  const exitScale   = useSharedValue(1);

  useEffect(() => {
    // 1 — Arrivée (0–380ms)
    wrapOpacity.value    = withTiming(1, { duration: 300 });
    wrapTranslateY.value = withSpring(0, { damping: 13, stiffness: 115 });
    wrapScale.value      = withSequence(
      withTiming(1.04, { duration: 180 }),
      withTiming(1.0,  { duration: 160 }),
    );

    // 2 — Cachet pulse (350–700ms)
    sealScale.value = withDelay(360, withSequence(
      withTiming(1.22, { duration: 190 }),
      withTiming(1.0,  { duration: 160 }),
      withTiming(1.12, { duration: 130 }),
      withTiming(1.0,  { duration: 120 }),
    ));

    // 3 — Cachet s'efface (700ms)
    sealOpacity.value = withDelay(700, withTiming(0, { duration: 200 }));

    // 4 — Rabat se plie : scaleY 1→0, pivot bas du rabat (730–1100ms)
    flapScaleY.value  = withDelay(730, withTiming(0, {
      duration: 370,
      easing: Easing.inOut(Easing.quad),
    }));
    flapOpacity.value = withDelay(820, withTiming(0, { duration: 280 }));

    // 5 — Ouverture apparaît quand le rabat disparaît (1050ms)
    openingOpacity.value = withDelay(1050, withTiming(1, { duration: 120 }));

    // 6 — Fondu de sortie (1250–1550ms)
    exitOpacity.value = withDelay(1250, withTiming(0, {
      duration: 300, easing: Easing.in(Easing.quad),
    }));
    exitScale.value = withDelay(1250, withTiming(0.94, { duration: 300 }));
  }, []);

  // ── Styles animés ─────────────────────────────────────────────────────────────

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: wrapOpacity.value,
    transform: [
      { translateY: wrapTranslateY.value },
      { scale: wrapScale.value },
    ],
  }));

  const exitStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
    transform: [{ scale: exitScale.value }],
  }));

  const sealStyle = useAnimatedStyle(() => ({
    opacity: sealOpacity.value,
    transform: [{ scale: sealScale.value }],
  }));

  // Pivot en bas du rabat : translateY(+FLAP_H/2) → scaleY → translateY(-FLAP_H/2)
  // Le bord bas du triangle reste fixe, le triangle se replie vers lui
  const flapStyle = useAnimatedStyle(() => ({
    opacity: flapOpacity.value,
    transform: [
      { translateY:  FLAP_H / 2 },
      { scaleY: flapScaleY.value },
      { translateY: -FLAP_H / 2 },
    ],
  }));

  const openingStyle = useAnimatedStyle(() => ({
    opacity: openingOpacity.value,
  }));

  // ── Rendu ─────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.outer, { height: ENV_H + 16 }]}>
      <Animated.View style={exitStyle}>
        <Animated.View style={[styles.scene, { width: ENV_W, height: ENV_H }, wrapStyle]}>

          {/* ── Corps de l'enveloppe ── */}
          <View style={[styles.envBody, { width: ENV_W, height: ENV_H }]}>
            <LinearGradient
              colors={['#EACF8C', '#E0BE72', '#D4A84E']}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Svg width={ENV_W} height={ENV_H} style={StyleSheet.absoluteFill}>
              {/* Triangle gauche */}
              <Polygon
                points={FOLD_LEFT}
                fill="rgba(160,110,30,0.13)"
                stroke="rgba(140,95,20,0.30)"
                strokeWidth="0.8"
              />
              {/* Triangle droit */}
              <Polygon
                points={FOLD_RIGHT}
                fill="rgba(200,160,60,0.07)"
                stroke="rgba(140,95,20,0.30)"
                strokeWidth="0.8"
              />
              {/* Triangle bas */}
              <Polygon
                points={FOLD_BTM}
                fill="rgba(170,120,30,0.11)"
                stroke="rgba(140,95,20,0.30)"
                strokeWidth="0.8"
              />
            </Svg>
            {/* Bordure intérieure fine */}
            <View style={styles.envInner} />
          </View>

          {/* ── Ouverture visible après le pli (triangle sombre au-dessus) ── */}
          <Animated.View
            style={[
              styles.openingWrap,
              { width: ENV_W, height: FLAP_H },
              openingStyle,
            ]}
            pointerEvents="none"
          >
            <Svg width={ENV_W} height={FLAP_H} style={StyleSheet.absoluteFill}>
              {/* Zone intérieure sombre de l'enveloppe ouverte */}
              <Polygon
                points={OPENING}
                fill="rgba(100,65,10,0.18)"
                stroke="rgba(130,85,15,0.35)"
                strokeWidth="1"
              />
            </Svg>
          </Animated.View>

          {/* ── Rabat triangulaire (se plie vers le haut) ── */}
          <Animated.View
            style={[
              styles.flapWrap,
              { width: ENV_W, height: FLAP_H },
              flapStyle,
            ]}
          >
            <Svg width={ENV_W} height={FLAP_H} style={StyleSheet.absoluteFill}>
              {/* Remplissage principal du rabat */}
              <Polygon points={FLAP_CLOSED} fill="#D8B05A" />
              {/* Ombre gauche du rabat */}
              <Polygon
                points={`0,0 ${ENV_W / 2},0 ${ENV_W / 2},${FLAP_H}`}
                fill="rgba(180,130,30,0.20)"
              />
              {/* Lumière droite du rabat */}
              <Polygon
                points={`${ENV_W / 2},0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`}
                fill="rgba(255,235,150,0.15)"
              />
              {/* Contour du triangle */}
              <Polygon
                points={FLAP_CLOSED}
                fill="none"
                stroke="rgba(140,90,10,0.50)"
                strokeWidth="1.2"
              />
            </Svg>

            {/* Cachet de cire */}
            <Animated.View style={[styles.sealWrap, sealStyle]}>
              <LinearGradient
                colors={['#C8352A', '#8B1515', '#5C0D0D']}
                start={{ x: 0.3, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Anneau extérieur */}
              <View style={styles.sealRingOuter} />
              {/* Anneau intérieur */}
              <View style={styles.sealRingInner} />
              {/* Motif central */}
              <View style={styles.sealDot} />
            </Animated.View>
          </Animated.View>

        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scene: {
    position: 'relative',
    // Pas d'overflow: visible → le rabat ne peut pas déborder
    overflow: 'hidden',
    borderRadius: 12,
    // Ombre portée de l'enveloppe
    shadowColor: '#5A3800',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 10,
  },

  // Corps enveloppe
  envBody: {
    position: 'absolute',
    top: 0, left: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  envInner: {
    position: 'absolute',
    inset: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,155,40,0.30)',
  },

  // Zone ouverte visible après le pli
  openingWrap: {
    position: 'absolute',
    top: 0, left: 0,
    zIndex: 1,
  },

  // Rabat
  flapWrap: {
    position: 'absolute',
    top: 0, left: 0,
    zIndex: 2,
    overflow: 'hidden',
  },

  // Cachet de cire
  sealWrap: {
    position: 'absolute',
    bottom: 8,
    left: ENV_W / 2 - 26,
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2A0800',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 10,
  },
  sealRingOuter: {
    position: 'absolute',
    inset: 2,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,180,120,0.35)',
  },
  sealRingInner: {
    position: 'absolute',
    inset: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,180,120,0.20)',
  },
  sealDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,200,160,0.55)',
  },
});
