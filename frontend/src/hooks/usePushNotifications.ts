import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerDevice } from '../api/notifications';
import { useStore } from '../store/useStore';
// Show push in foreground as banner + badge + sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getPlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Derives a navigation target from push notification data.
 * Mirror of getNotificationTarget but for raw push data Record<string,string>.
 */
function getRouteFromPushData(data: Record<string, string>): string | null {
  const type = data['type'];
  if (!type) return null;

  switch (type) {
    case 'LETTER_RECEIVED':
    case 'MATCH_CREATED':
      return data['matchId'] ? `/match-profile?matchId=${data['matchId']}` : null;
    case 'OFFERING_RECEIVED':
    case 'MAGIE_RECEIVED':
      return data['salonId'] ? `/salon/${data['salonId']}` : null;
    case 'PREMIUM_SUBSCRIBED':
    case 'PREMIUM_CANCELLED':
      return '/premium';
    default:
      return null;
  }
}

export function usePushNotifications() {
  const router = useRouter();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const loadUnreadCount = useStore((s) => s.loadUnreadCount);
  const responseListenerRef = useRef<Notifications.Subscription | null>(null);
  const receivedListenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function setup() {
      try {
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

        // On Android, a channel is required
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'JeuTaime',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        if (cancelled) return;

        const token = tokenData.data;
        const platform = getPlatform();

        await registerDevice(token, platform);
        console.debug(`[push] token registered (${platform})`);
      } catch (err) {
        console.error('[push] setup error', err);
      }
    }

    setup();

    // Foreground: refresh unread count when a notification arrives
    receivedListenerRef.current = Notifications.addNotificationReceivedListener(() => {
      void loadUnreadCount();
    });

    // Tap: navigate using push data
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, string>;
      const route = getRouteFromPushData(data);
      if (route) {
        router.push(route as never);
      }
      // Refresh count after tap too
      void loadUnreadCount();
    });

    return () => {
      cancelled = true;
      receivedListenerRef.current?.remove();
      responseListenerRef.current?.remove();
      receivedListenerRef.current = null;
      responseListenerRef.current = null;
    };
  }, [isAuthenticated]);
}
