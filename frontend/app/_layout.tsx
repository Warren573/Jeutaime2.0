import { Stack } from "expo-router";
import { useEffect } from "react";
import { useStore } from "../src/store/useStore";
import { getToken } from "../src/utils/session";

// DEV: auth guard disabled — direct access to tabs allowed
export default function RootLayout() {
  const { hydrateFromApi } = useStore();

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) await hydrateFromApi();
    })();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
