import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useStore } from "../src/store/useStore";
import { getToken } from "../src/utils/session";
import { useNotificationPolling } from "../src/hooks/useNotificationPolling";
import { usePushNotifications } from "../src/hooks/usePushNotifications";

// Paths that don't require authentication (auth flows + in-progress onboarding)
const AUTH_EXCLUDED: string[] = [
  '/login',
  '/register',
  '/create-profile',
  '/setup-questions',
];

// Paths where the profile gate must NOT redirect
const PROFILE_GATE_EXCLUDED: string[] = [
  '/create-profile',
  '/setup-questions',
  '/login',
  '/register',
];

export default function RootLayout() {
  const { hydrateFromApi } = useStore();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const canDiscover = useStore((s) => s.currentUser?.canDiscover);
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

  // Initial hydration
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) await hydrateFromApi();
      setIsHydrated(true);
    })();
  }, []);

  // Auth gate — unauthenticated users must go to /login
  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated) return;
    if (AUTH_EXCLUDED.some((p) => pathname.startsWith(p))) return;
    router.replace('/login');
  }, [isHydrated, isAuthenticated, pathname]);

  // Profile gate — only fires for authenticated users whose profile is
  // critically incomplete (canDiscover=false: missing gender, city, bio, etc.)
  // Users who just haven't added questions yet (canDiscover=true) are NOT blocked.
  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) return;
    // canDiscover=undefined means unknown (old account, backend didn't return it) — don't gate
    if (canDiscover !== false) return;
    if (PROFILE_GATE_EXCLUDED.some((p) => pathname.startsWith(p))) return;
    router.replace('/create-profile');
  }, [isHydrated, isAuthenticated, canDiscover, pathname]);

  useNotificationPolling();
  usePushNotifications();

  return <Stack screenOptions={{ headerShown: false }} />;
}
