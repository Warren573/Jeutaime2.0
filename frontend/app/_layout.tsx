import { Stack, usePathname, useRouter } from "expo-router";
import { LogBox } from "react-native";
import { useEffect, useState } from "react";
import * as ScreenOrientation from "expo-screen-orientation";
import { useStore } from "../src/store/useStore";
import { getToken } from "../src/utils/session";
import { useNotificationPolling } from "../src/hooks/useNotificationPolling";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import { API_URL } from "../src/api/client";
import { TestModeLink } from "../src/dev/TestModeLink";

if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

const AUTH_EXCLUDED: string[] = [
  '/login',
  '/register',
  '/create-profile',
  '/setup-questions',
  '/test-mode',
];

const PROFILE_GATE_EXCLUDED: string[] = [
  '/create-profile',
  '/setup-questions',
  '/login',
  '/register',
  '/test-mode',
];

export default function RootLayout() {
  const { hydrateFromApi } = useStore();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const canDiscover = useStore((s) => s.currentUser?.canDiscover);
  const currentUser = useStore((s) => s.currentUser);
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP
    ).catch((error) => {
      console.warn('[orientation-default-portrait]', error);
    });
  }, []);


  useEffect(() => {
    fetch(`${API_URL}/health`, { method: "GET" }).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) await hydrateFromApi();
      setIsHydrated(true);
    })();
  }, [hydrateFromApi]);

  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated) return;
    if (AUTH_EXCLUDED.some((p) => pathname.startsWith(p))) return;
    router.replace('/login');
  }, [isHydrated, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) return;
    if (canDiscover !== false) return;

    console.log("[profile-gate] REDIRECT TRIGGERED", {
      userId: currentUser?.id,
      email: currentUser?.email,
      pseudo: currentUser?.pseudo,
      bio: currentUser?.bio?.substring(0, 30),
      interestedIn: currentUser?.interestedIn,
      lookingFor: currentUser?.lookingFor,
      physicalDesc: currentUser?.physicalDesc,
      questionsCount: (currentUser?.apiQuestions ?? []).length,
      canDiscover,
      profileMissingFields: currentUser?.profileMissingFields,
      pathname,
    });

    if (PROFILE_GATE_EXCLUDED.some((p) => pathname.startsWith(p))) return;
    router.replace('/create-profile');
  }, [isHydrated, isAuthenticated, canDiscover, pathname, currentUser, router]);

  useNotificationPolling();
  usePushNotifications();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="salon/[id]" />
        <Stack.Screen name="salon/cafe-paris" />
      </Stack>
      <TestModeLink />
    </>
  );
}
