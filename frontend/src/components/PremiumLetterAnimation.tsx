/**
 * PremiumLetterAnimation
 * Enveloppe fermée → rabat pivote en arrière (rotateX CSS natif sur web)
 * → intérieur clair révélé → lettre blanche sort partiellement.
 *
 * COUCHES (z-order, overflow:hidden) :
 *   z=1  backPanel    — intérieur de l'enveloppe, clair, visible quand rabat ouvert
 *   z=2  letter       — feuille blanche, part cachée dans la poche, monte ensuite
 *   z=3  frontPocket  — face avant (poche), toujours devant la lettre
 *   z=4  flap         — rabat, animation CSS rotateX sur web / scaleY sur native
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Polygon, Line } from 'react-native-svg';

const { width: SW } = Dimensions.get('window');

const ENV_W    = Math.min(SW - 80, 260);
const ENV_H    = Math.round(ENV_W * 0.65);
const FLAP_H   = Math.round(ENV_H * 0.45);
const POCKET_H = ENV_H - FLAP_H;

const LETTER_PEEK = Math.round(ENV_H * 0.35);
const CONTAINER_H = ENV_H + LETTER_PEEK;
const LETTER_H    = POCKET_H + LETTER_PEEK;
const LETTER_FINAL_Y = -Math.round(LETTER_PEEK * 0.50);

// SVG
const CX = ENV_W / 2;
const CY = POCKET_H / 2;
const FLAP_TRI = `0,0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`;

// Nom de la keyframe CSS injectée
const KEYFRAME_NAME = 'pla_flapOpen';

interface Props { senderName?: string }

export function PremiumLetterAnimation({ senderName: _ = '' }: Props) {
  const flapRef  = useRef<View>(null);
  const sceneOp  = useSharedValue(0);
  const flapOp   = useSharedValue(1);
  const letterY  = useSharedValue(FLAP_H);
  const letterOp = useSharedValue(0);
  const exitOp   = useSharedValue(1);

  useEffect(() => {
    // ── Inject CSS @keyframes une seule fois (web uniquement) ──────────────
    if (Platform.OS === 'web') {
      if (!document.getElementById(KEYFRAME_NAME)) {
        const sheet = document.createElement('style');
        sheet.id = KEYFRAME_NAME;
        sheet.textContent = `
          @keyframes ${KEYFRAME_NAME} {
            0%   { transform: perspective(700px) translateY(${FLAP_H / 2}px) rotateX(0deg)    translateY(${-FLAP_H / 2}px); }
            100% { transform: perspective(700px) translateY(${FLAP_H / 2}px) rotateX(-180deg) translateY(${-FLAP_H / 2}px); }
          }
        `;
        document.head.appendChild(sheet);
      }

      // Déclenche l'animation CSS sur le DOM node du flap après 800ms
      const timer = setTimeout(() => {
        const node = (flapRef.current as any)?._nativeTag
          ? null
          : (flapRef.current as any);
        // RN Web expose le DOM node via __internalInstanceHandle ou simplement via ref
        const domNode = (flapRef.current as any);
        if (domNode && domNode.style) {
          domNode.style.animationName        = KEYFRAME_NAME;
          domNode.style.animationDuration    = '0.55s';
          domNode.style.animationTimingFunction = 'ease-in-out';
          domNode.style.animationFillMode    = 'forwards';
          domNode.style.backfaceVisibility   = 'hidden';
        }
      }, 800);
      return () => clearTimeout(timer);
    }

    // ── Native : scaleY avec pivot haut (fallback) ─────────────────────────
    // (non visible sur web, mais garde le fallback propre pour iOS/Android)
  }, []);

  useEffect(() => {
    // Apparition
    sceneOp.value = withTiming(1, { duration: 250 });

    // Fade du flap à mi-animation
    flapOp.value = withDelay(1050, withTiming(0, { duration: 200 }));

    // Lettre sort
    letterOp.value = withDelay(1440, withTiming(1, { duration: 180 }));
    letterY.value  = withDelay(1440, withTiming(LETTER_FINAL_Y, {
      duration: 420,
      easing: Easing.out(Easing.ease),
    }));

    // Sortie
    exitOp.value = withDelay(2200, withTiming(0, {
      duration: 350,
      easing: Easing.in(Easing.ease),
    }));
  }, []);

  const sceneStyle  = useAnimatedStyle(() => ({ opacity: sceneOp.value }));
  const exitStyle   = useAnimatedStyle(() => ({ opacity: exitOp.value }));
  const flapStyle   = useAnimatedStyle(() => ({ opacity: flapOp.value }));
  const letterStyle = useAnimatedStyle(() => ({
    opacity: letterOp.value,
    transform: [{ translateY: letterY.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, exitStyle]}>
      <Animated.View style={sceneStyle}>
        <View style={[styles.envelopeContainer, { width: ENV_W, height: CONTAINER_H }]}>

          {/* z=1 — intérieur de l'enveloppe (clair), visible quand rabat ouvert */}
          <View style={[styles.backPanel, { top: LETTER_PEEK, width: ENV_W, height: ENV_H }]} />

          {/* z=2 — lettre blanche */}
          <Animated.View
            style={[
              styles.letter,
              { top: LETTER_PEEK, left: 10, width: ENV_W - 20, height: LETTER_H },
              letterStyle,
            ]}
          >
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.letterLine,
                  { top: 14 + i * 14, width: (['70%', '85%', '80%', '45%'][i]) as any },
                ]}
              />
            ))}
          </Animated.View>

          {/* z=3 — face avant poche avec plis en X */}
          <View style={[styles.frontPocket, { top: LETTER_PEEK + FLAP_H, width: ENV_W, height: POCKET_H }]}>
            <Svg width={ENV_W} height={POCKET_H} style={StyleSheet.absoluteFill}>
              <Line x1={0} y1={0} x2={CX} y2={CY} stroke="rgba(80,45,5,0.22)" strokeWidth="0.9" />
              <Line x1={ENV_W} y1={0} x2={CX} y2={CY} stroke="rgba(80,45,5,0.22)" strokeWidth="0.9" />
              <Line x1={0} y1={POCKET_H} x2={CX} y2={CY} stroke="rgba(80,45,5,0.18)" strokeWidth="0.9" />
              <Line x1={ENV_W} y1={POCKET_H} x2={CX} y2={CY} stroke="rgba(80,45,5,0.18)" strokeWidth="0.9" />
            </Svg>
            <View style={styles.foldLine} />
          </View>

          {/* z=4 — rabat (fond kraft + triangle visible + seal) */}
          {/* Sur web : animation CSS rotateX injectée via ref DOM */}
          <Animated.View
            ref={flapRef as any}
            style={[styles.flap, { top: LETTER_PEEK, width: ENV_W, height: FLAP_H }, flapStyle]}
          >
            <Svg width={ENV_W} height={FLAP_H} style={StyleSheet.absoluteFill}>
              <Polygon points={FLAP_TRI} fill="rgba(60,28,0,0.14)" />
              <Polygon points={FLAP_TRI} fill="none" stroke="rgba(70,35,3,0.35)" strokeWidth="1" />
            </Svg>
            <View style={[styles.seal, { bottom: Math.round(FLAP_H * 0.22), left: ENV_W / 2 - 13 }]} />
          </Animated.View>

          {/* Bordure de l'enveloppe */}
          <View
            style={[styles.outerBorder, { top: LETTER_PEEK, width: ENV_W, height: ENV_H }]}
            pointerEvents="none"
          />

        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },

  envelopeContainer: {
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
  },

  backPanel: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
    backgroundColor: '#E0C898',
    borderRadius: 6,
  },

  letter: {
    position: 'absolute',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    shadowColor: '#2A1500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  letterLine: {
    position: 'absolute',
    left: 12,
    height: 1,
    backgroundColor: '#707070',
    opacity: 0.22,
    borderRadius: 1,
  },

  frontPocket: {
    position: 'absolute',
    left: 0,
    zIndex: 3,
    backgroundColor: '#C4955C',
  },
  foldLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(70,38,5,0.25)',
  },

  flap: {
    position: 'absolute',
    left: 0,
    zIndex: 4,
    backgroundColor: '#C4955C',
    overflow: 'hidden',
  },

  seal: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#8B0000',
    zIndex: 5,
  },

  outerBorder: {
    position: 'absolute',
    left: 0,
    zIndex: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(80,45,5,0.30)',
  },
});
