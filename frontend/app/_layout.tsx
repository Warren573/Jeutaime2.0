import { Stack } from "expo-router";
import { useEffect } from "react";
import { useStore } from "../src/store/useStore";
import { getToken } from "../src/utils/session";
import { useNotificationPolling } from "../src/hooks/useNotificationPolling";

// DEV: auth guard disabled — direct access to tabs allowed
export default function RootLayout() {
  const { hydrateFromApi } = useStore();

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) await hydrateFromApi();
    })();
  }, []);

  useNotificationPolling();

  return <Stack screenOptions={{ headerShown: false }} />;
}
