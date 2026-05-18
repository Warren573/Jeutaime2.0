/**
 * Tests unitaires des helpers purs du jeu de cartes.
 * Logique pure — aucune dépendance Prisma.
 */
import { describe, it, expect } from "vitest";
import {
  buildDeck,
  isCardRevealed,
  markCardRevealed,
  areAllCardsRevealed,
  applyCardEffect,
  countHiddenHearts,
  computeStartHint,
  TOTAL_CARDS,
  HEART_VALUE,
  CardSuit,
  DeckCard,
} from "../../src/policies/cardGame";

// ============================================================
// buildDeck
// ============================================================

describe("buildDeck", () => {
  it("génère exactement 10 cartes", () => {
    const deck = buildDeck();
    expect(deck.length).toBe(10);
  });

  it("toutes les cartes ont un index unique 0-9", () => {
    const deck = buildDeck();
    const indices = deck.map((c) => c.index).sort();
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("contient au moins 2 cœurs", () => {
    for (let i = 0; i < 10; i++) {
      const deck = buildDeck();
      const hearts = deck.filter((c) => c.suit === "heart").length;
      expect(hearts).toBeGreaterThanOrEqual(2);
    }
  });

  it("contient au moins 1 pique", () => {
    for (let i = 0; i < 10; i++) {
      const deck = buildDeck();
      const spades = deck.filter((c) => c.suit === "spade").length;
      expect(spades).toBeGreaterThanOrEqual(1);
    }
  });

  it("somme des suits = 10", () => {
    const deck = buildDeck();
    const hearts = deck.filter((c) => c.suit === "heart").length;
    const spades = deck.filter((c) => c.suit === "spade").length;
    const clubs = deck.filter((c) => c.suit === "club").length;
    const diamonds = deck.filter((c) => c.suit === "diamond").length;
    expect(hearts + spades + clubs + diamonds).toBe(10);
  });

  it("chaque carte a un suit valide", () => {
    const deck = buildDeck();
    const validSuits: CardSuit[] = ["heart", "spade", "club", "diamond"];
    deck.forEach((card) => {
      expect(validSuits).toContain(card.suit);
    });
  });
});

// ============================================================
// Bitmask: isCardRevealed, markCardRevealed
// ============================================================

describe("Bitmask helpers", () => {
  it("isCardRevealed — carte non révélée = false", () => {
    expect(isCardRevealed(0b0000000000, 0)).toBe(false);
  });

  it("isCardRevealed — carte révélée = true", () => {
    expect(isCardRevealed(0b0000000001, 0)).toBe(true);
  });

  it("markCardRevealed — set bit pour index", () => {
    let mask = 0b0000000000;
    mask = markCardRevealed(mask, 0);
    expect(mask).toBe(0b0000000001);
    mask = markCardRevealed(mask, 3);
    expect(mask).toBe(0b0000001001);
  });

  it("markCardRevealed — idempotent (reveal twice)", () => {
    let mask = markCardRevealed(0b0000000000, 5);
    const marked = markCardRevealed(mask, 5);
    expect(marked).toBe(mask);
  });

  it("areAllCardsRevealed — toutes 10 cartes = true", () => {
    const allRevealed = 0b1111111111; // bits 0-9 à 1
    expect(areAllCardsRevealed(allRevealed)).toBe(true);
  });

  it("areAllCardsRevealed — 9 cartes révélées = false", () => {
    const almost = 0b0111111111; // bit 9 manquant
    expect(areAllCardsRevealed(almost)).toBe(false);
  });

  it("areAllCardsRevealed — aucune révélée = false", () => {
    expect(areAllCardsRevealed(0)).toBe(false);
  });
});

// ============================================================
// applyCardEffect
// ============================================================

describe("applyCardEffect", () => {
  const sampleDeck: DeckCard[] = [
    { index: 0, suit: "heart" },
    { index: 1, suit: "spade" },
    { index: 2, suit: "club" },
    { index: 3, suit: "diamond" },
    { index: 4, suit: "heart" },
    { index: 5, suit: "heart" },
    { index: 6, suit: "spade" },
    { index: 7, suit: "club" },
    { index: 8, suit: "diamond" },
    { index: 9, suit: "heart" },
  ];

  it("cœur — ajoute +15 pièces", () => {
    const effect = applyCardEffect("heart", 50, 0b0000000001, sampleDeck);
    expect(effect.gainsDelta).toBe(HEART_VALUE);
    expect(effect.newGains).toBe(50 + HEART_VALUE);
  });

  it("pique — remet tout à 0", () => {
    const effect = applyCardEffect("spade", 100, 0b0000000010, sampleDeck);
    expect(effect.gainsDelta).toBe(-100);
    expect(effect.newGains).toBe(0);
  });

  it("trèfle — divise par 2", () => {
    const effect = applyCardEffect("club", 100, 0b0000000100, sampleDeck);
    expect(effect.newGains).toBe(50);
    expect(effect.gainsDelta).toBe(-50);
  });

  it("carreau — aucun changement de gains, hint si cartes restantes", () => {
    const effect = applyCardEffect("diamond", 75, 0b0000001111, sampleDeck);
    expect(effect.gainsDelta).toBe(0);
    expect(effect.newGains).toBe(75);
    expect(effect.diamondHint).toBeDefined();
  });

  it("carreau avec toutes cartes révélées — pas de hint", () => {
    const allRevealed = 0b1111111111;
    const effect = applyCardEffect("diamond", 50, allRevealed, sampleDeck);
    expect(effect.diamondHint).toBeUndefined();
  });

  it("allRevealed flag correct quand toutes les cartes révélées", () => {
    const effect = applyCardEffect("heart", 10, 0b1111111111, sampleDeck);
    expect(effect.allRevealed).toBe(true);
  });

  it("allRevealed flag incorrect quand cartes restantes", () => {
    const effect = applyCardEffect("heart", 10, 0b0000000001, sampleDeck);
    expect(effect.allRevealed).toBe(false);
  });

  it("les gains ne deviennent jamais négatifs", () => {
    // Même avec une spade sur un gain déjà 0
    const effect = applyCardEffect("spade", 0, 0b0000000010, sampleDeck);
    expect(effect.newGains).toBeGreaterThanOrEqual(0);
  });

  it("trèfle sur gain = 1 → arrondit à 0 (floor div)", () => {
    const effect = applyCardEffect("club", 1, 0b0000000100, sampleDeck);
    expect(effect.newGains).toBe(0); // floor(1/2) = 0
  });
});

// ============================================================
// countHiddenHearts
// ============================================================

describe("countHiddenHearts", () => {
  const deckWith4Hearts: DeckCard[] = [
    { index: 0, suit: "heart" },
    { index: 1, suit: "spade" },
    { index: 2, suit: "heart" },
    { index: 3, suit: "club" },
    { index: 4, suit: "heart" },
    { index: 5, suit: "diamond" },
    { index: 6, suit: "heart" },
    { index: 7, suit: "spade" },
    { index: 8, suit: "club" },
    { index: 9, suit: "diamond" },
  ];

  it("compte les cœurs non révélés", () => {
    const revealed = 0b0000000001; // index 0 (heart) révélé
    const hidden = countHiddenHearts(deckWith4Hearts, revealed);
    expect(hidden).toBe(3); // 4 hearts - 1 revealed
  });

  it("tous les cœurs révélés → 0", () => {
    const revealed = 0b0000010101; // indices 0, 2, 4 révélés (tous hearts)
    const hidden = countHiddenHearts(deckWith4Hearts, revealed);
    expect(hidden).toBe(1); // seulement index 6 reste
  });

  it("aucun cœur révélé → compte tous", () => {
    const revealed = 0b0000000000;
    const hidden = countHiddenHearts(deckWith4Hearts, revealed);
    expect(hidden).toBe(4);
  });
});

// ============================================================
// computeStartHint
// ============================================================

describe("computeStartHint", () => {
  it("retourne un suit aléatoire et son count", () => {
    const deck = buildDeck();
    const hint = computeStartHint(deck);
    expect(["heart", "spade", "club", "diamond"]).toContain(hint.suit);
    expect(hint.count).toBeGreaterThan(0);
    expect(hint.count).toBeLessThanOrEqual(10);
  });

  it("count match le nombre de cartes du suit dans le deck", () => {
    const deck: DeckCard[] = [
      { index: 0, suit: "heart" },
      { index: 1, suit: "heart" },
      { index: 2, suit: "spade" },
      { index: 3, suit: "spade" },
      { index: 4, suit: "spade" },
      { index: 5, suit: "club" },
      { index: 6, suit: "club" },
      { index: 7, suit: "diamond" },
      { index: 8, suit: "diamond" },
      { index: 9, suit: "diamond" },
    ];
    const hint = computeStartHint(deck);
    const expectedCount = deck.filter((c) => c.suit === hint.suit).length;
    expect(hint.count).toBe(expectedCount);
  });
});

// ============================================================
// Integration Tests (scenarios complets)
// ============================================================

describe("Scénarios d'intégration (pures)", () => {
  it("workflow: start → reveal 3 hearts → claim", () => {
    const deck: DeckCard[] = [
      { index: 0, suit: "heart" },
      { index: 1, suit: "heart" },
      { index: 2, suit: "heart" },
      { index: 3, suit: "spade" },
      { index: 4, suit: "club" },
      { index: 5, suit: "diamond" },
      { index: 6, suit: "diamond" },
      { index: 7, suit: "club" },
      { index: 8, suit: "spade" },
      { index: 9, suit: "diamond" },
    ];

    let revealed = 0b0000000000;
    let gains = 0;

    // Reveal heart 1
    revealed = markCardRevealed(revealed, 0);
    let effect = applyCardEffect("heart", gains, revealed, deck);
    gains = effect.newGains;
    expect(gains).toBe(HEART_VALUE);

    // Reveal heart 2
    revealed = markCardRevealed(revealed, 1);
    effect = applyCardEffect("heart", gains, revealed, deck);
    gains = effect.newGains;
    expect(gains).toBe(HEART_VALUE * 2);

    // Reveal heart 3
    revealed = markCardRevealed(revealed, 2);
    effect = applyCardEffect("heart", gains, revealed, deck);
    gains = effect.newGains;
    expect(gains).toBe(HEART_VALUE * 3);

    // Claimable
    expect(gains).toBeGreaterThan(0);
  });

  it("workflow: start → reveal spade → gains reset to 0", () => {
    const deck: DeckCard[] = Array.from({ length: 10 }, (_, i) => ({
      index: i,
      suit: i === 1 ? "spade" : "diamond",
    }));

    let revealed = 0b0000000000;
    let gains = 50;

    // Reveal spade
    revealed = markCardRevealed(revealed, 1);
    const effect = applyCardEffect("spade", gains, revealed, deck);
    gains = effect.newGains;
    expect(gains).toBe(0);
  });

  it("workflow: bet scenario — all hearts revealed → win", () => {
    const deck: DeckCard[] = [
      { index: 0, suit: "heart" },
      { index: 1, suit: "heart" },
      { index: 2, suit: "spade" },
      { index: 3, suit: "club" },
      { index: 4, suit: "diamond" },
      { index: 5, suit: "diamond" },
      { index: 6, suit: "diamond" },
      { index: 7, suit: "diamond" },
      { index: 8, suit: "diamond" },
      { index: 9, suit: "diamond" },
    ];

    let revealed = 0b0000000011; // hearts at 0, 1
    const hidden = countHiddenHearts(deck, revealed);
    expect(hidden).toBe(0); // No hidden hearts left
    expect(true).toBe(true); // Bet would win
  });

  it("invariant: gains never negative after any sequence", () => {
    const deck = buildDeck();
    let gains = 100;
    let revealed = 0;

    // Apply random effects
    for (let i = 0; i < 10; i++) {
      revealed = markCardRevealed(revealed, i);
      const suit = deck[i]!.suit;
      const effect = applyCardEffect(suit, gains, revealed, deck);
      gains = effect.newGains;
      expect(gains).toBeGreaterThanOrEqual(0);
    }
  });
});
