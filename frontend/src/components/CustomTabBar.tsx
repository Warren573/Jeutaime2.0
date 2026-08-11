import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FEATURES } from "../config/features";

const BAR_HEIGHT = 72;

const ROUTE_META: Record<string, { icon: string; label: string }> = {
  index: { icon: "⌂", label: "Accueil" },
  profiles: { icon: "⌕", label: "Profils" },
  social: { icon: "◯◯", label: "Social" },
  letters: { icon: "✉", label: "Lettres" },
  journal: { icon: "▤", label: "Journal" },
};

const ROUTE_TO_FEATURE: Record<string, keyof typeof FEATURES> = {
  index: "home",
  profiles: "profiles",
  social: "social",
  letters: "letters",
  journal: "journal",
  "salons-list": "salons",
};

const ROUTE_ACTIVE_TAB_ALIAS: Record<string, string> = { "salons-list": "social" };

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const visibleRoutes = useMemo(
    () =>
      state.routes.filter((route) => {
        const featureKey = ROUTE_TO_FEATURE[route.name];
        return !!featureKey && FEATURES[featureKey] !== "hidden" && route.name in ROUTE_META;
      }),
    [state.routes]
  );

  const currentRoute = state.routes[state.index];
  const activeVisibleRouteName = ROUTE_ACTIVE_TAB_ALIAS[currentRoute?.name] || currentRoute?.name;

  return (
    <View style={[styles.safeArea, { height: BAR_HEIGHT + insets.bottom + 10 }]}> 
      <View style={[styles.bar, { bottom: insets.bottom + 6 }]}> 
        {visibleRoutes.map((route) => {
          const focused = route.name === activeVisibleRouteName;
          const meta = ROUTE_META[route.name];

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              activeOpacity={0.68}
              accessibilityRole="button"
              accessibilityLabel={meta.label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            >
              <View style={styles.iconWrap}>
                <Text style={[styles.icon, route.name === "social" && styles.socialIcon, focused && styles.iconActive]}>
                  {meta.icon}
                </Text>
              </View>
              <View style={[styles.underline, focused && styles.underlineActive]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: "relative",
    backgroundColor: "#F5E9D7",
  },
  bar: {
    position: "absolute",
    left: 18,
    right: 18,
    height: BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4E8D5",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(116, 80, 49, 0.15)",
    shadowColor: "#3B2618",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    height: 42,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontFamily: "Georgia",
    fontSize: 31,
    lineHeight: 37,
    color: "#35251B",
    textAlign: "center",
    fontWeight: "400",
  },
  socialIcon: {
    fontSize: 23,
    letterSpacing: -7,
    transform: [{ translateX: -2 }],
  },
  iconActive: {
    color: "#9B3043",
    fontWeight: "700",
  },
  underline: {
    width: 31,
    height: 3,
    marginTop: -2,
    borderRadius: 3,
    backgroundColor: "transparent",
    transform: [{ rotate: "-3deg" }],
  },
  underlineActive: {
    backgroundColor: "#9B3043",
  },
});
