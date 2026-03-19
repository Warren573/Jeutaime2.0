/**
 * AvatarRadialMenu
 * Overlay qui dessine uniquement les 3 boutons d'action autour d'un avatar.
 * Ne contient aucun centre visuel — l'avatar réel reste dans la grille.
 * Positions fixes :
 *   - index 0 → gauche  (180°)  Profil
 *   - index 1 → haut    (270°)  Magie
 *   - index 2 → droite  (  0°)  Offrir
 * Uniquement utilisé en mode paysage.
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

const MENU_RADIUS = 82;
const ACTION_SIZE = 54;
const SAFE_MARGIN = 18;

// Angles fixes : Profil gauche / Magie haut / Offrir droite
const FIXED_ANGLES = [180, 270, 0];

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

  // Ancre clampée — laisser assez de place en haut pour Magie + label
  const center = useMemo(() => {
    if (!anchor) return null;
    return {
      x: clamp(anchor.x, SAFE_MARGIN + MENU_RADIUS, SCREEN_WIDTH - SAFE_MARGIN - MENU_RADIUS),
      y: clamp(
        anchor.y,
        SAFE_MARGIN + MENU_RADIUS + ACTION_SIZE,
        SCREEN_HEIGHT - SAFE_MARGIN - MENU_RADIUS,
      ),
    };
  }, [anchor]);

  if (!visible || !center) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Fond semi-transparent — ferme le menu */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Point d'ancrage virtuel — aucun rendu visuel au centre */}
      <View
        pointerEvents="box-none"
        style={[styles.anchor, { left: center.x, top: center.y }]}
      >
        {actions.map((action, index) => {
          const angleDeg = FIXED_ANGLES[index] ?? index * 120;
          const rad = angleDeg * (Math.PI / 180);
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
  // Point d'ancrage — centré sur l'avatar réel, aucun rendu visuel
  anchor: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
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
