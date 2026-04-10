/**
 * Tests unitaires des helpers purs du wallet.
 * Pure, aucune dépendance Prisma — toute la logique de mutation
 * de solde est isolée dans policies/wallet.ts.
 */
import { describe, it, expect } from "vitest";
import {
  computeDebitBalance,
  computeCreditBalance,
} from "../../src/policies/wallet";
import {
  BadRequestError,
  NotEnoughCoinsError,
} from "../../src/core/errors";

// ============================================================
// computeDebitBalance
// ============================================================

describe("computeDebitBalance", () => {
  it("débit valide retourne nouveau solde", () => {
    expect(computeDebitBalance(100, 30)).toBe(70);
  });

  it("débit exact du solde → 0", () => {
    expect(computeDebitBalance(50, 50)).toBe(0);
  });

  it("solde insuffisant lance NotEnoughCoinsError", () => {
    expect(() => computeDebitBalance(10, 20)).toThrow(NotEnoughCoinsError);
  });

  it("solde à 0 avec débit > 0 → NotEnoughCoinsError", () => {
    expect(() => computeDebitBalance(0, 1)).toThrow(NotEnoughCoinsError);
  });

  it("le solde ne peut JAMAIS devenir négatif", () => {
    // Quel que soit l'input, soit on obtient un résultat ≥ 0, soit ça throw
    const combos: Array<[number, number]> = [
      [0, 1],
      [5, 6],
      [99, 100],
      [1000, 1001],
    ];
    for (const [balance, amount] of combos) {
      expect(() => computeDebitBalance(balance, amount)).toThrow(
        NotEnoughCoinsError,
      );
    }
  });

  it("montant 0 → BadRequestError", () => {
    expect(() => computeDebitBalance(100, 0)).toThrow(BadRequestError);
  });

  it("montant négatif → BadRequestError", () => {
    expect(() => computeDebitBalance(100, -5)).toThrow(BadRequestError);
  });

  it("montant non entier → BadRequestError", () => {
    expect(() => computeDebitBalance(100, 5.5)).toThrow(BadRequestError);
  });
});

// ============================================================
// computeCreditBalance
// ============================================================

describe("computeCreditBalance", () => {
  it("crédit valide", () => {
    expect(computeCreditBalance(100, 30)).toBe(130);
  });

  it("crédit depuis 0", () => {
    expect(computeCreditBalance(0, 50)).toBe(50);
  });

  it("montant 0 → BadRequestError", () => {
    expect(() => computeCreditBalance(100, 0)).toThrow(BadRequestError);
  });

  it("montant négatif → BadRequestError", () => {
    expect(() => computeCreditBalance(100, -5)).toThrow(BadRequestError);
  });

  it("montant non entier → BadRequestError", () => {
    expect(() => computeCreditBalance(100, 1.5)).toThrow(BadRequestError);
  });
});

// ============================================================
// Invariants combinés : simulation d'un wallet
// ============================================================

describe("Invariants wallet (simulation)", () => {
  it("séquence credit/debit maintient le solde cohérent", () => {
    let balance = 0;
    balance = computeCreditBalance(balance, 100); // 100
    balance = computeDebitBalance(balance, 30); // 70
    balance = computeCreditBalance(balance, 20); // 90
    balance = computeDebitBalance(balance, 90); // 0
    expect(balance).toBe(0);
  });

  it("tentative de débit sur solde épuisé échoue", () => {
    let balance = 10;
    balance = computeDebitBalance(balance, 10);
    expect(balance).toBe(0);
    expect(() => computeDebitBalance(balance, 1)).toThrow(NotEnoughCoinsError);
  });
});
