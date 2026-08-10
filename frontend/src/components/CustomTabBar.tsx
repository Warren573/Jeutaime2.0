import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FEATURES } from "../config/features";
import { useStore } from "../store/useStore";

const BAR_HEIGHT = 58;

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
              <View style={styles.iconWrap}>
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
  safeArea: { position: "relative", backgroundColor: "#F5EBDD" },
  bar: {
    position: "absolute", left: 0, right: 0,
    flexDirection: "row", alignItems: "stretch",
    backgroundColor: "#F5EBDD",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(105,76,52,0.22)",
  },
  tabItem: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", paddingTop: 5 },
  iconWrap: { height: 24, minWidth: 29, alignItems: "center", justifyContent: "center" },
  icon: { fontFamily: "Georgia", fontSize: 21, lineHeight: 23, color: "#765F4C", opacity: 0.82, textAlign: "center", fontWeight: "400" },
  iconActive: { color: "#9A3143", opacity: 1 },
  label: { marginTop: 0, maxWidth: "100%", paddingHorizontal: 1, fontFamily: "Georgia", fontSize: 9, lineHeight: 11, color: "#695442", textAlign: "center" },
  labelActive: { color: "#9A3143", fontFamily: "Georgia", fontSize: 10, fontStyle: "italic", fontWeight: "700" },
  underline: { marginTop: 3, width: 25, height: 2, borderRadius: 2, backgroundColor: "transparent", transform: [{ rotate: "-2deg" }] },
  underlineActive: { backgroundColor: "#9A3143" },
  badgeDot: { position: "absolute", top: 0, right: -1, width: 7, height: 7, borderRadius: 4, backgroundColor: "#B52D40", borderWidth: 1, borderColor: "#F5EBDD" },
});
