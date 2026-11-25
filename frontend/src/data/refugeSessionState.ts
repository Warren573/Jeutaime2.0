/**
 * États de session et messages d'erreur du Refuge — logique pure.
 *
 * Constat (jour 7 sur 7) : une session dont la fin est dépassée reste « ACTIVE » en base
 * (aucun job ne la clôture) et le serveur la déclare `isActive: false`. L'écran affichait
 * pourtant « Jour 7 sur 7 » avec des cartes jouables, puis le refus du serveur
 * (409 « Ce refuge a expiré ») n'était montré nulle part : « rien ne se passe ».
 */
export function sessionEndNotice(
  status: string | null | undefined,
  isActive: boolean | null | undefined
): { title: string; body: string } | null {
  // Fin dépassée mais pas encore clôturée par le serveur (ancien état, ou lecture antérieure à la clôture).
  if (status === 'ACTIVE' && isActive === false) {
    return { title: 'Ce refuge est arrivé à son terme', body: 'Il n’est plus possible de valider de nouveaux choix.' };
  }
  // Clôturée par le serveur sans que le jour 7 ait été joué : le Refuge redevient disponible pour en commencer un autre.
  if (status === 'ABANDONED') {
    return { title: 'Ce refuge est terminé', body: 'Il n’a pas pu être mené jusqu’au bout. Retourne au Refuge pour en commencer un nouveau.' };
  }
  return null;
}

export function isSessionEnded(status: string | null | undefined, isActive: boolean | null | undefined): boolean {
  return sessionEndNotice(status, isActive) !== null;
}

/** Texte lisible d'un échec, ou null s'il n'y a rien à afficher. Les messages métier du serveur sont déjà en français. */
export function refugeErrorText(message: string | null | undefined): string | null {
  if (message === null || message === undefined) return null;
  const text = message.trim();
  if (!text) return 'La validation a échoué. Réessaie dans un instant.';
  const http = text.match(/^HTTP (\d{3})$/);
  if (http) return `Le serveur a refusé la demande (code ${http[1]}).`;
  if (/network request failed|failed to fetch|networkerror|load failed|timeout|timed out|abort/i.test(text)) {
    return 'Connexion impossible. Vérifie ta connexion et réessaie.';
  }
  return text;
}
