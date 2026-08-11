import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { FEATURES } from "../config/features";

const BAR_HEIGHT = 82;
const INACTIVE = "#39281D";
const ACTIVE = "#9B3043";

const ROUTE_META: Record<string, { label: string }> = {
  index: { label: "Accueil" },
  profiles: { label: "Profils" },
  social: { label: "Social" },
  letters: { label: "Lettres" },
  journal: { label: "Journal" },
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

function TabIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? ACTIVE : INACTIVE;
  const strokeWidth = active ? 2.25 : 1.9;

  if (name === "index") {
    return (
      <Svg width={36} height={36} viewBox="0 0 36 36">
        <Path d="M5 17.5L18 6l13 11.5V31H21.5v-9h-7v9H5V17.5Z" fill={active ? color : "none"} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === "profiles") {
    return (
      <Svg width={38} height={38} viewBox="0 0 38 38">
        <Circle cx="16" cy="16" r="9.5" fill="none" stroke={color} strokeWidth={2.2} />
        <Line x1="23" y1="23" x2="32" y2="32" stroke={color} strokeWidth={2.7} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === "social") {
    return (
      <Svg width={46} height={38} viewBox="0 0 46 38">
        <Path d="M4 7.5h20c3.3 0 6 2.4 6 5.5v6.5c0 3-2.7 5.5-6 5.5h-8l-7 5v-5H8c-3.3 0-6-2.5-6-5.5V13c0-3.1 2.7-5.5 6-5.5Z" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
        <Path d="M22 12h15c3.9 0 7 2.7 7 6v5c0 3.3-3.1 6-7 6h-2v5l-7-5h-6c-3.9 0-7-2.7-7-6" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === "letters") {
    return (
      <Svg width={42} height={36} viewBox="0 0 42 36">
        <Rect x="3" y="6" width="36" height="25" rx="1.5" fill="none" stroke={color} strokeWidth={2} />
        <Path d="M4.5 8l16.5 13L37.5 8" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width={38} height={38} viewBox="0 0 38 38">
      <Rect x="8" y="4" width="25" height="30" rx="1" fill="none" stroke={color} strokeWidth={2} />
      <Line x1="12" y1="4" x2="12" y2="34" stroke={color} strokeWidth={1.6} />
      <Line x1="16" y1="11" x2="29" y2="11" stroke={color} strokeWidth={1.5} />
      <Line x1="16" y1="16" x2="29" y2="16" stroke={color} strokeWidth={1.5} />
      <Line x1="16" y1="21" x2="29" y2="21" stroke={color} strokeWidth={1.5} />
      <Line x1="16" y1="26" x2="29" y2="26" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = useMemo(
    () => state.routes.filter((route) => {
      const featureKey = ROUTE_TO_FEATURE[route.name];
      return !!featureKey && FEATURES[featureKey] !== "hidden" && route.name in ROUTE_META;
    }),
    [state.routes]
  );

  const currentRoute = state.routes[state.index];
  const activeVisibleRouteName = ROUTE_ACTIVE_TAB_ALIAS[currentRoute?.name] || currentRoute?.name;

  return (
    <View style={[styles.safeArea, { height: BAR_HEIGHT + insets.bottom + 18 }]}> 
      <View style={[styles.bar, { bottom: insets.bottom + 8 }]}> 
        {visibleRoutes.map((route) => {
          const focused = route.name === activeVisibleRouteName;
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel={ROUTE_META[route.name].label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            >
              <View style={styles.iconWrap}><TabIcon name={route.name} active={focused} /></View>
              <View style={[styles.underline, focused && styles.underlineActive]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { position: "relative", backgroundColor: "#F4E7D4" },
  bar: {
    position: "absolute",
    left: 22,
    right: 22,
    height: BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E5D1",
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "rgba(104,72,46,0.13)",
    shadowColor: "#2C1B10",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.17,
    shadowRadius: 12,
    elevation: 9,
  },
  tabItem: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center", paddingTop: 5 },
  iconWrap: { height: 48, alignItems: "center", justifyContent: "center" },
  underline: { width: 35, height: 4, marginTop: 0, borderRadius: 4, backgroundColor: "transparent", transform: [{ rotate: "-4deg" }] },
  underlineActive: { backgroundColor: ACTIVE },
});
