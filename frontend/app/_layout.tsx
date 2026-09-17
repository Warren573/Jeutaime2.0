import { Stack, usePathname, useRouter } from "expo-router";
import { LogBox, useWindowDimensions } from "react-native";
import { useEffect, useState } from "react";
import * as ScreenOrientation from "expo-screen-orientation";
import { useStore } from "../src/store/useStore";
import { getToken } from "../src/utils/session";
import { useNotificationPolling } from "../src/hooks/useNotificationPolling";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import { API_URL } from "../src/api/client";
import { TestModeLink } from "../src/dev/TestModeLink";
import { getResponsiveScale } from "../src/utils/responsive";

if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

const AUTH_EXCLUDED: string[] = ['/login','/register','/create-profile','/setup-questions','/test-mode'];
const PROFILE_GATE_EXCLUDED: string[] = ['/create-profile','/setup-questions','/login','/register','/test-mode'];

export default function RootLayout() {
  const { hydrateFromApi } = useStore();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const canDiscover = useStore((s) => s.currentUser?.canDiscover);
  const currentUser = useStore((s) => s.currentUser);
  const router = useRouter();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const responsive = getResponsiveScale(width, height);
  const [isHydrated, setIsHydrated] = useState(false);
  const isSalon = pathname.startsWith('/salon/');

  useEffect(() => {
    ScreenOrientation.lockAsync(
      isSalon ? ScreenOrientation.OrientationLock.ALL : ScreenOrientation.OrientationLock.PORTRAIT_UP
    ).catch((error) => console.warn('[orientation-lock]', error));
  }, [isSalon]);

  useEffect(() => { fetch(`${API_URL}/health`, { method: "GET" }).catch(() => {}); }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) await hydrateFromApi();
      setIsHydrated(true);
    })();
  }, [hydrateFromApi]);

  useEffect(() => {
    if (!isHydrated || isAuthenticated) return;
    if (AUTH_EXCLUDED.some((p) => pathname.startsWith(p))) return;
    router.replace('/login');
  }, [isHydrated, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || canDiscover !== false) return;
    console.log("[profile-gate] REDIRECT TRIGGERED", {
      userId: currentUser?.id,
      email: currentUser?.email,
      pseudo: currentUser?.pseudo,
      canDiscover,
      profileMissingFields: currentUser?.profileMissingFields,
      pathname,
    });
    if (PROFILE_GATE_EXCLUDED.some((p) => pathname.startsWith(p))) return;
    router.replace('/create-profile');
  }, [isHydrated, isAuthenticated, canDiscover, pathname, currentUser, router]);

  useNotificationPolling();
  usePushNotifications();

  const proportionalContentStyle = isSalon
    ? undefined
    : {
        width: responsive.logicalWidth,
        height: responsive.logicalHeight,
        transform: [{ scale: responsive.scale }],
        transformOrigin: 'left top' as const,
      };

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          orientation: 'portrait_up',
          contentStyle: proportionalContentStyle,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ orientation: 'portrait_up' }} />
        <Stack.Screen name="salon/[id]" options={{ orientation: 'all', contentStyle: undefined }} />
        <Stack.Screen name="salon/cafe-paris" options={{ orientation: 'all', contentStyle: undefined }} />
      </Stack>
      <TestModeLink />
    </>
  );
}
