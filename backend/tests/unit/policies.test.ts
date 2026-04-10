/**
 * Tests unitaires des policies métier JeuTaime
 * npm test
 */
import { describe, it, expect } from "vitest";
import { assertCanSendLetter, canSendLetter } from "../../src/policies/letterAlternation";
import { isPhotoUnlocked, getPhotoUnlockProgress } from "../../src/policies/photoUnlock";
import { canOpenNewMatch, getMatchLimit } from "../../src/policies/contactLimits";
import { assertCanRelance, isGhosting } from "../../src/policies/antiGhosting";
import { LetterAlternationError, GhostRelanceError } from "../../src/core/errors";

// ============================================================
// letterAlternation
// ============================================================

describe("letterAlternation", () => {
  const initiatorId = "user-A";
  const otherId = "user-B";

  it("initiateur peut envoyer la première lettre (lastLetterBy null)", () => {
    expect(
      canSendLetter({ lastLetterBy: null, senderId: initiatorId, initiatorId }),
    ).toBe(true);
  });

  it("l'autre ne peut PAS envoyer la première lettre", () => {
    expect(
      canSendLetter({ lastLetterBy: null, senderId: otherId, initiatorId }),
    ).toBe(false);
  });

  it("après lettre de A, B peut répondre", () => {
    expect(
      canSendLetter({ lastLetterBy: initiatorId, senderId: otherId, initiatorId }),
    ).toBe(true);
  });

  it("A ne peut PAS envoyer deux fois de suite", () => {
    expect(
      canSendLetter({ lastLetterBy: initiatorId, senderId: initiatorId, initiatorId }),
    ).toBe(false);
  });

  it("lance LetterAlternationError si non autorisé", () => {
    expect(() =>
      assertCanSendLetter({ lastLetterBy: initiatorId, senderId: initiatorId, initiatorId }),
    ).toThrow(LetterAlternationError);
  });

  it("B peut envoyer après réponse de A à B", () => {
    expect(
      canSendLetter({ lastLetterBy: otherId, senderId: initiatorId, initiatorId }),
    ).toBe(true);
  });
});

// ============================================================
// photoUnlock
// ============================================================

describe("photoUnlock", () => {
  it("Free : déverrouillé après 10 lettres chacun", () => {
    expect(
      isPhotoUnlocked({ myLetterCount: 10, otherLetterCount: 10, viewerIsPremium: false }),
    ).toBe(true);
  });

  it("Free : non déverrouillé si seulement 9 lettres d'un côté", () => {
    expect(
      isPhotoUnlocked({ myLetterCount: 9, otherLetterCount: 10, viewerIsPremium: false }),
    ).toBe(false);
  });

  it("Premium : déverrouillé après 3 lettres chacun", () => {
    expect(
      isPhotoUnlocked({ myLetterCount: 3, otherLetterCount: 3, viewerIsPremium: true }),
    ).toBe(true);
  });

  it("Premium : non déverrouillé avec 2 lettres seulement", () => {
    expect(
      isPhotoUnlocked({ myLetterCount: 2, otherLetterCount: 3, viewerIsPremium: true }),
    ).toBe(false);
  });

  it("getPhotoUnlockProgress retourne le bon seuil Free", () => {
    const progress = getPhotoUnlockProgress({
      myLetterCount: 5,
      otherLetterCount: 10,
      viewerIsPremium: false,
    });
    expect(progress.threshold).toBe(10);
    expect(progress.unlocked).toBe(false);
    expect(progress.myCount).toBe(5);
  });

  it("getPhotoUnlockProgress retourne le bon seuil Premium", () => {
    const progress = getPhotoUnlockProgress({
      myLetterCount: 3,
      otherLetterCount: 5,
      viewerIsPremium: true,
    });
    expect(progress.threshold).toBe(3);
    expect(progress.unlocked).toBe(true);
  });
});

// ============================================================
// contactLimits
// ============================================================

describe("contactLimits", () => {
  it("Free : limite à 5", () => expect(getMatchLimit(false)).toBe(5));
  it("Premium : limite à 20", () => expect(getMatchLimit(true)).toBe(20));

  it("Free : peut ouvrir si < 5", () => {
    expect(canOpenNewMatch(4, false)).toBe(true);
  });

  it("Free : ne peut pas ouvrir à exactement 5", () => {
    expect(canOpenNewMatch(5, false)).toBe(false);
  });

  it("Premium : peut ouvrir si < 20", () => {
    expect(canOpenNewMatch(19, true)).toBe(true);
  });

  it("Premium : ne peut pas ouvrir à exactement 20", () => {
    expect(canOpenNewMatch(20, true)).toBe(false);
  });
});

// ============================================================
// antiGhosting
// ============================================================

describe("antiGhosting", () => {
  const userId = "user-A";
  const otherId = "user-B";

  function makeDate(daysAgo: number): Date {
    return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  }

  it("isGhosting : false si aucune lettre", () => {
    expect(
      isGhosting({
        lastLetterAt: null,
        lastLetterBy: null,
        relancingUserId: userId,
        ghostRelanceUsedBy: null,
      }),
    ).toBe(false);
  });

  it("isGhosting : false si < 5 jours", () => {
    expect(
      isGhosting({
        lastLetterAt: makeDate(4),
        lastLetterBy: otherId,
        relancingUserId: userId,
        ghostRelanceUsedBy: null,
      }),
    ).toBe(false);
  });

  it("isGhosting : true si ≥ 5 jours", () => {
    expect(
      isGhosting({
        lastLetterAt: makeDate(5),
        lastLetterBy: otherId,
        relancingUserId: userId,
        ghostRelanceUsedBy: null,
      }),
    ).toBe(true);
  });

  it("assertCanRelance : OK entre 5 et 7 jours", () => {
    expect(() =>
      assertCanRelance({
        lastLetterAt: makeDate(6),
        lastLetterBy: otherId,
        relancingUserId: userId,
        ghostRelanceUsedBy: null,
      }),
    ).not.toThrow();
  });

  it("assertCanRelance : erreur si l'autre attend (c'est moi le ghost)", () => {
    expect(() =>
      assertCanRelance({
        lastLetterAt: makeDate(6),
        lastLetterBy: userId, // moi le dernier expéditeur
        relancingUserId: userId,
        ghostRelanceUsedBy: null,
      }),
    ).toThrow(GhostRelanceError);
  });

  it("assertCanRelance : erreur si < 5 jours (pas encore ghost)", () => {
    expect(() =>
      assertCanRelance({
        lastLetterAt: makeDate(3),
        lastLetterBy: otherId,
        relancingUserId: userId,
        ghostRelanceUsedBy: null,
      }),
    ).toThrow(GhostRelanceError);
  });

  it("assertCanRelance : erreur si > 7 jours (fenêtre fermée)", () => {
    expect(() =>
      assertCanRelance({
        lastLetterAt: makeDate(8),
        lastLetterBy: otherId,
        relancingUserId: userId,
        ghostRelanceUsedBy: null,
      }),
    ).toThrow(GhostRelanceError);
  });

  it("assertCanRelance : erreur si déjà utilisée", () => {
    expect(() =>
      assertCanRelance({
        lastLetterAt: makeDate(6),
        lastLetterBy: otherId,
        relancingUserId: userId,
        ghostRelanceUsedBy: userId, // déjà utilisée
      }),
    ).toThrow(GhostRelanceError);
  });
});
