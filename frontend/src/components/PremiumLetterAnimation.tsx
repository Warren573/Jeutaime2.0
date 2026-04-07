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
    .pla-scene {
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 1000ms ease;
    }
    .pla-scene.out {
      opacity: 0;
    }
    .pla-shell {
      position: relative;
      width: min(78vw, 320px);
      aspect-ratio: 1.54 / 1;
      perspective: 1200px;
      border-radius: 6px;
      box-shadow: 0 8px 28px rgba(60,30,5,0.28), 0 2px 6px rgba(60,30,5,0.14);
    }
    .pla-back {
      position: absolute;
      inset: 0;
      background: #A07030;
      border-radius: 6px;
      z-index: 1;
    }
    .pla-back-inner {
      position: absolute;
      inset: 0;
      /* parchment center + two crossing fold lines */
      background:
        linear-gradient(to bottom right,
          transparent calc(50% - 0.8px), rgba(100,55,5,0.13) 50%, transparent calc(50% + 0.8px)),
        linear-gradient(to bottom left,
          transparent calc(50% - 0.8px), rgba(100,55,5,0.13) 50%, transparent calc(50% + 0.8px)),
        #F0DDAC;
      border-radius: 6px;
      z-index: 1;
    }
    .pla-letter {
      position: absolute;
      left: 50%;
      top: 10%;
      width: 82%;
      height: 72%;
      background: #FFFFFF;
      border-radius: 3px;
      box-shadow: 0 2px 8px rgba(42,21,0,0.18);
      transform: translateX(-50%) translateY(15%);
      opacity: 0;
      transition: transform 1000ms cubic-bezier(0.22,1,0.36,1), opacity 600ms ease;
      z-index: 2;
      overflow: hidden;
    }
    .pla-scene.open .pla-letter {
      transform: translateX(-50%) translateY(-65%);
      opacity: 1;
      transition-delay: 700ms;
    }
    .pla-letter-line {
      position: absolute;
      left: 12px;
      height: 1px;
      background: #707070;
      opacity: 0.3;
      border-radius: 1px;
    }
    .pla-side {
      position: absolute;
      top: 0;
      width: 50%;
      height: 100%;
      z-index: 3;
    }
    .pla-side-left {
      left: 0;
      clip-path: polygon(0 0, 100% 50%, 0 100%);
      /* darker at outer edge, lighter toward fold — paper folding inward */
      background: linear-gradient(to right, #7A5020, #C09058);
    }
    .pla-side-right {
      right: 0;
      clip-path: polygon(100% 0, 0 50%, 100% 100%);
      background: linear-gradient(to left, #7A5020, #C09058);
    }
    .pla-pocket {
      position: absolute;
      inset: 0;
      background: #B87840;
      clip-path: polygon(0 0, 50% 68%, 100% 0, 100% 100%, 0 100%);
      z-index: 4;
    }
    /* fold crease line at pocket junction */
    .pla-pocket::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1.5px;
      background: rgba(60,30,5,0.22);
    }
    /* flap-group: carries the rotation; children are NOT clipped by parent clip-path */
    .pla-flap-group {
      position: absolute;
      inset: 0;
      transform-origin: top center;
      transform: rotateX(0deg);
      transition: transform 1100ms cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 5;
    }
    .pla-scene.open .pla-flap-group {
      transform: rotateX(180deg);
      z-index: 1;
    }
    /* triangle shape — clipped, no children */
    .pla-flap-shape {
      position: absolute;
      inset: 0;
      /* lighter at top (receives light), darker at fold tip */
      background: linear-gradient(to bottom, #E0B878, #C49050);
      clip-path: polygon(0 0, 100% 0, 50% 78%);
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    /* seal: sibling of flap-shape → NOT clipped by triangle, rotates with group */
    .pla-seal {
      position: absolute;
      top: calc(78% - 18px);
      left: 50%;
      transform: translateX(-50%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #7A1A1A;
      box-shadow: 0 2px 8px rgba(122,26,26,0.65), 0 0 0 2px rgba(180,80,80,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      line-height: 36px;
      text-align: center;
      z-index: 1;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .pla-border {
      position: absolute;
      inset: 0;
      border: 1.5px solid rgba(70,35,5,0.40);
      border-radius: 6px;
      pointer-events: none;
      z-index: 10;
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

  const sceneClass = ['pla-scene', phase === 'open' || phase === 'out' ? 'open' : '', phase === 'out' ? 'out' : '']
    .filter(Boolean).join(' ');

  return (
    <div className={sceneClass}>
      <div className="pla-shell">
        {/* z=1 — dos kraft */}
        <div className="pla-back">
          <div className="pla-back-inner" />
        </div>

        {/* z=2 — lettre blanche */}
        <div className="pla-letter">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="pla-letter-line"
              style={{
                top: 14 + i * 16,
                width: ['70%', '85%', '80%', '45%'][i],
              }}
            />
          ))}
        </div>

        {/* z=3 — triangles latéraux */}
        <div className="pla-side pla-side-left" />
        <div className="pla-side pla-side-right" />

        {/* z=4 — poche basse, toujours devant la lettre */}
        <div className="pla-pocket" />

        {/* z=5 — rabat supérieur : groupe qui porte la rotation */}
        <div className="pla-flap-group">
          <div className="pla-flap-shape" />
          <div className="pla-seal">⚜️</div>
        </div>

        {/* bordure */}
        <div className="pla-border" />
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
