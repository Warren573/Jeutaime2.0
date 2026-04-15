import { Tabs } from "expo-router";
import CustomTabBar from "../../src/components/CustomTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="profiles" />
      <Tabs.Screen name="social" />
      <Tabs.Screen name="letters" />
      <Tabs.Screen name="journal" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen
        name="salons-list"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
