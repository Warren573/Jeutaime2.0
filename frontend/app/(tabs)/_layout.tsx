import { Tabs } from "expo-router";
import CustomTabBar from "../../src/components/CustomTabBar";
import { FEATURES } from "../../src/config/features";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {FEATURES.home !== "hidden" && <Tabs.Screen name="index" />}

      {FEATURES.profiles !== "hidden" && (
        <Tabs.Screen name="profiles" />
      )}

      {FEATURES.social !== "hidden" && (
        <Tabs.Screen name="social" />
      )}

      {FEATURES.letters !== "hidden" && (
        <Tabs.Screen name="letters" />
      )}

      {FEATURES.journal !== "hidden" && (
        <Tabs.Screen name="journal" />
      )}

      {FEATURES.settings !== "hidden" && (
        <Tabs.Screen name="settings" />
      )}

      {FEATURES.salons !== "hidden" && (
        <Tabs.Screen
          name="salons-list"
          options={{
            href: null,
          }}
        />
      )}
    </Tabs>
  );
}
