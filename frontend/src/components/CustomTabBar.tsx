import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FEATURES } from "../config/features";

const BAR_HEIGHT = 64;
const ACTIVE_LIFT = 24;
const ACTIVE_CIRCLE = 52;
const INACTIVE_ICON = 26;
const ACTIVE_ICON = 30;
const BAR_SIDE_MARGIN = 14;
const BOTTOM_MARGIN = 10;

const ROUTE_META: Record<string, { icon: string; label: string }> = {
  index: { icon: "⭐", label: "Accueil" },
  profiles: { icon: "🔍", label: "Profils" },
  social: { icon: "🌐", label: "Social" },
  letters: { icon: "💌", label: "Boîte aux lettres" },
  journal: { icon: "📰", label: "Journal" },
  settings: { icon: "⚙️", label: "Plus" },
};

const ROUTE_TO_FEATURE: Record<string, keyof typeof FEATURES> = {
  index: "home",
  profiles: "profiles",
  social: "social",
  letters: "letters",
  journal: "journal",
  settings: "settings",
  "salons-list": "salons",
};

export default function CustomTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((route) => {
    const featureKey = ROUTE_TO_FEATURE[route.name];
    if (!featureKey) return false;
    return FEATURES[featureKey] !== "hidden";
  });

  const anims = useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))
  ).current;

  useEffect(() => {
    state.routes.forEach((_, i) => {
      Animated.spring(anims[i], {
        toValue: i === state.index ? 1 : 0,
        tension: 200,
        friction: 14,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index, state.routes, anims]);

  const totalHeight = ACTIVE_LIFT + BAR_HEIGHT + insets.bottom + BOTTOM_MARGIN;

  return (
    <View style={{ height: totalHeight }}>
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
        <View style={styles.barCapsule} />

        <View style={styles.tabsRow}>
          {visibleRoutes.map((route) => {
            const realIndex = state.routes.findIndex((r) => r.key === route.key);
            const focused = state.index === realIndex;
            const meta = ROUTE_META[route.name] ?? {
              icon: "●",
              label: route.name,
            };

            const translateY = anims[realIndex].interpolate({
              inputRange: [0, 1],
              outputRange: [0, -ACTIVE_LIFT],
            });

            const scale = anims[realIndex].interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
            });

            const inactiveOpacity = anims[realIndex].interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            });

            const activeOpacity = anims[realIndex].interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            });

            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
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

                <Animated.View
                  style={[
                    styles.inactiveIconWrapper,
                    {
                      opacity: inactiveOpacity,
                      transform: [
                        {
                          scale: anims[realIndex].interpolate({
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

const styles = StyleSheet.create({
  floatingBar: {
    position: "absolute",
    overflow: "visible",
  },
  barCapsule: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: "#FFFFFF",
    shadowColor: "#2A1800",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 12,
  },
  tabsRow: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingBottom: (BAR_HEIGHT - ACTIVE_CIRCLE) / 2,
  },
  tabItem: {
    flex: 1,
    height: BAR_HEIGHT + ACTIVE_LIFT,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: (BAR_HEIGHT - ACTIVE_CIRCLE) / 2,
  },
  activeCircle: {
    position: "absolute",
    width: ACTIVE_CIRCLE,
    height: ACTIVE_CIRCLE,
    borderRadius: ACTIVE_CIRCLE / 2,
    backgroundColor: "#3A2818",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3A2818",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  activeIcon: {
    fontSize: ACTIVE_ICON,
    lineHeight: ACTIVE_ICON + 4,
    textAlign: "center",
  },
  inactiveIconWrapper: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  inactiveIcon: {
    fontSize: INACTIVE_ICON,
    lineHeight: INACTIVE_ICON + 4,
    opacity: 0.45,
    textAlign: "center",
  },
});
