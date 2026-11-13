import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useGlobalSearchParams, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { registerDevice } from '../api/notifications';
import { useStore } from '../store/useStore';
import { getUserSettings } from '../api/userSettings';
import {
  badgeCountFor,
  createPushNavigator,
  foregroundPresentation,
  isAlreadyAtRoute,
  onForegroundNotification,
  prepareDestinationWith,
  type CurrentLocation,
  type PushDestination,
  type PushNavigator,
  type PushResponseLike,
} from '../utils/pushNavigation';

let foregroundSoundEnabled = true;
let foregroundVibrationEnabled = true;
// Écran actuellement affiché, tenu à jour par le hook : sert à ne pas afficher de bannière
// (ni de son) pour une notification qui ouvrirait l'écran que l'utilisateur consulte déjà.
let currentLocation: CurrentLocation | null = null;

// Show push in foreground as banner + badge + sound — sauf si l'écran concerné est déjà ouvert.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const p = foregroundPresentation(currentLocation, notification.request.content.data, {
      sound: foregroundSoundEnabled,
      vibration: foregroundVibrationEnabled,
    });
    return {
      shouldShowBanner: p.showBanner,
      shouldShowList: p.showList,
      shouldPlaySound: p.playSound,
      shouldSetBadge: true,
    };
  },
});

function getPlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/** Durée maximale d'attente du rechargement des correspondances avant d'utiliser le repli. */
const MATCH_REFRESH_TIMEOUT_MS = 4000;

const prepareDestination = (dest: PushDestination): Promise<string> =>
  prepareDestinationWith(dest, {
    hasMatch: (id) => useStore.getState().matches.some((m) => m.id === id),
    refreshMatches: () => useStore.getState().loadMatches(),
    timeoutMs: MATCH_REFRESH_TIMEOUT_MS,
  });

/** Réponse de notification la plus récente (démarrage à froid) ; null si indisponible sur ce build. */
function readLastResponse(): PushResponseLike | null {
  try {
    return (Notifications.getLastNotificationResponse() as PushResponseLike | null) ?? null;
  } catch {
    return null;
  }
}

function consumeLastResponse(): void {
  try {
    Notifications.clearLastNotificationResponse();
  } catch {
    // Module natif sans cette fonction : sans effet, la déduplication du contrôleur suffit.
  }
}

/**
 * @param sessionReady vrai une fois la session restaurée (réhydratation terminée). Tant qu'il est
 * faux, une ouverture par notification est mise en attente : on ne sait pas encore si l'utilisateur
 * est connecté.
 */
export function usePushNotifications(sessionReady: boolean = true) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams();
  const navigationState = useRootNavigationState();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const loadUnreadCount = useStore((s) => s.loadUnreadCount);
  const unreadCount = useStore((s) => s.unreadNotificationsCount);
  const userId = useStore((s) => s.currentUser?.id ?? null);
  const receivedListenerRef = useRef<Notifications.Subscription | null>(null);
  const routerRef = useRef(router);
  routerRef.current = router;
  const navigatorRef = useRef<PushNavigator | null>(null);
  const navReady = Boolean(navigationState?.key);

  // Écran affiché : lu par le gestionnaire de premier plan (bannière inutile).
  useEffect(() => {
    currentLocation = { pathname, params: searchParams as CurrentLocation['params'] };
  }, [pathname, searchParams]);

  // Ouverture par appui sur une notification : application ouverte, en arrière-plan OU fermée.
  // Enregistré dès le montage, sans attendre la connexion : un appui qui démarre l'application à
  // froid est rejoué via la dernière réponse d'Expo, puis mis en attente jusqu'à la session.
  useEffect(() => {
    const navigator = createPushNavigator({
      navigate: (route) => routerRef.current.push(route as never),
      prepare: prepareDestination,
      isAtRoute: (route) => isAlreadyAtRoute(currentLocation, route),
      consume: consumeLastResponse,
      defaultActionId: Notifications.DEFAULT_ACTION_IDENTIFIER,
    });
    navigatorRef.current = navigator;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigator.onResponse(response as PushResponseLike);
    });
    navigator.onResponse(readLastResponse());

    return () => {
      subscription.remove();
      navigatorRef.current = null;
    };
  }, []);

  // Authentification et routeur : tri-état pour ne jamais naviguer avant de savoir.
  useEffect(() => {
    navigatorRef.current?.update({
      auth: !sessionReady ? 'unknown' : isAuthenticated ? 'authenticated' : 'unauthenticated',
      navReady,
      sessionKey: userId,
    });
  }, [sessionReady, isAuthenticated, navReady, userId]);

  // Badge de l'icône (iOS) : nombre de notifications non lues de la cloche, comme dernier état connu.
  // Les push reçus application fermée ne le modifient pas (le serveur n'envoie pas de compteur).
  useEffect(() => {
    if (Platform.OS !== 'ios' || !sessionReady) return;
    const target = isAuthenticated ? badgeCountFor(unreadCount) : 0;
    void Notifications.setBadgeCountAsync(target).catch(() => {});
  }, [sessionReady, isAuthenticated, unreadCount]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function setup() {
      try {
        const preferences = await getUserSettings().catch(() => null);
        if (preferences) {
          foregroundSoundEnabled = preferences.soundEnabled;
          foregroundVibrationEnabled = preferences.vibrationEnabled;
          if (!preferences.notifPush) return;
        }
        // Android notification channels must exist before obtaining permission/token.
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'JeuTaime',
            importance: Notifications.AndroidImportance.MAX,
            sound: foregroundSoundEnabled ? 'default' : null,
            vibrationPattern: foregroundVibrationEnabled ? [0, 250, 250, 250] : null,
            lightColor: '#FF231F7C',
          });
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;

        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.warn('[push] permission denied');
          return;
        }

        const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
          console.warn('[push] EAS project ID missing; cannot register a push token');
          return;
        }
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled) return;

        const token = tokenData.data;
        const platform = getPlatform();

        await registerDevice(token, platform);
        if (cancelled) return;
        await AsyncStorage.setItem('jeutaime_push_token', token);
        console.debug(`[push] token registered (${platform})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        if (Platform.OS === "ios" && message.includes("aps-environment")) {
          console.debug("[push] notifications indisponibles sur ce build iOS local");
          return;
        }

        console.error("[push] setup error", err);
      }
    }

    void setup();

    // Foreground: refresh unread count when a notification arrives
    // Bannière, son ET vibration sont supprimés ensemble quand l'écran concerné est déjà affiché ;
    // le compteur de notifications non lues est toujours actualisé.
    receivedListenerRef.current = Notifications.addNotificationReceivedListener((notification) => {
      onForegroundNotification({
        current: currentLocation,
        data: notification.request.content.data,
        prefs: { sound: foregroundSoundEnabled, vibration: foregroundVibrationEnabled },
        vibrate: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        },
        refreshUnread: () => {
          void loadUnreadCount();
        },
      });
    });

    return () => {
      cancelled = true;
      receivedListenerRef.current?.remove();
      receivedListenerRef.current = null;
    };
  }, [isAuthenticated, loadUnreadCount]);
}
