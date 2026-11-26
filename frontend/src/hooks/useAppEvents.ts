import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { useStore } from '../store/useStore';
import { getNotifications } from '../api/notifications';
import { createEventQueue, type EventQueue, type SeenStore } from '../data/appEvents';
import { createEventsRuntime, type EventsRuntime } from '../utils/appEventsRuntime';
import { getNotificationTarget } from '../utils/notifications';

/**
 * Système événementiel : file d'attente et moteur partagés par toute l'application (un seul de chaque, par compte).
 * `eventQueue` alimente la fenêtre (EventDialogHost) ; `eventSignals` est appelé à la réception d'un push au premier plan.
 */
let activeUserId: string | null = null;
let queue: EventQueue = createEventQueue({ load: async () => [], save: async () => undefined });
let runtime: EventsRuntime | null = null;
let currentPathRef: { current: string | null } = { current: null };
const listeners = new Set<() => void>();
const notifyBinding = () => listeners.forEach((l) => l());

export const eventQueue = {
  current: () => queue.current(),
  dismiss: () => queue.dismiss(),
  /** Abonnement stable : survit au changement de compte (la file est recréée, les abonnés restent). */
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

/** Signal : un événement vient peut-être d'arriver (push reçu application ouverte). */
export const eventSignals = { pushReceived: () => runtime?.signal() };

const seenStoreFor = (userId: string): SeenStore => ({
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(`jeutaime.events.seen.${userId}`);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
    } catch {
      return [];
    }
  },
  save: (keys) => AsyncStorage.setItem(`jeutaime.events.seen.${userId}`, JSON.stringify(keys)),
});

function pseudoOf(n: { meta?: Record<string, unknown> | null }): string | null {
  const matchId = n.meta?.['matchId'];
  if (typeof matchId !== 'string') return null;
  const { matches, matchPartners, currentUser } = useStore.getState();
  const match = matches.find((m) => m.id === matchId);
  if (!match || !currentUser?.id) return null;
  const partnerId = match.userAId === currentUser.id ? match.userBId : match.userBId === currentUser.id ? match.userAId : undefined;
  return partnerId ? matchPartners[partnerId]?.pseudo ?? null : null;
}

/**
 * À monter une fois dans le layout racine. Application ouverte uniquement : les événements arrivés en arrière-plan ou
 * application fermée ont été montrés par le push système et sont dans l'historique.
 */
export function useAppEvents(): void {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const userId = useStore((s) => s.currentUser?.id ?? null);
  const pathname = usePathname();
  const pathRef = useRef<string | null>(null);
  pathRef.current = pathname;
  currentPathRef = pathRef;

  // Une file et un moteur par compte : un autre compte sur l'appareil ne voit jamais les événements du précédent.
  useMemo(() => {
    if (userId === activeUserId) return;
    activeUserId = userId;
    queue.reset();
    queue = createEventQueue(userId ? seenStoreFor(userId) : { load: async () => [], save: async () => undefined });
    queue.subscribe(notifyBinding);
    runtime = userId
      ? createEventsRuntime({
          queue,
          fetchLatest: async () => (await getNotifications({ pageSize: 10, unreadOnly: true })).items,
          pseudoOf,
          routeOf: (n) => getNotificationTarget(n),
          currentPath: () => currentPathRef.current,
        })
      : null;
    notifyBinding();
  }, [userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    void queue.hydrate();
    runtime?.startSession();
    // Retour au premier plan : nouvelle session (ce qui est arrivé pendant l'absence a déjà été montré par un push).
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') runtime?.startSession(); });
    // Hausse du compteur de non lues (sondage existant de 60 s, ou rechargement) : couvre un push non reçu.
    let previous = useStore.getState().unreadNotificationsCount;
    const unsubscribe = useStore.subscribe((state) => {
      const count = state.unreadNotificationsCount;
      if (count > previous && AppState.currentState === 'active') runtime?.signalCountIncrease();
      previous = count;
    });
    return () => { sub.remove(); unsubscribe(); };
  }, [isAuthenticated, userId]);
}
