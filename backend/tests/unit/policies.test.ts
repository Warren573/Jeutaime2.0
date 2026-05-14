/**
 * Tests unitaires des policies métier JeuTaime
 * npm test
 */
import { describe, it, expect } from "vitest";
import { assertCanSendLetter, canSendLetter } from "../../src/policies/letterAlternation";
import { getPhotoLevel, getPhotoVariant, getPhotoUnlockProgress } from "../../src/policies/photoUnlock";
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
  it("getPhotoLevel Free : level 0 avec 0-2 lettres", () => {
    expect(getPhotoLevel({ totalLetters: 0, viewerIsPremium: false })).toBe(0);
    expect(getPhotoLevel({ totalLetters: 1, viewerIsPremium: false })).toBe(0);
    expect(getPhotoLevel({ totalLetters: 2, viewerIsPremium: false })).toBe(0);
  });

  it("getPhotoLevel Free : level 1 avec 3-5 lettres", () => {
    expect(getPhotoLevel({ totalLetters: 3, viewerIsPremium: false })).toBe(1);
    expect(getPhotoLevel({ totalLetters: 5, viewerIsPremium: false })).toBe(1);
  });

  it("getPhotoLevel Free : level 2 avec 6-9 lettres", () => {
    expect(getPhotoLevel({ totalLetters: 6, viewerIsPremium: false })).toBe(2);
    expect(getPhotoLevel({ totalLetters: 9, viewerIsPremium: false })).toBe(2);
  });

  it("getPhotoLevel Free : level 3 avec 10+ lettres", () => {
    expect(getPhotoLevel({ totalLetters: 10, viewerIsPremium: false })).toBe(3);
    expect(getPhotoLevel({ totalLetters: 50, viewerIsPremium: false })).toBe(3);
  });

  it("getPhotoLevel Premium : level 1 avec 1 lettre", () => {
    expect(getPhotoLevel({ totalLetters: 1, viewerIsPremium: true })).toBe(1);
  });

  it("getPhotoLevel Premium : level 3 avec 3+ lettres", () => {
    expect(getPhotoLevel({ totalLetters: 3, viewerIsPremium: true })).toBe(3);
    expect(getPhotoLevel({ totalLetters: 100, viewerIsPremium: true })).toBe(3);
  });

  it("getPhotoVariant niveau 0 = null", () => {
    expect(getPhotoVariant(0)).toBe(null);
  });

  it("getPhotoVariant niveau 1 = blurred", () => {
    expect(getPhotoVariant(1)).toBe("blurred");
  });

  it("getPhotoVariant niveau 2 = medium", () => {
    expect(getPhotoVariant(2)).toBe("medium");
  });

  it("getPhotoVariant niveau 3 = original", () => {
    expect(getPhotoVariant(3)).toBe("original");
  });

  it("getPhotoUnlockProgress Free : level 1 à 5 lettres", () => {
    const progress = getPhotoUnlockProgress({
      totalLetters: 5,
      viewerIsPremium: false,
    });
    expect(progress.level).toBe(1);
    expect(progress.totalLetters).toBe(5);
    expect(progress.nextLevelAt).toBe(6);
  });

  it("getPhotoUnlockProgress Premium : level 3 à 3 lettres", () => {
    const progress = getPhotoUnlockProgress({
      totalLetters: 3,
      viewerIsPremium: true,
    });
    expect(progress.level).toBe(3);
    expect(progress.totalLetters).toBe(3);
    expect(progress.nextLevelAt).toBe(null);
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
