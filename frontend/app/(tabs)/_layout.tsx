import { Tabs } from "expo-router";
import { FEATURES } from "../../src/config/features";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: { height: 58 },
      }}
    >
      {FEATURES.home !== "hidden" && <Tabs.Screen name="index" options={{ title: "Accueil" }} />}
      {FEATURES.profiles !== "hidden" && <Tabs.Screen name="profiles" options={{ title: "Profils" }} />}
      {FEATURES.social !== "hidden" && <Tabs.Screen name="social" options={{ title: "Social" }} />}
      {FEATURES.letters !== "hidden" && <Tabs.Screen name="letters" options={{ title: "Lettres" }} />}
      {FEATURES.journal !== "hidden" && <Tabs.Screen name="journal" options={{ title: "Journal" }} />}
      {FEATURES.settings !== "hidden" && <Tabs.Screen name="settings" options={{ title: "Réglages" }} />}
      {FEATURES.salons !== "hidden" && <Tabs.Screen name="salons-list" options={{ href: null }} />}
    </Tabs>
  );
}
