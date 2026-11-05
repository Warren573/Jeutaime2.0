import { Stack, usePathname, useRouter } from "expo-router";
import { LogBox, Platform, View, useWindowDimensions } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import { useStore } from "../src/store/useStore";
import { getToken } from "../src/utils/session";
import { useNotificationPolling } from "../src/hooks/useNotificationPolling";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import { API_URL } from "../src/api/client";
import { TestModeLink } from "../src/dev/TestModeLink";
import { getResponsiveScale } from "../src/utils/responsive";
import { exemptScreenStyle, scaledScreenStyle } from "../src/utils/scaledScreenStyle";
import { useAndroidKeyboardInset } from "../src/hooks/useAndroidKeyboardInset";
import { APP_COLORS } from "../src/theme/appTheme";

if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

const AUTH_EXCLUDED: string[] = ['/login','/register','/create-profile','/setup-questions','/test-mode','/terms','/privacy-policy','/game-rules','/legal-notice','/delete-account-request'];
const PROFILE_GATE_EXCLUDED: string[] = ['/create-profile','/setup-questions','/avatar-builder','/login','/register','/test-mode','/delete-account-request'];

export default function RootLayout() {
  const { hydrateFromApi } = useStore();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const canDiscover = useStore((s) => s.currentUser?.canDiscover);
  const currentUser = useStore((s) => s.currentUser);
  const router = useRouter();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const responsive = getResponsiveScale(width, height);
  // Android edge-to-edge (SDK 54, targetSdk 36) : la fenêtre n'est plus réduite
  // à l'ouverture du clavier. On rétablit ici, une seule fois pour toute
  // l'application, la réduction de la zone utile. Toujours 0 sur iOS et web.
  const keyboardInset = useAndroidKeyboardInset(height);
  // Clavier ouvert, la zone utile s'arrête au bord du clavier, qui recouvre
  // déjà la barre de navigation Android : la marge sûre du bas ne doit plus
  // être ajoutée par les écrans ni par la barre d'onglets (sinon double
  // compensation). Valeur inchangée clavier fermé, et toujours sur iOS/web.
  const safeAreaInsets = useSafeAreaInsets();
  const contentInsets = useMemo(
    () => (keyboardInset > 0 ? { ...safeAreaInsets, bottom: 0 } : safeAreaInsets),
    [keyboardInset, safeAreaInsets],
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const isSalon = pathname.startsWith('/salon/');
  const isSettings = pathname === '/settings' || pathname.endsWith('/settings');
  const isAvatarEditor = pathname === '/avatar-builder' || pathname.endsWith('/avatar-builder');
  const isPremium = pathname === '/premium' || pathname.endsWith('/premium');
  const isShop = pathname === '/shop' || pathname.endsWith('/shop');

  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP
    ).catch((error) => console.warn('[orientation-lock]', error));
  }, [isSalon]);

  useEffect(() => { fetch(`${API_URL}/health`, { method: "GET" }).catch(() => {}); }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        if (token) await hydrateFromApi();
      } catch (error) {
        console.warn("[startup] Session initialization failed", error instanceof Error ? error.name : "unknown");
      } finally {
        if (active) setIsHydrated(true);
      }
    })();
    return () => { active = false; };
  }, [hydrateFromApi]);

  useEffect(() => {
    if (!isHydrated || isAuthenticated) return;
    if (AUTH_EXCLUDED.some((p) => pathname.startsWith(p))) return;
    router.replace('/login');
  }, [isHydrated, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR' || canDiscover !== false) return;
    if (PROFILE_GATE_EXCLUDED.some((p) => pathname.startsWith(p))) return;
    const missing = currentUser?.profileMissingFields ?? [];
    const coreProfileFields = ['bio', 'interestedIn', 'lookingFor', 'physicalDesc'];
    const needsCoreProfile = coreProfileFields.some((field) => missing.includes(field));
    router.replace(needsCoreProfile ? '/create-profile' : '/setup-questions');
  }, [isHydrated, isAuthenticated, canDiscover, pathname, currentUser, router]);

  useNotificationPolling();
  usePushNotifications();

  // Sur Safari mobile, les barres du navigateur réduisent la hauteur du viewport.
  // Ne pas réduire toute l'application web : elle doit remplir l'espace disponible.
  // Garder la mise à l'échelle d'origine sur iOS et Android natifs.
  const proportionalContentStyle = isSalon || isSettings || isAvatarEditor || isPremium || isShop
    ? exemptScreenStyle({ platform: Platform.OS, windowHeight: height, keyboardInset })
    : Platform.OS === 'web'
    ? { width: '100%' as const, height: '100%' as const }
    : scaledScreenStyle({
        platform: Platform.OS,
        logicalWidth: responsive.logicalWidth,
        windowHeight: height,
        keyboardInset,
        scale: responsive.scale,
      });

  return (
    <>
      <SafeAreaInsetsContext.Provider value={contentInsets}>
        <View
          style={{
            flex: 1,
            paddingBottom: keyboardInset,
            // Android : pendant l'animation de fermeture du clavier, la bande
            // libérée montre ce fond (couleur de l'app) au lieu du fond système.
            backgroundColor: Platform.OS === 'android' ? APP_COLORS.background : undefined,
          }}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              orientation: 'portrait_up',
              contentStyle: proportionalContentStyle,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ orientation: 'portrait_up' }} />
            <Stack.Screen name="salon/[id]" options={{ orientation: 'portrait_up', contentStyle: undefined }} />
            <Stack.Screen name="salon/cafe-paris" options={{ orientation: 'all', contentStyle: undefined }} />
          </Stack>
        </View>
      </SafeAreaInsetsContext.Provider>
      <TestModeLink />
    </>
  );
}
