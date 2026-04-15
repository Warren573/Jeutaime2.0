import { Tabs, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import CustomTabBar from "../../src/components/CustomTabBar";
import { getToken } from "../../src/utils/session";

export default function TabsLayout() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getToken();

        if (!token) {
          router.replace("/login");
          return;
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isCheckingAuth) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f6f1ea",
        }}
      >
        <ActivityIndicator size="large" color="#9c2f45" />
      </View>
    );
  }

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