/**
 * Logique pure du jeu de cartes — aucune dépendance Prisma.
 * Source unique de vérité pour la mécanique de jeu.
 *
 * Invariants :
 *   - Le deck est généré côté serveur et jamais exposé complet au client
 *   - Les gains ne peuvent pas devenir négatifs
 *   - revealed est un bitmask 10 bits (positions 0–9)
 */

export type CardSuit = "heart" | "spade" | "club" | "diamond";
export type CardRow = 1 | 2;

export interface DeckCard {
  index: number; // 0–9
  suit: CardSuit;
}

export interface CardEffect {
  suit: CardSuit;
  gainsDelta: number;    // variation appliquée (pour affichage)
  newGains: number;      // solde résultant
  allRevealed: boolean;
  diamondHint?: DiamondHint;
}

export interface DiamondHint {
  row: CardRow;
  suit: CardSuit;
}

export interface GameStartHint {
  suit: CardSuit;
  count: number;
}

// ── Constantes ───────────────────────────────────────────────────────────────

export const ENTRY_COST    = 20;
export const HEART_VALUE   = 15;
export const TOTAL_CARDS   = 10;
export const COLS          = 5;
export const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ── buildDeck ────────────────────────────────────────────────────────────────

/**
 * Génère un deck de 10 cartes mélangées côté serveur.
 * Garantit au moins 2 cœurs et 1 pique.
 */
export function buildDeck(): DeckCard[] {
  const heartCount   = 2 + Math.floor(Math.random() * 3); // 2, 3 ou 4
  const spadeCount   = 1 + Math.floor(Math.random() * 2); // 1 ou 2
  const clubCount    = 1 + Math.floor(Math.random() * 2); // 1 ou 2
  const diamondCount = TOTAL_CARDS - heartCount - spadeCount - clubCount;

  const suits: CardSuit[] = [
    ...Array<CardSuit>(heartCount).fill("heart"),
    ...Array<CardSuit>(spadeCount).fill("spade"),
    ...Array<CardSuit>(clubCount).fill("club"),
    ...Array<CardSuit>(Math.max(0, diamondCount)).fill("diamond"),
  ];

  // Fisher-Yates
  for (let i = suits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = suits[i] as CardSuit;
    suits[i] = suits[j] as CardSuit;
    suits[j] = tmp;
  }

  return suits.map((suit, index) => ({ index, suit }));
}

// ── Bitmask helpers ──────────────────────────────────────────────────────────

export function isCardRevealed(revealed: number, index: number): boolean {
  return (revealed & (1 << index)) !== 0;
}

export function markCardRevealed(revealed: number, index: number): number {
  return revealed | (1 << index);
}

export function areAllCardsRevealed(revealed: number): boolean {
  // 10 cartes → tous les bits 0–9 à 1 = 0b1111111111 = 1023
  return revealed === (1 << TOTAL_CARDS) - 1;
}

// ── applyCardEffect ──────────────────────────────────────────────────────────

/**
 * Calcule le nouvel état des gains après révélation d'une carte.
 * Pur — ne mute rien.
 */
export function applyCardEffect(
  suit: CardSuit,
  gainsCurrent: number,
  newRevealed: number,
  deck: DeckCard[],
): CardEffect {
  let newGains = gainsCurrent;
  let gainsDelta = 0;

  switch (suit) {
    case "heart":
      newGains = gainsCurrent + HEART_VALUE;
      gainsDelta = HEART_VALUE;
      break;
    case "spade":
      gainsDelta = -gainsCurrent;
      newGains = 0;
      break;
    case "club":
      newGains = Math.floor(gainsCurrent / 2);
      gainsDelta = newGains - gainsCurrent;
      break;
    case "diamond":
      // Pas de changement de gains
      break;
  }

  const allRevealed = areAllCardsRevealed(newRevealed);
  const diamondHint = suit === "diamond"
    ? computeDiamondHint(deck, newRevealed)
    : undefined;

  return { suit, gainsDelta, newGains, allRevealed, diamondHint };
}

// ── computeDiamondHint ───────────────────────────────────────────────────────

/**
 * Retourne un indice sur une carte encore non révélée.
 * Révèle son suit et sa rangée (1 = indices 0-4, 2 = indices 5-9).
 */
export function computeDiamondHint(
  deck: DeckCard[],
  revealed: number,
): DiamondHint | undefined {
  const hidden = deck.filter((c) => !isCardRevealed(revealed, c.index));
  if (hidden.length === 0) return undefined;
  const pick = hidden[Math.floor(Math.random() * hidden.length)]!;
  return {
    row: (pick.index < COLS ? 1 : 2) as CardRow,
    suit: pick.suit,
  };
}

// ── computeStartHint ─────────────────────────────────────────────────────────

/**
 * Indice de départ : compte d'un suit aléatoire dans le deck.
 * Ne révèle pas les positions.
 */
export function computeStartHint(deck: DeckCard[]): GameStartHint {
  const suits: CardSuit[] = ["heart", "spade", "club", "diamond"];
  const suit = suits[Math.floor(Math.random() * suits.length)] as CardSuit;
  const count = deck.filter((c) => c.suit === suit).length;
  return { suit, count };
}

// ── countHiddenHearts ────────────────────────────────────────────────────────

/**
 * Compte les cœurs encore non révélés (pour le pari "plus de cœurs").
 */
export function countHiddenHearts(deck: DeckCard[], revealed: number): number {
  return deck.filter(
    (c) => c.suit === "heart" && !isCardRevealed(revealed, c.index),
  ).length;
}
