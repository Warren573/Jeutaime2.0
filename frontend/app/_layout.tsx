import { Stack } from "expo-router";
import { useEffect } from "react";
import { useStore } from "../src/store/useStore";

export default function RootLayout() {
  const { currentUser, hydrateFromApi } = useStore();

  useEffect(() => {
    if (!currentUser?.id) {
      hydrateFromApi();
    }
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
