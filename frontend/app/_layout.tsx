import { Stack, usePathname, useRouter } from "expo-router";
import { AppState, Platform } from "react-native";
import { useEffect, useRef, useState } from "react";
import * as ScreenOrientation from "expo-screen-orientation";
import { useStore } from "../src/store/useStore";
import { getToken } from "../src/utils/session";
import { useNotificationPolling } from "../src/hooks/useNotificationPolling";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import { API_URL } from "../src/api/client";
import { TestModeLink } from "../src/dev/TestModeLink";

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
  const pathnameRef = useRef(pathname);
  const [isHydrated, setIsHydrated] = useState(false);

  pathnameRef.current = pathname;

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
    let cancelled = false;

    const applyOrientation = async () => {
      if (cancelled) return;
      const isSalon = pathnameRef.current.startsWith('/salon/');

      try {
        if (Platform.OS === 'ios') {
          await ScreenOrientation.lockPlatformAsync({
            screenOrientationArrayIOS: isSalon
              ? [
                  ScreenOrientation.Orientation.PORTRAIT_UP,
                  ScreenOrientation.Orientation.PORTRAIT_DOWN,
                  ScreenOrientation.Orientation.LANDSCAPE_LEFT,
                  ScreenOrientation.Orientation.LANDSCAPE_RIGHT,
                ]
              : [ScreenOrientation.Orientation.PORTRAIT_UP],
          });
        } else {
          await ScreenOrientation.lockAsync(
            isSalon
              ? ScreenOrientation.OrientationLock.ALL
              : ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
        }
      } catch (error) {
        console.warn('[orientation-lock]', error);
      }
    };

    void applyOrientation();

    const orientationSubscription = ScreenOrientation.addOrientationChangeListener(() => {
      if (!pathnameRef.current.startsWith('/salon/')) {
        void applyOrientation();
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void applyOrientation();
    });

    return () => {
      cancelled = true;
      orientationSubscription.remove();
      appStateSubscription.remove();
    };
  }, [pathname]);

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
      <Stack screenOptions={{ headerShown: false, orientation: 'portrait_up' }}>
        <Stack.Screen name="(tabs)" options={{ orientation: 'portrait_up' }} />
        <Stack.Screen name="salon/[id]" options={{ orientation: 'all' }} />
        <Stack.Screen name="salon/cafe-paris" options={{ orientation: 'all' }} />
      </Stack>
      <TestModeLink />
    </>
  );
}
