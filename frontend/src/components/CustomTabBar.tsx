import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FEATURES } from "../config/features";
import { useStore } from "../store/useStore";

const BAR_HEIGHT = 62;
const BAR_SIDE_MARGIN = 12;
const BOTTOM_MARGIN = 8;

const ROUTE_META: Record<string, { icon: string; label: string }> = {
  index: { icon: "⌂", label: "Accueil" },
  profiles: { icon: "⌕", label: "Profils" },
  social: { icon: "♧", label: "Social" },
  letters: { icon: "✉", label: "Lettres" },
  journal: { icon: "▤", label: "Journal" },
  settings: { icon: "•••", label: "Plus" },
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

const ROUTE_ACTIVE_TAB_ALIAS: Record<string, string> = {
  "salons-list": "social",
};

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unreadNotificationsCount = useStore((s) => s.unreadNotificationsCount);

  const visibleRoutes = useMemo(() => {
    return state.routes.filter((route) => {
      const featureKey = ROUTE_TO_FEATURE[route.name];
      if (!featureKey) return false;
      return FEATURES[featureKey] !== "hidden" && route.name in ROUTE_META;
    });
  }, [state.routes]);

  const currentRoute = state.routes[state.index];
  const activeVisibleRouteName =
    ROUTE_ACTIVE_TAB_ALIAS[currentRoute?.name] || currentRoute?.name;

  return (
    <View style={[styles.safeArea, { height: BAR_HEIGHT + insets.bottom + BOTTOM_MARGIN }]}> 
      <View
        style={[
          styles.paperBar,
          {
            bottom: insets.bottom + BOTTOM_MARGIN,
            left: BAR_SIDE_MARGIN,
            right: BAR_SIDE_MARGIN,
            height: BAR_HEIGHT,
          },
        ]}
      >
        <View style={styles.paperTopEdge} />
        <View style={styles.tabsRow}>
          {visibleRoutes.map((route) => {
            const focused = route.name === activeVisibleRouteName;
            const meta = ROUTE_META[route.name];

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
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel={meta.label}
                accessibilityState={{ selected: focused }}
              >
                <View style={styles.iconWrap}>
                  <Text style={[styles.icon, focused && styles.iconActive]}>{meta.icon}</Text>
                  {route.name === "settings" && unreadNotificationsCount > 0 && (
                    <View style={styles.badgeDot} />
                  )}
                </View>
                <Text numberOfLines={1} style={[styles.label, focused && styles.labelActive]}>
                  {meta.label}
                </Text>
                <View style={[styles.activeMark, focused && styles.activeMarkVisible]} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: "relative",
    backgroundColor: "transparent",
  },
  paperBar: {
    position: "absolute",
    borderRadius: 10,
    backgroundColor: "#EFE0C5",
    borderWidth: 1,
    borderColor: "#B99A70",
    shadowColor: "#2E1D10",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 7,
    overflow: "hidden",
  },
  paperTopEdge: {
    position: "absolute",
    top: 3,
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  tabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: 3,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 5,
    paddingBottom: 3,
  },
  iconWrap: {
    height: 25,
    minWidth: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontFamily: "Georgia",
    fontSize: 22,
    lineHeight: 24,
    color: "#765E48",
    opacity: 0.72,
    textAlign: "center",
  },
  iconActive: {
    color: "#8B2E3C",
    opacity: 1,
    fontWeight: "700",
  },
  label: {
    marginTop: 1,
    maxWidth: "100%",
    paddingHorizontal: 1,
    fontFamily: "Georgia",
    fontSize: 9,
    lineHeight: 12,
    color: "#765E48",
    textAlign: "center",
  },
  labelActive: {
    color: "#6E2431",
    fontWeight: "700",
  },
  activeMark: {
    marginTop: 3,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  activeMarkVisible: {
    backgroundColor: "#8B2E3C",
  },
  badgeDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#B42E3D",
    borderWidth: 1,
    borderColor: "#EFE0C5",
  },
});
