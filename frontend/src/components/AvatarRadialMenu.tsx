/**
 * AvatarRadialMenu
 * Menu radial animé qui s'ouvre autour d'un avatar.
 * S'adapte automatiquement selon la position sur l'écran (haut/bas/gauche/droite).
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MENU_RADIUS = 88;
const ACTION_SIZE = 54;
const CENTER_SIZE = 62;
const SAFE_MARGIN = 18;

export interface RadialAction {
  id: string;
  icon: string;
  label: string;
}

interface Props {
  visible: boolean;
  anchor: { x: number; y: number } | null;
  actions: RadialAction[];
  onClose: () => void;
  onActionPress: (action: RadialAction) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type Direction = 'up' | 'down' | 'left' | 'right';

function getBestDirection(anchorX: number, anchorY: number): Direction {
  const bottomSpace = SCREEN_HEIGHT - anchorY;
  const topSpace = anchorY;
  const rightSpace = SCREEN_WIDTH - anchorX;
  const leftSpace = anchorX;

  if (bottomSpace > 200) return 'down';
  if (topSpace > 200) return 'up';
  if (rightSpace > leftSpace) return 'right';
  return 'left';
}

function spreadAngles(startDeg: number, endDeg: number, count: number): number[] {
  if (count === 1) return [(startDeg + endDeg) / 2];
  const step = (endDeg - startDeg) / (count - 1);
  return Array.from({ length: count }, (_, i) => startDeg + i * step);
}

function getAngles(direction: Direction, count: number): number[] {
  // Arc de 160° centré selon la direction
  if (direction === 'up')    return spreadAngles(200, 340, count);
  if (direction === 'down')  return spreadAngles(20,  160, count);
  if (direction === 'left')  return spreadAngles(110, 250, count);
  return                            spreadAngles(-70,  70,  count); // right
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function AvatarRadialMenu({
  visible,
  anchor,
  actions,
  onClose,
  onActionPress,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 90,
    }).start();
  }, [visible]);

  // Clampe l'ancre pour éviter les débordements
  const center = useMemo(() => {
    if (!anchor) return null;
    return {
      x: clamp(anchor.x, SAFE_MARGIN + MENU_RADIUS, SCREEN_WIDTH  - SAFE_MARGIN - MENU_RADIUS),
      y: clamp(anchor.y, SAFE_MARGIN + MENU_RADIUS, SCREEN_HEIGHT - SAFE_MARGIN - MENU_RADIUS),
    };
  }, [anchor]);

  if (!visible || !center) return null;

  const direction = getBestDirection(center.x, center.y);
  const angles    = getAngles(direction, actions.length);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop semi-transparent */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Racine du menu — positionnée sur le centre de l'avatar */}
      <View
        pointerEvents="box-none"
        style={[
          styles.menuRoot,
          {
            left: center.x - CENTER_SIZE / 2,
            top:  center.y - CENTER_SIZE / 2,
          },
        ]}
      >
        {/* Boutons d'action — se déployent en arc */}
        {actions.map((action, index) => {
          const rad = angles[index] * (Math.PI / 180);
          const dx = Math.cos(rad) * MENU_RADIUS;
          const dy = Math.sin(rad) * MENU_RADIUS;

          const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
          const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
          const scale      = progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
          const opacity    = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

          return (
            <Animated.View
              key={action.id}
              style={[
                styles.actionWrap,
                { transform: [{ translateX }, { translateY }, { scale }], opacity },
              ]}
            >
              <Pressable
                style={styles.actionButton}
                onPress={() => onActionPress(action)}
              >
                <Text style={styles.actionEmoji}>{action.icon}</Text>
              </Pressable>
              <View style={styles.labelBubble}>
                <Text style={styles.labelText}>{action.label}</Text>
              </View>
            </Animated.View>
          );
        })}

        {/* Bouton central — ferme le menu, tourne à l'ouverture */}
        <Animated.View
          style={[
            styles.centerWrap,
            {
              transform: [{
                rotate: progress.interpolate({
                  inputRange:  [0, 1],
                  outputRange: ['0deg', '135deg'],
                }),
              }],
            },
          ]}
        >
          <Pressable style={styles.centerButton} onPress={onClose}>
            <Text style={styles.centerText}>✕</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 18, 0.38)',
  },
  menuRoot: {
    position: 'absolute',
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },

  // Bouton central (fermer)
  centerWrap: {
    position: 'absolute',
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  centerText: {
    fontSize: 26,
    color: '#3A285A',
    fontWeight: '700',
  },

  // Boutons d'action
  actionWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  actionEmoji: {
    fontSize: 22,
  },
  labelBubble: {
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(26, 18, 40, 0.88)',
  },
  labelText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
