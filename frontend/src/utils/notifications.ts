import type { NotificationDto, NotificationType } from '../api/notifications';
import { isSafeId } from './pushNavigation';

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
      return isSafeId(matchId) ? `/(tabs)/letters?matchId=${matchId}` : null;
    }

    case 'QUESTIONS_FAILED':
      // Le match est rompu : éviter de naviguer vers une correspondance inaccessible.
      return null;

    case 'QUESTIONS_PASSED': {
      const matchId = meta['matchId'];
      return isSafeId(matchId) ? '/(tabs)/letters' : null;
    }

    case 'MATCH_CREATED': {
      const matchId = meta['matchId'];
      return isSafeId(matchId) ? `/(tabs)/letters?questionsMatchId=${matchId}` : null;
    }

    case 'OFFERING_RECEIVED': {
      const salonId = meta['salonId'];
      return isSafeId(salonId) ? `/salon/${salonId}` : '/offerings';
    }

    case 'MAGIE_RECEIVED': {
      const salonId = meta['salonId'];
      return isSafeId(salonId) ? `/salon/${salonId}` : null;
    }

    case 'MAGIE_BROKEN':
      // Pas de salonId dans ce payload — pas de navigation possible
      return null;

    case 'PREMIUM_SUBSCRIBED':
    case 'PREMIUM_CANCELLED':
      return '/premium';

    case 'ADMIN_MESSAGE':
      return '/admin-messages';

    case 'PRIVATE_SALON_INVITE':
      return '/private-salons';

    case 'SECURITY_ALERT':
      return '/security';

    // ── Phase 2 : destinations reconstruites depuis des identifiants validés ──────────
    case 'DUEL_RECEIVED':
    case 'DUEL_RESULT':
    case 'DUEL_DECLINED':
    case 'DUEL_EXPIRED': {
      const duelId = meta['duelId'];
      return isSafeId(duelId) ? `/duel/play?duelId=${duelId}` : null;
    }

    case 'BOTTLE_REPLY':
    case 'BOTTLE_REVEAL_REQUEST':
    case 'BOTTLE_REVEAL_REFUSED': {
      // Écran de LECTURE de la bouteille (jamais le formulaire de réponse) ; sans identifiant valide : l'écran des bouteilles.
      const bottleId = meta['bottleId'];
      return isSafeId(bottleId) ? `/bottles-main?bottleId=${bottleId}` : '/bottles-main';
    }

    case 'BOTTLE_REVEAL_ACCEPTED': {
      const matchId = meta['matchId'];
      return isSafeId(matchId) ? `/(tabs)/letters?matchId=${matchId}` : '/bottles-main';
    }

    case 'QUESTIONS_TURN': {
      const matchId = meta['matchId'];
      return isSafeId(matchId) ? `/(tabs)/letters?questionsMatchId=${matchId}` : null;
    }

    case 'REFUGE_ADOPTED':
    case 'REFUGE_REVEAL_PHASE':
    case 'REFUGE_REVEALED': {
      const refugeSessionId = meta['refugeSessionId'];
      return isSafeId(refugeSessionId) ? `/refuge/${refugeSessionId}` : '/refuge';
    }

    case 'REPORT_PROCESSED':
      return '/user-reports';

    case 'ACCOUNT_RESTORED':
      return null;

    default:
      return null;
  }
}
