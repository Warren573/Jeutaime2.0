/**
 * PremiumLetterAnimation
 *
 * Web    : CSS injection — rendu identique au prototype HTML
 * Native : SVG shapes + Animated — enveloppe avec rabat, lettre, sceau de cire
 *
 * Séquence :
 *   t=600ms  → rabat se replie (scaleY 1→0, pivot haut) + sceau disparaît
 *   t=1000ms → lettre monte + grossit (1→1.45)
 *   t=4200ms → fondu sortie
 */
import React, { useEffect, useRef } from 'react';
import {
  Platform, View, Dimensions, Animated, Easing,
} from 'react-native';
import Svg, {
  Polygon, Rect, Path, Circle, Ellipse,
  Text as SvgText,
} from 'react-native-svg';

// ─────────────────────────────────────────────────────────────────────────────
// CSS web version (inchangée)
// ─────────────────────────────────────────────────────────────────────────────
const CSS_ID = 'pla-envelope-styles';

function injectCSS() {
  const ex = document.getElementById(CSS_ID);
  if (ex) ex.remove();
  const s = document.createElement('style');
  s.id = CSS_ID;
  s.textContent = `
    :root {
      --env-tab:   #ecdeb8;
      --env-cover: #e6cfa7;
      --env-bg:    #f5edd1;
      --gold:      #c9a84c;
    }
    .pla-scene {
      position: relative; display: flex;
      align-items: center; justify-content: center;
      transition: opacity 700ms ease-in;
    }
    .pla-scene.is-out { opacity: 0; }
    .pla-wrapper { position: relative; width: 300px; margin-top: 40px; }
    .pla-envelope {
      position: relative; width: 300px; height: 230px;
      background: var(--env-bg);
    }
    .pla-envelope::before {
      content: ""; position: absolute; top: 0; z-index: 2;
      border-top: 130px solid var(--env-tab);
      border-right: 150px solid transparent;
      border-left:  150px solid transparent;
      transform-origin: top;
      transition: transform 0.5s ease-in-out 0.7s;
    }
    .pla-envelope::after {
      content: ""; position: absolute; z-index: 2;
      width: 0; height: 0;
      border-top:    130px solid transparent;
      border-right:  150px solid var(--env-cover);
      border-bottom: 100px solid var(--env-cover);
      border-left:   150px solid var(--env-cover);
    }
    .pla-letter {
      position: absolute; left: 50%;
      transform: translateX(-50%);
      bottom: 0; width: 58%; height: 82%;
      background: #ffffff;
      box-shadow: 0 2px 12px rgba(0,0,0,0.12);
      overflow: hidden; z-index: 1;
      transition: bottom 1s ease-in-out, transform 1s ease-in-out;
    }
    .pla-letter svg { width: 100%; height: 100%; display: block; }
    .pla-seal {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 38px; height: 38px; z-index: 5;
      transition: opacity 0.3s;
    }
    .pla-seal svg { width: 100%; height: 100%; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3)); }
    .pla-particles { position: absolute; top: 50%; left: 50%; pointer-events: none; }
    .pla-particle {
      position: absolute; width: 5px; height: 5px;
      border-radius: 50%; opacity: 0; left: -2px; top: -2px;
    }
    @keyframes pla-burst {
      0%   { transform: translate(0,0) scale(1); opacity: 1; }
      100% { transform: translate(var(--dx),var(--dy)) scale(0); opacity: 0; }
    }
    .pla-burst { animation: pla-burst 0.7s ease-out forwards; }
    .pla-wrapper.open .pla-envelope::before { transform: rotateX(180deg); z-index: 0; }
    .pla-wrapper.open .pla-letter {
      bottom: 105px;
      transform: translateX(-50%) scale(1.45);
      transition-delay: 1s;
    }
    .pla-wrapper.open .pla-seal { opacity: 0; pointer-events: none; }
  `;
  document.head.appendChild(s);
}

function spawnParticles(container: HTMLElement) {
  const colors = ['#8b1a1a', '#c9a84c', '#e8c97a', '#a52020', '#f5edd1'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'pla-particle pla-burst';
    const angle = (i / 12) * 360;
    const dist = 28 + Math.random() * 22;
    const dx = Math.cos((angle * Math.PI) / 180) * dist;
    const dy = Math.sin((angle * Math.PI) / 180) * dist;
    p.style.cssText = `background:${colors[i % colors.length]};--dx:${dx}px;--dy:${dy}px;animation-delay:${Math.random() * 0.2}s;`;
    container.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Web envelope
// ─────────────────────────────────────────────────────────────────────────────
function WebEnvelope() {
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const particleRef = useRef<HTMLDivElement>(null);
  const [isOut, setIsOut] = React.useState(false);

  useEffect(() => {
    injectCSS();
    const t1 = setTimeout(() => {
      wrapperRef.current?.classList.add('open');
      if (particleRef.current) spawnParticles(particleRef.current);
    }, 600);
    const t2 = setTimeout(() => setIsOut(true), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className={`pla-scene${isOut ? ' is-out' : ''}`}>
      <div className="pla-wrapper" ref={wrapperRef}>
        <div className="pla-envelope">
          <div className="pla-letter">
            <svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
              <path d="M18,14 C28,11 44,11 58,13 C68,15 76,13 90,12" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M22,20 C34,18 50,19 66,18 C74,17 82,18 88,17" fill="none" stroke="#c9a84c" strokeWidth="1.1" strokeLinecap="round" opacity="0.5"/>
              <path d="M14,34 C28,33 44,34 60,33 C72,33 82,34 96,33" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.75"/>
              <path d="M14,41 C26,40 40,41 56,40 C70,40 84,41 98,40" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.7"/>
              <path d="M14,48 C30,47 48,48 64,47 C76,47 86,48 94,47" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.75"/>
              <path d="M14,55 C24,54 38,55 54,54 C68,54 80,55 92,54" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.65"/>
              <path d="M14,62 C28,61 44,62 62,61 C74,61 86,62 98,61" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.7"/>
              <path d="M14,74 C26,73 42,74 58,73 C72,73 84,74 96,73" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.7"/>
              <path d="M14,81 C30,80 46,81 62,80 C74,80 86,81 96,80" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.65"/>
              <path d="M14,88 C24,87 38,88 52,87 C64,87 76,88 88,87" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.7"/>
              <path d="M14,95 C24,94 36,95 48,94 C56,94 62,95 68,94" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.55"/>
              <path d="M30,114 C36,108 44,112 50,108 C56,104 60,110 66,106 C70,103 74,108 78,106" fill="none" stroke="#c9a84c" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M28,120 C40,118 54,119 68,118 C76,117 82,118 90,117" fill="none" stroke="#c9a84c" strokeWidth="0.6" strokeLinecap="round" opacity="0.45"/>
            </svg>
          </div>
        </div>
        <div className="pla-seal">
          <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M20,3 C26,2 33,6 36,12 C39,18 38,26 34,31 C30,36 23,38 17,37 C11,36 5,31 3,25 C1,19 3,11 8,7 C12,3 16,4 20,3 Z" fill="#7a1515"/>
            <path d="M20,5 C25,4 31,8 34,13 C37,19 36,26 32,30 C28,34 22,36 16,35 C11,34 6,29 4,24 C2,18 4,12 8,8 C12,4 16,5 20,5 Z" fill="#a52020"/>
            <circle cx="20" cy="20" r="11" fill="none" stroke="#7a1515" strokeWidth="1"/>
            <text x="20" y="25.5" textAnchor="middle" fontFamily="Georgia,serif" fontSize="14" fontWeight="bold" fill="#6b1010">J</text>
            <ellipse cx="14" cy="13" rx="4.5" ry="2.5" fill="rgba(255,255,255,0.13)" transform="rotate(-25 14 13)"/>
          </svg>
        </div>
        <div className="pla-particles" ref={particleRef} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Native envelope (iOS / Android) — SVG shapes + Animated
// ─────────────────────────────────────────────────────────────────────────────
const SW      = Dimensions.get('window').width;
const ENV_W   = Math.min(Math.round(SW * 0.84), 300);
const ENV_H   = Math.round(ENV_W * (230 / 300));
const FLAP_H  = Math.round(ENV_W * (130 / 300));  // hauteur du rabat
const CX      = ENV_W / 2;                          // centre horizontal

function NativeEnvelope() {
  const sceneOp  = useRef(new Animated.Value(1)).current;
  const flapSY   = useRef(new Animated.Value(1)).current;
  const letterY  = useRef(new Animated.Value(0)).current;
  const letterSc = useRef(new Animated.Value(1)).current;
  const letterOp = useRef(new Animated.Value(0)).current;
  const sealOp   = useRef(new Animated.Value(1)).current;

  // Simule transform-origin: top pour le rabat
  // translateY compense le déplacement central de scaleY
  const flapTY = flapSY.interpolate({
    inputRange: [0, 1],
    outputRange: [-(FLAP_H / 2), 0],
  });

  useEffect(() => {
    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        // Rabat se replie vers le haut
        Animated.timing(flapSY, {
          toValue: 0, duration: 500,
          useNativeDriver: true, easing: Easing.inOut(Easing.ease),
        }),
        // Sceau disparaît
        Animated.timing(sealOp, {
          toValue: 0, duration: 300, useNativeDriver: true,
        }),
        // Lettre monte après 400ms
        Animated.sequence([
          Animated.delay(400),
          Animated.parallel([
            Animated.timing(letterOp, {
              toValue: 1, duration: 300, useNativeDriver: true,
            }),
            Animated.timing(letterY, {
              toValue: -Math.round(ENV_H * 0.45), duration: 900,
              useNativeDriver: true, easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(letterSc, {
              toValue: 1.45, duration: 900,
              useNativeDriver: true, easing: Easing.out(Easing.cubic),
            }),
          ]),
        ]),
      ]),
      Animated.delay(1800),
      Animated.timing(sceneOp, {
        toValue: 0, duration: 700,
        useNativeDriver: true, easing: Easing.in(Easing.ease),
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: sceneOp, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: ENV_W, height: ENV_H }}>

        {/* ── Corps de l'enveloppe (statique) ── */}
        <Svg
          width={ENV_W} height={ENV_H}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Fond */}
          <Rect x={0} y={0} width={ENV_W} height={ENV_H} fill="#f5edd1" />
          {/* Rabat gauche */}
          <Polygon
            points={`0,0 0,${ENV_H} ${CX},${FLAP_H}`}
            fill="#e6cfa7"
          />
          {/* Rabat droit */}
          <Polygon
            points={`${ENV_W},0 ${ENV_W},${ENV_H} ${CX},${FLAP_H}`}
            fill="#e6cfa7"
          />
          {/* Rabat bas */}
          <Polygon
            points={`0,${ENV_H} ${ENV_W},${ENV_H} ${CX},${FLAP_H}`}
            fill="#e6cfa7"
          />
        </Svg>

        {/* ── Lettre ── */}
        <Animated.View style={{
          position: 'absolute',
          left: Math.round(ENV_W * 0.21),
          bottom: 0,
          width: Math.round(ENV_W * 0.58),
          height: Math.round(ENV_H * 0.82),
          backgroundColor: '#fff',
          opacity: letterOp,
          zIndex: 1,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 3,
          transform: [{ translateY: letterY }, { scale: letterSc }],
        }}>
          <Svg viewBox="0 0 120 150" width="100%" height="100%">
            <Path d="M18,14 C28,11 44,11 58,13 C68,15 76,13 90,12" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
            <Path d="M22,20 C34,18 50,19 66,18 C74,17 82,18 88,17" fill="none" stroke="#c9a84c" strokeWidth="1.1" strokeLinecap="round" opacity="0.5"/>
            <Path d="M14,34 C28,33 44,34 60,33 C72,33 82,34 96,33" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.75"/>
            <Path d="M14,41 C26,40 40,41 56,40 C70,40 84,41 98,40" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.7"/>
            <Path d="M14,48 C30,47 48,48 64,47 C76,47 86,48 94,47" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.75"/>
            <Path d="M14,55 C24,54 38,55 54,54 C68,54 80,55 92,54" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.65"/>
            <Path d="M14,62 C28,61 44,62 62,61 C74,61 86,62 98,61" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.7"/>
            <Path d="M14,74 C26,73 42,74 58,73 C72,73 84,74 96,73" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.7"/>
            <Path d="M14,81 C30,80 46,81 62,80 C74,80 86,81 96,80" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.65"/>
            <Path d="M14,88 C24,87 38,88 52,87 C64,87 76,88 88,87" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.7"/>
            <Path d="M14,95 C24,94 36,95 48,94 C56,94 62,95 68,94" fill="none" stroke="#2a1f3d" strokeWidth="0.85" strokeLinecap="round" opacity="0.55"/>
            <Path d="M30,114 C36,108 44,112 50,108 C56,104 60,110 66,106 C70,103 74,108 78,106" fill="none" stroke="#c9a84c" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M28,120 C40,118 54,119 68,118 C76,117 82,118 90,117" fill="none" stroke="#c9a84c" strokeWidth="0.6" strokeLinecap="round" opacity="0.45"/>
          </Svg>
        </Animated.View>

        {/* ── Rabat supérieur (animé) ── */}
        <Animated.View style={{
          position: 'absolute',
          top: 0, left: 0,
          width: ENV_W, height: FLAP_H,
          zIndex: 2,
          transform: [{ translateY: flapTY }, { scaleY: flapSY }],
        }}>
          <Svg width={ENV_W} height={FLAP_H}>
            <Polygon
              points={`0,0 ${ENV_W},0 ${CX},${FLAP_H}`}
              fill="#ecdeb8"
            />
          </Svg>
        </Animated.View>

        {/* ── Sceau de cire ── */}
        <Animated.View style={{
          position: 'absolute',
          top: FLAP_H - 19,
          left: CX - 19,
          width: 38, height: 38,
          zIndex: 5,
          opacity: sealOp,
        }}>
          <Svg viewBox="0 0 40 40" width={38} height={38}>
            <Path d="M20,3 C26,2 33,6 36,12 C39,18 38,26 34,31 C30,36 23,38 17,37 C11,36 5,31 3,25 C1,19 3,11 8,7 C12,3 16,4 20,3 Z" fill="#7a1515"/>
            <Path d="M20,5 C25,4 31,8 34,13 C37,19 36,26 32,30 C28,34 22,36 16,35 C11,34 6,29 4,24 C2,18 4,12 8,8 C12,4 16,5 20,5 Z" fill="#a52020"/>
            <Circle cx={20} cy={20} r={11} fill="none" stroke="#7a1515" strokeWidth={1}/>
            <SvgText x={20} y={25.5} textAnchor="middle" fontFamily="Georgia, serif" fontSize={14} fontWeight="bold" fill="#6b1010">J</SvgText>
            <Ellipse cx={14} cy={13} rx={4.5} ry={2.5} fill="rgba(255,255,255,0.13)" transform="rotate(-25, 14, 13)"/>
          </Svg>
        </Animated.View>

      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
interface Props { senderName?: string }

export function PremiumLetterAnimation({ senderName: _ = '' }: Props) {
  if (Platform.OS === 'web') return <WebEnvelope />;
  return <NativeEnvelope />;
}
