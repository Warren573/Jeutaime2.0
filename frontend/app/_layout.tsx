import "./test-core-default.css";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useStore } from "../src/store/useStore";
import { getToken } from "../src/utils/session";
import { useNotificationPolling } from "../src/hooks/useNotificationPolling";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import { API_URL } from "../src/api/client";

const AUTH_EXCLUDED: string[] = [
  '/login',
  '/register',
  '/create-profile',
  '/setup-questions',
];

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
    if (!isHydrated || isAuthenticated) return;
    if (AUTH_EXCLUDED.some((p) => pathname.startsWith(p))) return;
    router.replace('/login');
  }, [isHydrated, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || canDiscover !== false) return;
    if (PROFILE_GATE_EXCLUDED.some((p) => pathname.startsWith(p))) return;
    router.replace('/create-profile');
  }, [isHydrated, isAuthenticated, canDiscover, pathname, router]);

  useNotificationPolling();
  usePushNotifications();

  return <Stack screenOptions={{ headerShown: false }} />;
}
