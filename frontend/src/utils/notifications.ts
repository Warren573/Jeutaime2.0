import type { NotificationDto, NotificationType } from '../api/notifications';

/**
 * Retourne la route expo-router cible pour une notification donnée,
 * ou null si aucune navigation n'est possible (meta absente/incomplète).
 *
 * Toutes les branches sont défensives : une meta null ou un champ
 * manquant retourne null sans lever d'exception.
 */
export function getNotificationTarget(notification: NotificationDto): string | null {
  const meta = notification.meta ?? {};

  switch (notification.type as NotificationType) {
    case 'LETTER_RECEIVED': {
      const matchId = meta['matchId'];
      return matchId ? `/match-profile?matchId=${matchId}` : null;
    }

    case 'MATCH_CREATED': {
      const matchId = meta['matchId'];
      return matchId ? `/match-profile?matchId=${matchId}` : null;
    }

    case 'OFFERING_RECEIVED': {
      const salonId = meta['salonId'];
      return salonId ? `/salon/${salonId}` : null;
    }

    case 'MAGIE_RECEIVED': {
      const salonId = meta['salonId'];
      return salonId ? `/salon/${salonId}` : null;
    }

    case 'MAGIE_BROKEN':
      // Pas de salonId dans ce payload — pas de navigation possible
      return null;

    case 'PREMIUM_SUBSCRIBED':
    case 'PREMIUM_CANCELLED':
      return '/premium';

    default:
      return null;
  }
}
