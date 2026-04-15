import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { buildRouteMeta } from '../access/feature.registry';

// ─── Constantes de dimensions ────────────────────────────────────────────────

const BAR_HEIGHT = 64;        // hauteur de la capsule
const ACTIVE_LIFT = 24;       // de combien le cercle actif remonte au-dessus
const ACTIVE_CIRCLE = 52;     // diamètre du cercle actif
const INACTIVE_ICON = 26;     // taille de police des icônes inactives
const ACTIVE_ICON = 30;       // taille de police de l'icône active
const BAR_SIDE_MARGIN = 14;   // marges gauche/droite de la barre par rapport à l'écran
const BOTTOM_MARGIN = 10;     // espace entre la barre et le bas du safe area

// ─── Metadata des onglets (depuis le registre centralisé) ────────────────────

const ROUTE_META = buildRouteMeta();

// ─── Composant ───────────────────────────────────────────────────────────────

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Une valeur animée par onglet (0 = inactif, 1 = actif)
  const anims = useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))
  ).current;

  // Anime les transitions quand l'onglet actif change
  useEffect(() => {
    state.routes.forEach((_, i) => {
      Animated.spring(anims[i], {
        toValue: i === state.index ? 1 : 0,
        tension: 200,
        friction: 14,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  // Hauteur totale réservée (pousse le contenu vers le haut)
  const totalHeight = ACTIVE_LIFT + BAR_HEIGHT + insets.bottom + BOTTOM_MARGIN;

  return (
    <View style={{ height: totalHeight }}>
      {/* Capsule flottante – positionnée en absolu dans le slot réservé */}
      <View
        style={[
          styles.floatingBar,
          {
            bottom: insets.bottom + BOTTOM_MARGIN,
            left: BAR_SIDE_MARGIN,
            right: BAR_SIDE_MARGIN,
            height: ACTIVE_LIFT + BAR_HEIGHT,
          },
        ]}
      >
        {/* Fond de la capsule (positionné en bas du floatingBar) */}
        <View style={styles.barCapsule} />

        {/* Rangée des onglets — seules les routes déclarées dans ROUTE_META sont affichées */}
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            if (!(route.name in ROUTE_META)) return null;
            const focused = state.index === index;
            const meta = ROUTE_META[route.name] ?? { icon: '●', label: route.name };

            // translateY : 0 = centré dans la barre, -ACTIVE_LIFT = au-dessus
            const translateY = anims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0, -ACTIVE_LIFT],
            });

            // Scale du cercle / icône
            const scale = anims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
            });

            // Opacité de l'icône inactive
            const inactiveOpacity = anims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            });

            // Opacité du cercle actif
            const activeOpacity = anims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            });

            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={meta.label}
                accessibilityState={{ selected: focused }}
              >
                {/* Cercle actif (animé vers le haut) */}
                <Animated.View
                  style={[
                    styles.activeCircle,
                    {
                      opacity: activeOpacity,
                      transform: [{ translateY }, { scale }],
                    },
                  ]}
                >
                  <Text style={styles.activeIcon}>{meta.icon}</Text>
                </Animated.View>

                {/* Icône inactive (reste dans la barre, disparaît quand actif) */}
                <Animated.View
                  style={[
                    styles.inactiveIconWrapper,
                    {
                      opacity: inactiveOpacity,
                      transform: [
                        {
                          scale: anims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0.6],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.inactiveIcon}>{meta.icon}</Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Conteneur flottant absolu (overflow visible pour le cercle qui dépasse)
  floatingBar: {
    position: 'absolute',
    overflow: 'visible',
  },

  // La capsule visuelle (fond blanc arrondi + ombre)
  barCapsule: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: '#FFFFFF',
    // Ombre iOS
    shadowColor: '#2A1800',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    // Élévation Android
    elevation: 12,
  },

  // Rangée d'onglets – overlay sur tout le floatingBar
  tabsRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',     // aligne les items en bas (dans la barre)
    paddingBottom: (BAR_HEIGHT - ACTIVE_CIRCLE) / 2, // centre l'icône active dans la barre
  },

  // Chaque cellule d'onglet
  tabItem: {
    flex: 1,
    height: BAR_HEIGHT + ACTIVE_LIFT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: (BAR_HEIGHT - ACTIVE_CIRCLE) / 2,
  },

  // Cercle blanc de l'onglet actif
  activeCircle: {
    position: 'absolute',
    width: ACTIVE_CIRCLE,
    height: ACTIVE_CIRCLE,
    borderRadius: ACTIVE_CIRCLE / 2,
    backgroundColor: '#3A2818',
    alignItems: 'center',
    justifyContent: 'center',
    // Halo
    shadowColor: '#3A2818',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },

  activeIcon: {
    fontSize: ACTIVE_ICON,
    lineHeight: ACTIVE_ICON + 4,
    textAlign: 'center',
  },

  // Icône inactive (flottante dans la barre)
  inactiveIconWrapper: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inactiveIcon: {
    fontSize: INACTIVE_ICON,
    lineHeight: INACTIVE_ICON + 4,
    opacity: 0.45,
    textAlign: 'center',
  },
});
