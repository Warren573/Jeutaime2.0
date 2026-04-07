/**
 * PremiumLetterAnimation — 4 PNG assets, CSS clip-path for pocket illusion
 *
 * Structure (z-order) :
 *   z=1  env-back   → envelope-open-back.png  (full image)
 *   z=2  env-letter → letter.png              (rises from inside)
 *   z=3  env-front  → envelope-open-back.png  (même image, clippée : poche seulement)
 *   z=4  env-closed → envelope-closed.png     (fades out en premier)
 *
 * La poche (env-front) masque le bas de la lettre → illusion de sortie.
 *
 * Timeline :
 *   t=  0 ms  env-closed visible, resto invisible
 *   t=600 ms  is-open → closed fade-out (320ms), back fade-in (360ms),
 *                        front fade-in (360ms, delay 120ms),
 *                        letter rise (800ms, delay 480ms)
 *   t=4200ms  is-out  → scène fade-out (700ms)
 *   LettersScreen unmount : 5100ms > 4900ms ✓
 */
import React, { useEffect, useState } from 'react';
import { Platform, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

// ─── Asset sources ────────────────────────────────────────────────────────────
const ENV_BACK_SRC   = require('../../assets/envelope/envelope-open-back.png');
const LETTER_SRC     = require('../../assets/envelope/letter.png');
const ENV_CLOSED_SRC = require('../../assets/envelope/envelope-closed.png');

// ─── CSS injection (web only) ─────────────────────────────────────────────────
const CSS_ID = 'pla-envelope-styles';

function injectCSS() {
  const existing = document.getElementById(CSS_ID);
  if (existing) existing.remove();
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .env-scene {
      position: relative;
      width: min(88vw, 400px);
      aspect-ratio: 1.45;
      margin: 0 auto;
      overflow: visible;
      transition: opacity 700ms ease-in;
    }
    .env-scene.is-out { opacity: 0; }

    .env-layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    /* ── État initial ── */
    .env-back {
      z-index: 1;
      opacity: 0;
      transition: opacity 360ms ease;
    }
    .env-letter {
      z-index: 2;
      opacity: 0;
      transform: translateY(40%);
      transition:
        transform 800ms cubic-bezier(0.22, 1, 0.36, 1) 480ms,
        opacity   300ms ease                            480ms;
    }
    .env-front {
      z-index: 3;
      opacity: 0;
      transition: opacity 360ms ease 120ms;
      /* Seule la poche (partie basse) reste visible */
      clip-path: polygon(0% 45%, 100% 45%, 100% 100%, 0% 100%);
    }
    .env-closed {
      z-index: 4;
      opacity: 1;
      transition: opacity 320ms ease;
    }

    /* ── État ouvert ── */
    .env-scene.is-open .env-back   { opacity: 1; }
    .env-scene.is-open .env-closed { opacity: 0; }
    .env-scene.is-open .env-front  { opacity: 1; }
    .env-scene.is-open .env-letter {
      opacity: 1;
      transform: translateY(-20%);
    }
  `;
  document.head.appendChild(style);
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props { senderName?: string }

export function PremiumLetterAnimation({ senderName: _ = '' }: Props) {
  if (Platform.OS === 'web') return <WebEnvelope />;
  return <NativeEnvelope />;
}

// ─── Web version (CSS injection + HTML img) ───────────────────────────────────
function WebEnvelope() {
  const [phase, setPhase] = useState<'idle' | 'open' | 'out'>('idle');

  useEffect(() => {
    injectCSS();
    const t1 = setTimeout(() => setPhase('open'), 600);
    const t2 = setTimeout(() => setPhase('out'),  4200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const cls = [
    'env-scene',
    phase !== 'idle' ? 'is-open' : '',
    phase === 'out'  ? 'is-out'  : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      {/* z=1 — dos enveloppe ouverte */}
      <img className="env-layer env-back"   src={ENV_BACK_SRC}   alt="" draggable={false} />
      {/* z=2 — lettre (monte entre back et front) */}
      <img className="env-layer env-letter" src={LETTER_SRC}     alt="" draggable={false} />
      {/* z=3 — même image que back, clip-path = poche seulement */}
      <img className="env-layer env-front"  src={ENV_BACK_SRC}   alt="" draggable={false} />
      {/* z=4 — enveloppe fermée (disparaît en premier) */}
      <img className="env-layer env-closed" src={ENV_CLOSED_SRC} alt="" draggable={false} />
    </div>
  );
}

// ─── Native fallback ──────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const ENV_W        = Math.min(SW * 0.88, 400);
const ENV_H        = Math.round(ENV_W / 1.45);
const LETTER_START = Math.round(ENV_H * 0.40);
const LETTER_END   = -Math.round(ENV_H * 0.20);

function NativeEnvelope() {
  const sceneOp  = useSharedValue(1);
  const closedOp = useSharedValue(1);
  const backOp   = useSharedValue(0);
  const frontOp  = useSharedValue(0);
  const letterOp = useSharedValue(0);
  const letterY  = useSharedValue(LETTER_START);

  useEffect(() => {
    closedOp.value = withDelay(600,  withTiming(0, { duration: 320, easing: Easing.out(Easing.ease) }));
    backOp.value   = withDelay(600,  withTiming(1, { duration: 360, easing: Easing.out(Easing.ease) }));
    frontOp.value  = withDelay(720,  withTiming(1, { duration: 360, easing: Easing.out(Easing.ease) }));
    letterOp.value = withDelay(1080, withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }));
    letterY.value  = withDelay(1080, withTiming(LETTER_END, { duration: 800, easing: Easing.out(Easing.cubic) }));
    sceneOp.value  = withDelay(4200, withTiming(0, { duration: 700, easing: Easing.in(Easing.ease) }));
  }, []);

  const sceneStyle  = useAnimatedStyle(() => ({ opacity: sceneOp.value }));
  const closedStyle = useAnimatedStyle(() => ({ opacity: closedOp.value }));
  const backStyle   = useAnimatedStyle(() => ({ opacity: backOp.value }));
  const frontStyle  = useAnimatedStyle(() => ({ opacity: frontOp.value }));
  const letterStyle = useAnimatedStyle(() => ({
    opacity: letterOp.value,
    transform: [{ translateY: letterY.value }],
  }));

  return (
    <Animated.View style={[nStyles.scene, sceneStyle]}>
      <Animated.View style={[nStyles.layer, { zIndex: 1 }, backStyle]}>
        <Image source={ENV_BACK_SRC} style={nStyles.img} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[nStyles.layer, { zIndex: 2 }, letterStyle]}>
        <Image source={LETTER_SRC} style={nStyles.img} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[nStyles.layer, { zIndex: 3 }, frontStyle]}>
        <Image source={ENV_BACK_SRC} style={nStyles.img} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[nStyles.layer, { zIndex: 4 }, closedStyle]}>
        <Image source={ENV_CLOSED_SRC} style={nStyles.img} contentFit="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const nStyles = StyleSheet.create({
  scene: {
    width: ENV_W,
    height: ENV_H,
    alignSelf: 'center',
  },
  layer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  img: {
    width: '100%' as any,
    height: '100%' as any,
  },
});
