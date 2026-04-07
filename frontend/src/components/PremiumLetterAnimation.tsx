/**
 * PremiumLetterAnimation
 * Web: pure HTML/CSS with rotateX 3D flap animation
 * Native: Reanimated fallback (scaleY)
 */
import React, { useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const CSS_ID = 'pla-styles';

function injectCSS() {
  const existing = document.getElementById(CSS_ID);
  if (existing) existing.remove();
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .real-envelope, .real-envelope * { box-sizing: border-box; }

    /* ── Container ── */
    .real-envelope {
      --env-base: #c89a5f;
      --env-light: #d9b07a;
      --env-dark: #b88549;
      --paper: #f5ecd9;
      --paper-line: rgba(120, 92, 55, 0.18);
      --seal-red: #9f201f;
      --seal-dark: #6f1212;

      position: relative;
      width: min(84vw, 360px);
      aspect-ratio: 1.45 / 1;
      margin: 0 auto;
      perspective: 1600px;
      transition: opacity 1000ms ease;
    }
    .real-envelope.is-out { opacity: 0; }

    /* grain texture overlay */
    .real-envelope::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 20;
      opacity: 0.14;
      background-image:
        radial-gradient(circle at 12% 18%, rgba(255,255,255,0.22) 0 1px, transparent 1.5px),
        radial-gradient(circle at 78% 36%, rgba(0,0,0,0.10) 0 1px, transparent 1.5px),
        radial-gradient(circle at 42% 74%, rgba(255,255,255,0.14) 0 1px, transparent 1.4px),
        radial-gradient(circle at 64% 82%, rgba(0,0,0,0.08) 0 1px, transparent 1.6px),
        radial-gradient(circle at 28% 56%, rgba(0,0,0,0.05) 0 0.8px, transparent 1.3px);
    }
    /* rectangular outline on the BACK (z=1) so it never crosses the letter */
    .real-envelope__back {
      position: absolute;
      inset: 0;
      z-index: 1;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0) 20%),
        linear-gradient(135deg, #d7b07c 0%, var(--env-base) 45%, #bf8f56 100%);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.18),
        inset 0 -2px 10px rgba(96, 58, 18, 0.08),
        0 0 0 1.5px rgba(80,45,8,0.48),
        0 10px 32px rgba(60,30,5,0.26),
        0 2px 8px rgba(60,30,5,0.14);
      overflow: hidden;
    }

    /* ── Letter ── */
    .real-envelope__letter {
      position: absolute;
      left: 50%;
      top: 8%;
      width: 82%;
      height: 92%;
      transform: translateX(-50%) translateY(42%);
      opacity: 0;
      transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease;
      z-index: 2;
      pointer-events: none;
    }
    .real-envelope.is-open .real-envelope__letter {
      transform: translateX(-50%) translateY(-35%);
      opacity: 1;
      transition-delay: 1200ms;
      z-index: 4; /* flap open = z:3, pocket = z:5 → letter entre les deux */
    }
    .real-envelope__letter-paper {
      width: 100%;
      height: 100%;
      /* warm parchment, not stark white */
      background: linear-gradient(170deg, #faf4e8 0%, #f5ead5 55%, #ede0c4 100%);
      box-shadow:
        0 6px 20px rgba(0,0,0,0.13),
        0 1px 4px rgba(0,0,0,0.08),
        inset 0 1px 0 rgba(255,255,255,0.70);
      position: relative;
      overflow: hidden;
    }
    /* subtle left margin line + top fold shadow */
    .real-envelope__letter-paper::before {
      content: "";
      position: absolute;
      top: 0; left: 22px; bottom: 0;
      width: 1px;
      background: rgba(180,120,60,0.14);
    }
    .real-envelope__letter-paper::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.04) 0px, transparent 12px);
      pointer-events: none;
    }
    .real-envelope__letter-lines {
      padding: 16px 14px 14px 30px;
      display: flex;
      flex-direction: column;
      gap: 11px;
    }
    .real-envelope__letter-lines span {
      display: block;
      height: 1px;
      background: rgba(110, 78, 38, 0.22);
    }
    .real-envelope__letter-lines span:nth-child(1) { width: 64%; }
    .real-envelope__letter-lines span:nth-child(2) { width: 88%; }
    .real-envelope__letter-lines span:nth-child(3) { width: 82%; }
    .real-envelope__letter-lines span:nth-child(4) { width: 74%; }
    .real-envelope__letter-lines span:nth-child(5) { width: 86%; }
    .real-envelope__letter-lines span:nth-child(6) { width: 52%; }

    /* ── Side flaps ── */
    .real-envelope__side {
      position: absolute;
      bottom: 0;
      width: 50%;
      height: 78%;
      z-index: 4;
      overflow: hidden;
    }
    .real-envelope__side::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.10), transparent 24%),
        linear-gradient(135deg, #d3aa73 0%, #c39258 100%);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.12),
        inset 0 -1px 0 rgba(120, 74, 24, 0.10);
    }
    .real-envelope__side--left {
      left: 0;
      clip-path: polygon(0 0, 100% 52%, 0 100%);
    }
    .real-envelope__side--left::after {
      content: "";
      position: absolute;
      inset: 0;
      clip-path: polygon(0 0, 100% 52%, 0 100%);
      background: linear-gradient(135deg, transparent 50%, rgba(80, 45, 10, 0.42) 100%);
    }
    .real-envelope__side--right {
      right: 0;
      clip-path: polygon(100% 0, 0 52%, 100% 100%);
    }
    .real-envelope__side--right::after {
      content: "";
      position: absolute;
      inset: 0;
      clip-path: polygon(100% 0, 0 52%, 100% 100%);
      background: linear-gradient(225deg, transparent 50%, rgba(80, 45, 10, 0.42) 100%);
    }

    /* ── Bottom pocket — always in front of letter ── */
    .real-envelope__bottom {
      position: absolute;
      left: 0; right: 0; bottom: 0;
      height: 58%;
      z-index: 5;
      clip-path: polygon(0 0, 50% 69%, 100% 0, 100% 100%, 0 100%);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.08), transparent 20%),
        linear-gradient(135deg, #ddb671 0%, #c99658 45%, #bc8648 100%);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.18),
        inset 0 -2px 6px rgba(103, 63, 22, 0.12);
    }
    .real-envelope__bottom::before {
      content: "";
      position: absolute;
      top: 0; bottom: 0; left: 0;
      width: 52%;
      pointer-events: none;
      background: linear-gradient(41deg, transparent 48.5%, rgba(80,45,10,0.55) 49.5%, rgba(255,255,255,0.14) 50.5%, transparent 51.5%);
    }
    .real-envelope__bottom::after {
      content: "";
      position: absolute;
      top: 0; bottom: 0; right: 0;
      width: 52%;
      pointer-events: none;
      background: linear-gradient(-41deg, transparent 48.5%, rgba(80,45,10,0.55) 49.5%, rgba(255,255,255,0.14) 50.5%, transparent 51.5%);
    }

    /* ── Top flap (rotation GROUP — no clip-path so seal is never clipped) ── */
    .real-envelope__top-flap {
      position: absolute;
      left: 0; right: 0; top: 0;
      height: 58%;
      z-index: 8;
      transform-origin: top center;
      transform: rotateX(0deg);
      transition: transform 1100ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .real-envelope.is-open .real-envelope__top-flap {
      transform: rotateX(180deg);
      z-index: 3;
    }

    /* triangle SHAPE child — carries clip-path + visual */
    .real-envelope__top-flap-shape {
      position: absolute;
      inset: 0;
      clip-path: polygon(0 0, 100% 0, 50% 76%);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.10), transparent 22%),
        linear-gradient(135deg, #d6ae78 0%, #c39258 60%, #b88146 100%);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.18),
        inset 0 -2px 10px rgba(92, 58, 21, 0.12);
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    /* fold crease lines on triangle — stronger for readability */
    .real-envelope__top-flap-shape::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(139deg, transparent 48.5%, rgba(75,42,10,0.58) 49.5%, rgba(255,255,255,0.18) 50.5%, transparent 51.5%),
        linear-gradient(221deg, transparent 48.5%, rgba(75,42,10,0.58) 49.5%, rgba(255,255,255,0.18) 50.5%, transparent 51.5%);
      pointer-events: none;
    }

    /* seal — même style que LettersScreen envStyles.sealMini :
       cercle #7A1A1A 36×36px + emoji ⚜️ fontSize 18px + ombre rouge */
    .real-envelope__seal {
      position: absolute;
      left: 50%;
      bottom: 5%;
      width: 36px;
      height: 36px;
      transform: translateX(-50%);
      z-index: 9;
      border-radius: 50%;
      background: #7A1A1A;
      box-shadow:
        0 2px 5px rgba(122,26,26,0.55),
        0 4px 10px rgba(70,10,10,0.30);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      line-height: 36px;
      text-align: center;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
  `;
  document.head.appendChild(style);
}

interface Props { senderName?: string }

export function PremiumLetterAnimation({ senderName: _ = '' }: Props) {
  if (Platform.OS === 'web') {
    return <WebEnvelope />;
  }
  return <NativeEnvelope />;
}

// ─── Web version ──────────────────────────────────────────────────────────────

function WebEnvelope() {
  const [phase, setPhase] = useState<'idle' | 'open' | 'out'>('idle');

  useEffect(() => {
    injectCSS();
    // Timeline: open at 600ms, flap 1000ms, pause 400ms, letter 1000ms, hold 1200ms, fade 700ms → total ≈ 4900ms
    // LettersScreen must unmount AFTER 5000ms (see setTimeout there)
    const t1 = setTimeout(() => setPhase('open'), 600);
    const t2 = setTimeout(() => setPhase('out'), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const envClass = [
    'real-envelope',
    (phase === 'open' || phase === 'out') ? 'is-open' : '',
    phase === 'out' ? 'is-out' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={envClass}>
      {/* z=1 — dos kraft */}
      <div className="real-envelope__back" />

      {/* z=2 — lettre, masquée par la pocket en bas */}
      <div className="real-envelope__letter">
        <div className="real-envelope__letter-paper">
          <div className="real-envelope__letter-lines">
            <span /><span /><span /><span /><span /><span />
          </div>
        </div>
      </div>

      {/* z=4 — rabats latéraux */}
      <div className="real-envelope__side real-envelope__side--left" />
      <div className="real-envelope__side real-envelope__side--right" />

      {/* z=5 — poche basse, toujours devant la lettre */}
      <div className="real-envelope__bottom" />

      {/* z=8 — groupe rotation du rabat (NO clip-path → seal non clippé) */}
      <div className="real-envelope__top-flap">
        <div className="real-envelope__top-flap-shape" />
        <div className="real-envelope__seal">⚜️</div>
      </div>
    </div>
  );
}

// ─── Native fallback (iOS / Android) ──────────────────────────────────────────

const { width: SW } = Dimensions.get('window');
const ENV_W    = Math.min(SW - 80, 260);
const ENV_H    = Math.round(ENV_W * 0.65);
const FLAP_H   = Math.round(ENV_H * 0.45);
const POCKET_H = ENV_H - FLAP_H;
const LETTER_PEEK = Math.round(ENV_H * 0.35);
const CONTAINER_H = ENV_H + LETTER_PEEK;
const LETTER_H    = POCKET_H + LETTER_PEEK;
const LETTER_FINAL_Y = -Math.round(LETTER_PEEK * 0.55);

function NativeEnvelope() {
  const sceneOp  = useSharedValue(0);
  const flapSY   = useSharedValue(1);
  const letterY  = useSharedValue(FLAP_H);
  const letterOp = useSharedValue(0);
  const exitOp   = useSharedValue(1);

  useEffect(() => {
    sceneOp.value = withTiming(1, { duration: 250 });
    flapSY.value  = withDelay(700, withTiming(0, { duration: 450, easing: Easing.inOut(Easing.ease) }));
    letterOp.value = withDelay(1300, withTiming(1, { duration: 200 }));
    letterY.value  = withDelay(1300, withTiming(LETTER_FINAL_Y, { duration: 450, easing: Easing.out(Easing.ease) }));
    exitOp.value   = withDelay(2200, withTiming(0, { duration: 350, easing: Easing.in(Easing.ease) }));
  }, []);

  const sceneStyle  = useAnimatedStyle(() => ({ opacity: sceneOp.value }));
  const exitStyle   = useAnimatedStyle(() => ({ opacity: exitOp.value }));
  const flapStyle   = useAnimatedStyle(() => ({
    transform: [{ scaleY: flapSY.value }],
    opacity: flapSY.value,
  }));
  const letterStyle = useAnimatedStyle(() => ({
    opacity: letterOp.value,
    transform: [{ translateY: letterY.value }],
  }));

  return (
    <Animated.View style={[nStyles.wrapper, exitStyle]}>
      <Animated.View style={sceneStyle}>
        <View style={[nStyles.container, { width: ENV_W, height: CONTAINER_H }]}>
          <View style={[nStyles.back, { top: LETTER_PEEK, width: ENV_W, height: ENV_H }]} />
          <Animated.View style={[nStyles.letter, { top: LETTER_PEEK, left: 10, width: ENV_W - 20, height: LETTER_H }, letterStyle]}>
            {[0,1,2,3].map(i => (
              <View key={i} style={[nStyles.letterLine, { top: 14 + i*14, width: (['70%','85%','80%','45%'][i]) as any }]} />
            ))}
          </Animated.View>
          <View style={[nStyles.pocket, { top: LETTER_PEEK + FLAP_H, width: ENV_W, height: POCKET_H }]} />
          <Animated.View style={[nStyles.flap, { top: LETTER_PEEK, width: ENV_W, height: FLAP_H }, flapStyle]}>
            <View style={[nStyles.seal, { bottom: Math.round(FLAP_H * 0.18), left: ENV_W / 2 - 18 }]}>
              <Text style={nStyles.sealEmoji}>⚜️</Text>
            </View>
          </Animated.View>
          <View style={[nStyles.border, { top: LETTER_PEEK, width: ENV_W, height: ENV_H }]} pointerEvents="none" />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const nStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  container: { position: 'relative', overflow: 'hidden', alignSelf: 'center' },
  back: { position: 'absolute', left: 0, zIndex: 1, backgroundColor: '#E0C898', borderRadius: 6 },
  letter: {
    position: 'absolute', zIndex: 2, backgroundColor: '#FFFFFF', borderRadius: 3,
    shadowColor: '#2A1500', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)',
  },
  letterLine: { position: 'absolute', left: 12, height: 1, backgroundColor: '#707070', opacity: 0.22, borderRadius: 1 },
  pocket: { position: 'absolute', left: 0, zIndex: 3, backgroundColor: '#C4955C' },
  flap: {
    position: 'absolute', left: 0, zIndex: 4, backgroundColor: '#C4955C',
    transformOrigin: 'top',
  },
  seal: {
    position: 'absolute', width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#7A1A1A', zIndex: 5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7A1A1A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.55, shadowRadius: 5, elevation: 5,
  },
  sealEmoji: { fontSize: 18 },
  border: { position: 'absolute', left: 0, zIndex: 10, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(80,45,5,0.30)' },
});
