/**
 * Anonymat des Bouteilles à la mer — filtrage des identifiants côté serveur.
 *
 * Règle (cahier des charges, §5 et §13) : tant que les deux participants n'ont
 * pas accepté le dévoilement, aucun client ne doit recevoir l'identifiant
 * interne de l'AUTRE participant (expéditeur ou répondant). Le serveur garde
 * ces identifiants pour son propre fonctionnement ; seules les réponses API
 * sont filtrées.
 *
 * Dévoilement mutuel = statut REVEALED, ou date `revealedAt` renseignée
 * (une conversation dévoilée puis rompue reste dévoilée).
 */

export type BottleParticipants = {
  senderId: string | null;
  acceptedById: string | null;
  status: string;
  revealedAt?: Date | string | null;
};

export function isMutuallyRevealed(bottle: Pick<BottleParticipants, "status" | "revealedAt">): boolean {
  return bottle.status === "REVEALED" || bottle.revealedAt != null;
}

/**
 * Renvoie une copie de la bouteille où l'identifiant de l'autre participant est
 * remplacé par `null`, sauf après dévoilement mutuel. L'identifiant du lecteur
 * lui-même est conservé (il sert à reconnaître ses propres bouteilles).
 */
export function maskBottleParticipantsForViewer<T extends BottleParticipants>(bottle: T, viewerId: string): T {
  const isParticipant = bottle.senderId === viewerId || bottle.acceptedById === viewerId;
  if (isParticipant && isMutuallyRevealed(bottle)) return bottle;
  return {
    ...bottle,
    senderId: bottle.senderId === viewerId ? viewerId : null,
    acceptedById: bottle.acceptedById === viewerId ? viewerId : null,
  };
}
