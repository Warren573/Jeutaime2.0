import { Tabs } from "expo-router";
import CustomTabBar from "../../src/components/CustomTabBar";

// TEMP: auth disabled for development
// To re-enable: restore the useEffect + getToken() check + redirect to /login
// See git history for the original auth guard implementation

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
