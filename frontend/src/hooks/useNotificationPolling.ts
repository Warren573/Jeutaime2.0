import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useStore } from '../store/useStore';

const POLL_INTERVAL_MS = 60_000;

/**
 * Lance un polling léger du unread count (60 s) et recharge
 * immédiatement quand l'app repasse au premier plan.
 * Le polling est automatiquement stoppé si l'utilisateur se déconnecte.
 */
export function useNotificationPolling(): void {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  // Référence stable via getState() pour éviter les closures périmées
  // à l'intérieur du setInterval.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = () => void useStore.getState().loadUnreadCount();

    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Chargement immédiat au montage / reconnexion
    load();

    // Polling régulier
    if (!intervalRef.current) {
      intervalRef.current = setInterval(load, POLL_INTERVAL_MS);
    }

    // Rafraîchissement au retour au premier plan
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      sub.remove();
    };
  }, [isAuthenticated]);
}
