import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useStore } from "../src/store/useStore";
import { getToken } from "../src/utils/session";
import { useNotificationPolling } from "../src/hooks/useNotificationPolling";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import { API_URL } from "../src/api/client";
import { TestModeLink } from "../src/dev/TestModeLink";

// Paths that don't require authentication (auth flows + in-progress onboarding)
const AUTH_EXCLUDED: string[] = [
  '/login',
  '/register',
  '/create-profile',
  '/setup-questions',
  '/test-mode',
];

// Paths where the profile gate must NOT redirect
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

  // Wakeup ping — réveille le backend Render Free dès le chargement de l'app
  // (fire-and-forget, silencieux en cas d'erreur)
  useEffect(() => {
    fetch(`${API_URL}/health`, { method: "GET" }).catch(() => {});
  }, []);

  // Initial hydration
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) await hydrateFromApi();
      setIsHydrated(true);
    })();
  }, [hydrateFromApi]);

  // Auth gate — unauthenticated users must go to /login
  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated) return;
    if (AUTH_EXCLUDED.some((p) => pathname.startsWith(p))) return;
    router.replace('/login');
  }, [isHydrated, isAuthenticated, pathname, router]);

  // Profile gate — only fires for authenticated users whose profile is
  // critically incomplete (canDiscover=false: missing gender, city, bio, etc.)
  // Users who just haven't added questions yet (canDiscover=true) are NOT blocked.
  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) return;
    // canDiscover=undefined means unknown (old account, backend didn't return it) — don't gate
    if (canDiscover !== false) return;

    // DEBUG LOG
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
      <Stack screenOptions={{ headerShown: false }} />
      <TestModeLink />
    </>
  );
}
