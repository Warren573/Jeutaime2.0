import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FEATURES } from "../config/features";
import { useStore } from "../store/useStore";

const BAR_HEIGHT = 76;

const ROUTE_META: Record<string, { icon: string; label: string }> = {
  index: { icon: "⌂", label: "Accueil" },
  profiles: { icon: "⌕", label: "Profils" },
  social: { icon: "♧", label: "Social" },
  letters: { icon: "✉", label: "Lettres" },
  journal: { icon: "▤", label: "Journal" },
  settings: { icon: "•••", label: "Plus" },
};

const ROUTE_TO_FEATURE: Record<string, keyof typeof FEATURES> = {
  index: "home", profiles: "profiles", social: "social", letters: "letters",
  journal: "journal", settings: "settings", "salons-list": "salons",
};
const ROUTE_ACTIVE_TAB_ALIAS: Record<string, string> = { "salons-list": "social" };

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unreadNotificationsCount = useStore((s) => s.unreadNotificationsCount);
  const visibleRoutes = useMemo(() => state.routes.filter((route) => {
    const featureKey = ROUTE_TO_FEATURE[route.name];
    return !!featureKey && FEATURES[featureKey] !== "hidden" && route.name in ROUTE_META;
  }), [state.routes]);
  const currentRoute = state.routes[state.index];
  const activeVisibleRouteName = ROUTE_ACTIVE_TAB_ALIAS[currentRoute?.name] || currentRoute?.name;

  return (
    <View style={[styles.safeArea, { height: BAR_HEIGHT + insets.bottom }]}> 
      <View style={[styles.bar, { height: BAR_HEIGHT, bottom: insets.bottom }]}> 
        {visibleRoutes.map((route) => {
          const focused = route.name === activeVisibleRouteName;
          const meta = ROUTE_META[route.name];
          return (
            <TouchableOpacity key={route.key} style={styles.tabItem} activeOpacity={0.68}
              accessibilityRole="button" accessibilityLabel={meta.label} accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}>
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Text style={[styles.icon, focused && styles.iconActive]}>{meta.icon}</Text>
                {route.name === "settings" && unreadNotificationsCount > 0 && <View style={styles.badgeDot} />}
              </View>
              <Text numberOfLines={1} style={[styles.label, focused && styles.labelActive]}>{meta.label}</Text>
              <View style={[styles.underline, focused && styles.underlineActive]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { position: "relative", backgroundColor: "#F3E6D2" },
  bar: {
    position: "absolute", left: 0, right: 0,
    flexDirection: "row", alignItems: "stretch",
    backgroundColor: "#F3E6D2",
    borderTopWidth: 1,
    borderTopColor: "rgba(119,83,55,0.30)",
    shadowColor: "#3B2618",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 5,
  },
  tabItem: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", paddingTop: 7, paddingBottom: 3 },
  iconWrap: { height: 34, minWidth: 38, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  iconWrapActive: { backgroundColor: "rgba(154,49,67,0.08)" },
  icon: { fontFamily: "Georgia", fontSize: 28, lineHeight: 31, color: "#705844", opacity: 0.84, textAlign: "center", fontWeight: "400" },
  iconActive: { color: "#982F42", opacity: 1, fontWeight: "700" },
  label: { marginTop: 2, maxWidth: "100%", paddingHorizontal: 1, fontFamily: "Georgia", fontSize: 11, lineHeight: 14, color: "#654F3D", textAlign: "center" },
  labelActive: { color: "#8E2D3E", fontSize: 12, fontStyle: "italic", fontWeight: "700" },
  underline: { marginTop: 4, width: 30, height: 3, borderRadius: 2, backgroundColor: "transparent", transform: [{ rotate: "-2deg" }] },
  underlineActive: { backgroundColor: "#9A3143" },
  badgeDot: { position: "absolute", top: -1, right: -1, width: 9, height: 9, borderRadius: 5, backgroundColor: "#B52D40", borderWidth: 1, borderColor: "#F3E6D2" },
});
