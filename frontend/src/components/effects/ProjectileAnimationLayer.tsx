/**
 * ProjectileAnimationLayer
 * ─────────────────────────────────────────────────────────────────────────────
 * Overlay plein-écran (position:absolute, zIndex:99) pour animer les projectiles
 * qui "volent" depuis la zone d'action vers l'avatar cible.
 *
 * Usage dans SalonScreen :
 *
 *   const projectileRef = useRef<ProjectileLayerHandle>(null);
 *
 *   // Quand on envoie une offrande :
 *   projectileRef.current?.fire({
 *     emoji:   '🍺',
 *     fromPos: { x: width / 2, y: height - 80 }, // bas de l'écran / bouton
 *     toPos:   avatarScreenPosition,              // mesurée via measureInWindow
 *     onLand:  () => applyEffect(...),
 *   });
 *
 *   // Dans le JSX, en dehors de tout ScrollView :
 *   <ProjectileAnimationLayer ref={projectileRef} />
 *
 * Trajectoire : arc parabolique via interpolation d'un point de contrôle central.
 * Durée : 500ms → rapide, satisfaisante, non-bloquante.
 */

import React, {
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectileFire {
  emoji:   string;
  fromPos: { x: number; y: number };
  toPos:   { x: number; y: number };
  onLand?: () => void;
}

export interface ProjectileLayerHandle {
  fire: (config: ProjectileFire) => void;
}

interface ProjectileState {
  id:     string;
  emoji:  string;
  anim:   Animated.Value;
  fromX:  number;
  fromY:  number;
  toX:    number;
  toY:    number;
  ctrlX:  number;
  ctrlY:  number;
}

// ─── Composant ────────────────────────────────────────────────────────────────

const ProjectileAnimationLayer = forwardRef<ProjectileLayerHandle>((_, ref) => {
  const [projectiles, setProjectiles] = useState<ProjectileState[]>([]);

  const fire = useCallback(({ emoji, fromPos, toPos, onLand }: ProjectileFire) => {
    const id = `proj_${Date.now()}_${Math.random()}`;

    // Point de contrôle de l'arc (milieu décalé vers le haut)
    const ctrlX = (fromPos.x + toPos.x) / 2;
    const ctrlY = Math.min(fromPos.y, toPos.y) - 120;

    const anim = new Animated.Value(0);

    const proj: ProjectileState = {
      id, emoji, anim,
      fromX: fromPos.x, fromY: fromPos.y,
      toX:   toPos.x,   toY:   toPos.y,
      ctrlX, ctrlY,
    };

    setProjectiles(prev => [...prev, proj]);

    Animated.timing(anim, {
      toValue:       1,
      duration:      520,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onLand?.();
        // Suppression après l'impact + mini délai
        setTimeout(() => {
          setProjectiles(prev => prev.filter(p => p.id !== id));
        }, 350);
      }
    });
  }, []);

  useImperativeHandle(ref, () => ({ fire }), [fire]);

  if (projectiles.length === 0) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {projectiles.map(p => (
        <AnimatedProjectile key={p.id} p={p} />
      ))}
    </View>
  );
});

ProjectileAnimationLayer.displayName = 'ProjectileAnimationLayer';
export default ProjectileAnimationLayer;

// ─── Projectile individuel ────────────────────────────────────────────────────

function AnimatedProjectile({ p }: { p: ProjectileState }) {
  // Position courante via interpolation quadratique de Bézier
  // B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
  const translateX = p.anim.interpolate({
    inputRange:  bezierRange,
    outputRange: bezierOutputX(p.fromX, p.ctrlX, p.toX),
    extrapolate: 'clamp',
  });

  const translateY = p.anim.interpolate({
    inputRange:  bezierRange,
    outputRange: bezierOutputY(p.fromY, p.ctrlY, p.toY),
    extrapolate: 'clamp',
  });

  const scale = p.anim.interpolate({
    inputRange:  [0,    0.4, 0.75, 0.88, 1],
    outputRange: [0.6,  1.1, 1.0,  1.4,  0],
    extrapolate: 'clamp',
  });

  const opacity = p.anim.interpolate({
    inputRange:  [0,  0.05, 0.85, 1],
    outputRange: [0,  1,    1,    0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.projectile,
        { opacity, transform: [{ translateX }, { translateY }, { scale }] },
      ]}
    >
      <Text style={styles.emoji}>{p.emoji}</Text>
    </Animated.View>
  );
}

// ─── Bézier quadratique discrétisée sur N points ──────────────────────────────

const N = 20;
const bezierRange = Array.from({ length: N }, (_, i) => i / (N - 1));

function bezierOutputX(p0: number, p1: number, p2: number): number[] {
  return bezierRange.map(t => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2);
}

function bezierOutputY(p0: number, p1: number, p2: number): number[] {
  return bezierRange.map(t => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  projectile: {
    position: 'absolute',
    top:      0,
    left:     0,
  },
  emoji: {
    fontSize: 28,
  },
});
