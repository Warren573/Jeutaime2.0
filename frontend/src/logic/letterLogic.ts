// ============================================================
// LOGIQUE MÉTIER — SYSTÈME DE LETTRES ALTERNÉES
// ============================================================
// RÈGLE CENTRALE : une personne ne peut jamais envoyer une
// nouvelle lettre tant que l'autre n'a pas répondu.
// A → B → A → B → … (jamais A → A)
// ============================================================

import type { Match, Letter } from '../shared/types';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * État de la correspondance du point de vue de currentUserId.
 *
 * locked         → match non valide (3 questions non terminées)
 * first_turn     → aucune lettre, et c'est moi qui écris en premier
 * awaiting_first → aucune lettre, l'autre écrit en premier
 * must_reply     → dernière lettre de l'autre → mon tour de répondre
 * waiting_reply  → j'ai écrit en dernier → j'attends sa réponse
 */
export type LetterStatus =
  | 'locked'
  | 'first_turn'
  | 'awaiting_first'
  | 'must_reply'
  | 'waiting_reply';

export interface LetterStatusConfig {
  status: LetterStatus;
  /** Label court affiché dans la boîte aux lettres */
  label: string;
  /** Sous-label explicatif */
  sublabel: string;
  /** Texte du CTA (bouton / zone d'action) */
  ctaLabel: string;
  /** true si l'utilisateur peut envoyer une lettre */
  canSend: boolean;
  /** true s'il y a une lettre non lue à afficher */
  hasUnread: boolean;
  /** Couleur d'accent pour l'UI */
  accent: string;
  /** Icône représentant l'état */
  icon: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Récupère les lettres d'une correspondance (les deux participants uniquement). */
export function getMatchLetters(letters: Letter[], match: Match): Letter[] {
  const a = match.userAId;
  const b = match.userBId;
  return letters
    .filter(
      l =>
        (l.fromUserId === a && l.toUserId === b) ||
        (l.fromUserId === b && l.toUserId === a),
    )
    .sort((x, y) => x.createdAt - y.createdAt);
}

// ─── Logique principale ───────────────────────────────────────────────────────

/**
 * Retourne l'état de la correspondance du point de vue de currentUserId.
 *
 * Règles :
 * 1. Si le match n'est pas valide (questions non faites) → locked
 * 2. Si aucune lettre → userAId est désigné premier expéditeur
 * 3. Si des lettres existent → regarder qui a envoyé la DERNIÈRE lettre
 *    - c'était moi  → waiting_reply (je dois attendre)
 *    - c'était lui  → must_reply    (je dois répondre)
 */
export function getLetterStatus(
  match: Match,
  letters: Letter[],
  currentUserId: string,
): LetterStatus {
  // Cas 1 — correspondance verrouillée
  if (!match.questionValidation?.isValid) return 'locked';

  const conv = getMatchLetters(letters, match);

  // Cas 2 — aucune lettre échangée
  if (conv.length === 0) {
    // userAId est le premier expéditeur désigné
    return match.userAId === currentUserId ? 'first_turn' : 'awaiting_first';
  }

  // Cas 3 — au moins une lettre échangée
  const last = conv[conv.length - 1];
  return last.fromUserId === currentUserId ? 'waiting_reply' : 'must_reply';
}

/**
 * Retourne true si currentUserId peut envoyer une lettre maintenant.
 * Centralise la règle d'alternance : jamais deux lettres consécutives
 * du même expéditeur.
 */
export function canSendLetter(
  match: Match,
  letters: Letter[],
  currentUserId: string,
): boolean {
  const s = getLetterStatus(match, letters, currentUserId);
  return s === 'first_turn' || s === 'must_reply';
}

/**
 * Retourne la configuration UI complète pour un état donné.
 */
export function getStatusConfig(
  status: LetterStatus,
  otherName: string,
): LetterStatusConfig {
  switch (status) {
    case 'locked':
      return {
        status,
        label: 'Correspondance verrouillée',
        sublabel: 'Répondez aux 3 questions pour débloquer',
        ctaLabel: '🔒  Verrouillé',
        canSend: false,
        hasUnread: false,
        accent: '#9E9E9E',
        icon: '🔒',
      };

    case 'awaiting_first':
      return {
        status,
        label: `En attente de ${otherName}`,
        sublabel: `${otherName} écrira la première lettre`,
        ctaLabel: '⌛  En attente…',
        canSend: false,
        hasUnread: false,
        accent: '#78909C',
        icon: '⌛',
      };

    case 'first_turn':
      return {
        status,
        label: 'Première lettre à envoyer',
        sublabel: "C'est à vous d'écrire en premier",
        ctaLabel: '🪶  Écrire la première lettre',
        canSend: true,
        hasUnread: false,
        accent: '#B8860B',
        icon: '🪶',
      };

    case 'must_reply':
      return {
        status,
        label: `${otherName} vous a écrit !`,
        sublabel: 'Nouvelle lettre · À votre tour de répondre',
        ctaLabel: '💌  Lire et répondre',
        canSend: true,
        hasUnread: true,
        accent: '#C62828',
        icon: '💌',
      };

    case 'waiting_reply':
      return {
        status,
        label: 'Lettre envoyée',
        sublabel: `En attente de la réponse de ${otherName}`,
        ctaLabel: '📮  En attente de sa réponse…',
        canSend: false,
        hasUnread: false,
        accent: '#5C6BC0',
        icon: '📮',
      };
  }
}
