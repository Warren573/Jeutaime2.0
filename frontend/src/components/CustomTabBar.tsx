import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { FEATURES } from "../config/features";

const BAR_HEIGHT = 72;
const INACTIVE = "#3C2A1E";
const ACTIVE = "#A12E46";

const ROUTE_META: Record<string, { label: string }> = {
  index: { label: "Accueil" }, profiles: { label: "Profils" }, social: { label: "Social" }, letters: { label: "Lettres" }, journal: { label: "Journal" },
};
const ROUTE_TO_FEATURE: Record<string, keyof typeof FEATURES> = {
  index: "home", profiles: "profiles", social: "social", letters: "letters", journal: "journal", "salons-list": "salons",
};
const ROUTE_ACTIVE_TAB_ALIAS: Record<string, string> = { "salons-list": "social" };

function TabIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? ACTIVE : INACTIVE;
  const sw = 1.65;
  if (name === "index") return (
    <Svg width={31} height={31} viewBox="0 0 36 36">
      <Path d="M6.5 17.2 18 7.2l11.5 10V30H21v-8.5h-6V30H6.5V17.2Z" fill={active ? color : "none"} stroke={color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
  if (name === "profiles") return (
    <Svg width={34} height={34} viewBox="0 0 38 38">
      <Circle cx="15.5" cy="15.5" r="8.7" fill="none" stroke={color} strokeWidth={1.7} />
      <Line x1="22" y1="22" x2="31" y2="31" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
  if (name === "social") return (
    <Svg width={43} height={40} viewBox="0 0 48 42">
      <Path d="M5.5 8.5h18.5c3.1 0 5.5 2.2 5.5 5v6c0 2.8-2.4 5-5.5 5h-7.5l-6 4.3v-4.3H8.5c-3.1 0-5.5-2.2-5.5-5v-6c0-2.8 2.4-5 5.5-5Z" fill="none" stroke={color} strokeWidth={1.55} strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M23.5 13h13.5c3.6 0 6.5 2.4 6.5 5.5v5c0 3-2.9 5.5-6.5 5.5h-2v4.3L29 29h-5.5" fill="none" stroke={color} strokeWidth={1.55} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
  if (name === "letters") return (
    <Svg width={37} height={32} viewBox="0 0 42 36">
      <Rect x="4" y="7" width="34" height="23" rx="1" fill="none" stroke={color} strokeWidth={1.55} />
      <Path d="M5 8.5 21 20.5 37 8.5" fill="none" stroke={color} strokeWidth={1.45} strokeLinejoin="round" />
    </Svg>
  );
  return (
    <Svg width={33} height={34} viewBox="0 0 38 38">
      <Rect x="8.5" y="4.5" width="24" height="29" rx="0.8" fill="none" stroke={color} strokeWidth={1.55} />
      <Line x1="12" y1="5" x2="12" y2="33" stroke={color} strokeWidth={1.25} />
      <Line x1="16" y1="11" x2="28.5" y2="11" stroke={color} strokeWidth={1.15} />
      <Line x1="16" y1="16" x2="28.5" y2="16" stroke={color} strokeWidth={1.15} />
      <Line x1="16" y1="21" x2="28.5" y2="21" stroke={color} strokeWidth={1.15} />
      <Line x1="16" y1="26" x2="28.5" y2="26" stroke={color} strokeWidth={1.15} />
    </Svg>
  );
}

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = useMemo(() => state.routes.filter((route) => {
    const featureKey = ROUTE_TO_FEATURE[route.name];
    return !!featureKey && FEATURES[featureKey] !== "hidden" && route.name in ROUTE_META;
  }), [state.routes]);
  const currentRoute = state.routes[state.index];
  const activeVisibleRouteName = ROUTE_ACTIVE_TAB_ALIAS[currentRoute?.name] || currentRoute?.name;

  return (
    <View style={[styles.safeArea, { height: BAR_HEIGHT + insets.bottom + 30 }]}> 
      <View style={[styles.bar, { bottom: insets.bottom + 18 }]}> 
        {visibleRoutes.map((route) => {
          const focused = route.name === activeVisibleRouteName;
          return (
            <TouchableOpacity key={route.key} style={styles.tabItem} activeOpacity={0.72} accessibilityRole="button" accessibilityLabel={ROUTE_META[route.name].label} accessibilityState={{ selected: focused }} onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}>
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
  safeArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    overflow: "visible",
    zIndex: 50,
  },
  bar: {
    position: "absolute", left: 12, right: 12, height: BAR_HEIGHT, flexDirection: "row", alignItems: "center",
    backgroundColor: "#F7ECD9", borderRadius: 24, borderWidth: 0.7, borderColor: "rgba(116,82,51,0.11)",
    shadowColor: "#6B4A2D", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 7,
  },
  tabItem: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center", paddingTop: 4 },
  iconWrap: { height: 46, alignItems: "center", justifyContent: "center", overflow: "visible" },
  underline: { width: 38, height: 2.5, marginTop: 0, borderRadius: 3, backgroundColor: "transparent", transform: [{ rotate: "-3deg" }] },
  underlineActive: { backgroundColor: ACTIVE },
});
