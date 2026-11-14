/**
 * Lecture d'UNE bouteille précise (ouverte depuis une notification) — logique PURE, testée à part.
 *
 * `GET /bottles/current` ne renvoie que la correspondance la plus récente. Une notification vise une bouteille
 * précise (`bottleId`) qui peut être une autre correspondance (comptes Premium : jusqu'à 5). Cet utilitaire recompose,
 * pour cette bouteille, EXACTEMENT l'état que le serveur calcule pour la bouteille courante (même ordre des lettres,
 * mêmes règles) à partir de `GET /bottles/:id/messages` (déjà utilisé par l'historique) et du statut de la bouteille.
 *
 * Anonymat : seules les données déjà visibles pour le participant sont utilisées (`isMine`, texte des lettres).
 * Aucun identifiant de l'autre personne n'est lu, conservé ou affiché.
 */
import type { BottleMessageWithMetadata, GetCurrentBottleResponse } from '../api/bottles';

type BottleStatus = NonNullable<GetCurrentBottleResponse['bottle']>['status'];

/** Une correspondance se lit tant qu'elle est établie ; en mer, rompue ou expirée, il n'y a rien à lire ici. */
const READABLE: readonly BottleStatus[] = ['ACCEPTED', 'REVEALED'];

/** Vrai si l'écran doit charger une bouteille précise plutôt que la bouteille courante. */
export function shouldLoadSpecificBottle(requestedId: unknown, current: GetCurrentBottleResponse | null): requestedId is string {
  if (typeof requestedId !== 'string' || requestedId.length === 0) return false;
  return current?.bottle?.id !== requestedId;
}

/**
 * État de lecture d'une bouteille précise, au format de `GET /bottles/current`.
 * `null` si la bouteille n'est pas lisible (statut, aucun message) : l'écran retombe alors sur la bouteille courante.
 */
export function deriveReadingState(input: {
  bottleId: string;
  status: unknown;
  /** Lettres dans l'ordre du serveur : message initial, puis réponses. */
  messages: readonly BottleMessageWithMetadata[];
  /** Quota de création, repris de la bouteille courante (il ne dépend pas de la bouteille lue). */
  canCreateBottle: boolean;
}): GetCurrentBottleResponse | null {
  const { bottleId, status, messages } = input;
  if (!READABLE.includes(status as BottleStatus)) return null;
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const latest = messages[messages.length - 1]!;
  const iAmSender = messages.some((m) => m.source === 'INITIAL_BOTTLE' && m.isMine);
  // « La personne qui a répondu a écrit au moins une lettre » (règle du serveur pour pouvoir rompre).
  const hasAcceptorReply = messages.some((m) => m.source === 'ANONYMOUS_MESSAGE' && (iAmSender ? !m.isMine : m.isMine));

  return {
    bottle: { id: bottleId, status: status as BottleStatus },
    latestLetter: { id: latest.id, content: latest.content, createdAt: latest.createdAt, isMine: latest.isMine, source: latest.source },
    canReply: !latest.isMine,
    waitingForReply: latest.isMine,
    canCreateBottle: input.canCreateBottle,
    canBreak: hasAcceptorReply,
    messageCount: messages.length,
  };
}
