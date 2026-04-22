import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useStore } from "../src/store/useStore";
import { getToken } from "../src/utils/session";

export default function RootLayout() {
  const { currentUser, hydrateFromApi } = useStore();
  const router = useRouter();
  const segments = useSegments();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          await hydrateFromApi();
        }
      } finally {
        setIsChecking(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isChecking) return;
    const inTabs = segments[0] === "(tabs)";
    if (!currentUser?.id && inTabs) {
      router.replace("/login");
    }
  }, [isChecking, currentUser?.id, segments[0]]);

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f6f1ea" }}>
        <ActivityIndicator size="large" color="#9c2f45" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
