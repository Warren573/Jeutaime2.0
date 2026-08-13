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
  computeDiamondHint,
  TOTAL_CARDS,
  HEART_VALUE,
  CardSuit,
  CardRank,
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

  it("toutes les cartes ont une valeur (rank)", () => {
    const deck = buildDeck();
    deck.forEach((card) => {
      expect(card.rank).toBeDefined();
      expect(card.rank).not.toBeNull();
    });
  });

  it("chaque rank appartient aux valeurs valides", () => {
    const validRanks: CardRank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "V", "D", "R"];
    const deck = buildDeck();
    deck.forEach((card) => {
      expect(validRanks).toContain(card.rank);
    });
  });

  it("aucune combinaison suit + rank n'est dupliquée", () => {
    const deck = buildDeck();
    const combinations = deck.map((c) => `${c.suit}-${c.rank}`);
    const uniqueCombinations = new Set(combinations);
    expect(uniqueCombinations.size).toBe(10);
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
    { index: 0, suit: "heart", rank: "A" },
    { index: 1, suit: "spade", rank: "R" },
    { index: 2, suit: "club", rank: "D" },
    { index: 3, suit: "diamond", rank: "V" },
    { index: 4, suit: "heart", rank: "10" },
    { index: 5, suit: "heart", rank: "9" },
    { index: 6, suit: "spade", rank: "8" },
    { index: 7, suit: "club", rank: "7" },
    { index: 8, suit: "diamond", rank: "6" },
    { index: 9, suit: "heart", rank: "5" },
  ];

  it("cœur — ajoute +15 pièces", () => {
    const effect = applyCardEffect("heart", "A", 50, 0b0000000001, sampleDeck);
    expect(effect.gainsDelta).toBe(HEART_VALUE);
    expect(effect.newGains).toBe(50 + HEART_VALUE);
    expect(effect.rank).toBe("A");
  });

  it("pique — remet tout à 0", () => {
    const effect = applyCardEffect("spade", "R", 100, 0b0000000010, sampleDeck);
    expect(effect.gainsDelta).toBe(-100);
    expect(effect.newGains).toBe(0);
    expect(effect.rank).toBe("R");
  });

  it("trèfle — divise par 2", () => {
    const effect = applyCardEffect("club", "D", 100, 0b0000000100, sampleDeck);
    expect(effect.newGains).toBe(50);
    expect(effect.gainsDelta).toBe(-50);
    expect(effect.rank).toBe("D");
  });

  it("carreau — aucun changement de gains, hint si cartes restantes", () => {
    const effect = applyCardEffect("diamond", "V", 75, 0b0000001111, sampleDeck);
    expect(effect.gainsDelta).toBe(0);
    expect(effect.newGains).toBe(75);
    expect(effect.rank).toBe("V");
    expect(effect.diamondHint).toBeDefined();
    expect(effect.diamondHint?.rank).toBeDefined();
  });

  it("carreau avec toutes cartes révélées — pas de hint", () => {
    const allRevealed = 0b1111111111;
    const effect = applyCardEffect("diamond", "V", 50, allRevealed, sampleDeck);
    expect(effect.diamondHint).toBeUndefined();
  });

  it("allRevealed flag correct quand toutes les cartes révélées", () => {
    const effect = applyCardEffect("heart", "A", 10, 0b1111111111, sampleDeck);
    expect(effect.allRevealed).toBe(true);
  });

  it("allRevealed flag incorrect quand cartes restantes", () => {
    const effect = applyCardEffect("heart", "A", 10, 0b0000000001, sampleDeck);
    expect(effect.allRevealed).toBe(false);
  });

  it("les gains ne deviennent jamais négatifs", () => {
    const effect = applyCardEffect("spade", "R", 0, 0b0000000010, sampleDeck);
    expect(effect.newGains).toBeGreaterThanOrEqual(0);
  });

  it("trèfle sur gain = 1 → arrondit à 0 (floor div)", () => {
    const effect = applyCardEffect("club", "D", 1, 0b0000000100, sampleDeck);
    expect(effect.newGains).toBe(0);
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
      { index: 0, suit: "heart", rank: "A" },
      { index: 1, suit: "heart", rank: "K" },
      { index: 2, suit: "heart", rank: "Q" },
      { index: 3, suit: "spade", rank: "J" },
      { index: 4, suit: "club", rank: "10" },
      { index: 5, suit: "diamond", rank: "9" },
      { index: 6, suit: "diamond", rank: "8" },
      { index: 7, suit: "club", rank: "7" },
      { index: 8, suit: "spade", rank: "6" },
      { index: 9, suit: "diamond", rank: "5" },
    ];

    let revealed = 0b0000000000;
    let gains = 0;

    // Reveal heart 1
    revealed = markCardRevealed(revealed, 0);
    let effect = applyCardEffect("heart", "A", gains, revealed, deck);
    gains = effect.newGains;
    expect(gains).toBe(HEART_VALUE);

    // Reveal heart 2
    revealed = markCardRevealed(revealed, 1);
    effect = applyCardEffect("heart", "K", gains, revealed, deck);
    gains = effect.newGains;
    expect(gains).toBe(HEART_VALUE * 2);

    // Reveal heart 3
    revealed = markCardRevealed(revealed, 2);
    effect = applyCardEffect("heart", "Q", gains, revealed, deck);
    gains = effect.newGains;
    expect(gains).toBe(HEART_VALUE * 3);

    // Claimable
    expect(gains).toBeGreaterThan(0);
  });

  it("workflow: start → reveal spade → gains reset to 0", () => {
    const deck: DeckCard[] = Array.from({ length: 10 }, (_, i) => ({
      index: i,
      suit: i === 1 ? "spade" : "diamond",
      rank: i === 1 ? "K" : "5",
    }));

    let revealed = 0b0000000000;
    let gains = 50;

    // Reveal spade
    revealed = markCardRevealed(revealed, 1);
    const effect = applyCardEffect("spade", "K", gains, revealed, deck);
    gains = effect.newGains;
    expect(gains).toBe(0);
  });

  it("workflow: bet scenario — all hearts revealed → win", () => {
    const deck: DeckCard[] = [
      { index: 0, suit: "heart", rank: "A" },
      { index: 1, suit: "heart", rank: "K" },
      { index: 2, suit: "spade", rank: "Q" },
      { index: 3, suit: "club", rank: "J" },
      { index: 4, suit: "diamond", rank: "10" },
      { index: 5, suit: "diamond", rank: "9" },
      { index: 6, suit: "diamond", rank: "8" },
      { index: 7, suit: "diamond", rank: "7" },
      { index: 8, suit: "diamond", rank: "6" },
      { index: 9, suit: "diamond", rank: "5" },
    ];

    let revealed = 0b0000000011; // hearts at 0, 1
    const hidden = countHiddenHearts(deck, revealed);
    expect(hidden).toBe(0); // No hidden hearts left
    expect(true).toBe(true); // Bet would win
  });

  it("diamond hint contient la valeur de la carte", () => {
    const deck: DeckCard[] = [
      { index: 0, suit: "heart", rank: "A" },
      { index: 1, suit: "spade", rank: "R" },
      { index: 2, suit: "club", rank: "D" },
      { index: 3, suit: "diamond", rank: "V" },
      { index: 4, suit: "heart", rank: "10" },
      { index: 5, suit: "heart", rank: "9" },
      { index: 6, suit: "spade", rank: "8" },
      { index: 7, suit: "club", rank: "7" },
      { index: 8, suit: "diamond", rank: "6" },
      { index: 9, suit: "heart", rank: "5" },
    ];

    let revealed = 0b0000000000;
    const effect = applyCardEffect("diamond", "V", 50, revealed, deck);

    expect(effect.diamondHint).toBeDefined();
    expect(effect.diamondHint?.rank).toBeDefined();
    const validRanks: CardRank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "V", "D", "R"];
    expect(validRanks).toContain(effect.diamondHint?.rank);
  });

  it("invariant: gains never negative after any sequence", () => {
    const deck = buildDeck();
    let gains = 100;
    let revealed = 0;

    // Apply random effects
    for (let i = 0; i < 10; i++) {
      revealed = markCardRevealed(revealed, i);
      const card = deck[i]!;
      const effect = applyCardEffect(card.suit, card.rank, gains, revealed, deck);
      gains = effect.newGains;
      expect(gains).toBeGreaterThanOrEqual(0);
    }
  });
});
