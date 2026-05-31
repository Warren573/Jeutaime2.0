/**
 * Tests unitaires de la logique d'accès photos avec révélation progressive.
 * Pures fonctions → aucun mock Prisma nécessaire.
 */
import { describe, it, expect } from "vitest";
import {
  resolvePhotoAccess,
  pickNextPrimary,
  type PhotoAccessContext,
} from "../../src/modules/photos/photos.access";
import {
  getPhotoLevel,
  getPhotoVariant,
} from "../../src/policies/photoUnlock";

// ============================================================
// getPhotoLevel — Binary photo unlock system
// ============================================================

describe("getPhotoLevel", () => {
  // --- FREE users (threshold: 10 letters) ---

  it("FREE Level 0: < 10 lettres", () => {
    expect(getPhotoLevel({ totalLetters: 0, viewerIsPremium: false })).toBe(0);
    expect(getPhotoLevel({ totalLetters: 1, viewerIsPremium: false })).toBe(0);
    expect(getPhotoLevel({ totalLetters: 9, viewerIsPremium: false })).toBe(0);
  });

  it("FREE Level 3: >= 10 lettres", () => {
    expect(getPhotoLevel({ totalLetters: 10, viewerIsPremium: false })).toBe(3);
    expect(getPhotoLevel({ totalLetters: 50, viewerIsPremium: false })).toBe(3);
  });

  // --- PREMIUM users (threshold: 3 letters) ---

  it("PREMIUM Level 0: < 3 lettres", () => {
    expect(getPhotoLevel({ totalLetters: 0, viewerIsPremium: true })).toBe(0);
    expect(getPhotoLevel({ totalLetters: 1, viewerIsPremium: true })).toBe(0);
    expect(getPhotoLevel({ totalLetters: 2, viewerIsPremium: true })).toBe(0);
  });

  it("PREMIUM Level 3: >= 3 lettres", () => {
    expect(getPhotoLevel({ totalLetters: 3, viewerIsPremium: true })).toBe(3);
    expect(getPhotoLevel({ totalLetters: 100, viewerIsPremium: true })).toBe(3);
  });
});

// ============================================================
// getPhotoVariant — Binary system (original or null only)
// ============================================================

describe("getPhotoVariant", () => {
  it("level 0 retourne null (avatar only)", () => {
    expect(getPhotoVariant(0)).toBe(null);
  });

  it("level 3 retourne 'original' (full photo)", () => {
    expect(getPhotoVariant(3)).toBe("original");
  });
});

// ============================================================
// resolvePhotoAccess
// ============================================================

describe("resolvePhotoAccess", () => {
  const viewerId = "user-viewer";
  const ownerId = "user-owner";

  const baseCtx: PhotoAccessContext = {
    viewerId,
    ownerId,
    viewerIsPremium: false,
    hasBlock: false,
    match: null,
  };

  // --- Owner --------------------------------------------------

  it("owner peut toujours accéder (level 3, original)", () => {
    const res = resolvePhotoAccess({ ...baseCtx, viewerId: ownerId });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("OWNER");
    expect(res.level).toBe(3);
    expect(res.variant).toBe("original");
  });

  // --- Block --------------------------------------------------

  it("block refuse toujours", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      hasBlock: true,
      match: { userAId: viewerId, letterCountA: 100, letterCountB: 100 },
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("BLOCKED");
  });

  // --- No match --------------------------------------------------

  it("pas de match refuse", () => {
    const res = resolvePhotoAccess(baseCtx);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("NO_MATCH");
  });

  // --- FREE user progression (threshold: 10) --------------------------------------------------

  it("FREE < 10 lettres = level 0 (not allowed)", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      match: { userAId: viewerId, letterCountA: 4, letterCountB: 5 },
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("LEVEL_0");
    expect(res.level).toBe(0);
  });

  it("FREE >= 10 lettres = level 3 (allowed)", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      match: { userAId: viewerId, letterCountA: 5, letterCountB: 5 },
    });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("LEVEL_3");
    expect(res.level).toBe(3);
    expect(res.variant).toBe("original");
  });

  it("FREE 10 lettres exactly = level 3 (allowed)", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      match: { userAId: viewerId, letterCountA: 10, letterCountB: 0 },
    });
    expect(res.allowed).toBe(true);
    expect(res.level).toBe(3);
    expect(res.variant).toBe("original");
  });

  // --- PREMIUM user progression (threshold: 3) --------------------------------------------------

  it("PREMIUM < 3 lettres = level 0 (not allowed)", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      viewerIsPremium: true,
      match: { userAId: viewerId, letterCountA: 1, letterCountB: 1 },
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("LEVEL_0");
    expect(res.level).toBe(0);
  });

  it("PREMIUM >= 3 lettres = level 3 (allowed)", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      viewerIsPremium: true,
      match: { userAId: viewerId, letterCountA: 3, letterCountB: 0 },
    });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("LEVEL_3");
    expect(res.level).toBe(3);
    expect(res.variant).toBe("original");
  });

  // --- Asymmetric case --------------------------------------------------

  it("asymmetric FREE: A sends 50, B sends 0 = level 3 (total 50)", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      match: { userAId: viewerId, letterCountA: 50, letterCountB: 0 },
    });
    expect(res.allowed).toBe(true);
    expect(res.level).toBe(3);
    expect(res.variant).toBe("original");
  });

  it("asymmetric PREMIUM: A sends 3, B sends 0 = level 3 (total 3)", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      viewerIsPremium: true,
      match: { userAId: viewerId, letterCountA: 3, letterCountB: 0 },
    });
    expect(res.allowed).toBe(true);
    expect(res.level).toBe(3);
    expect(res.variant).toBe("original");
  });
});

// ============================================================
// pickNextPrimary
// ============================================================

describe("pickNextPrimary", () => {
  const make = (id: string, position: number, createdAtMs: number) => ({
    id,
    position,
    createdAt: new Date(createdAtMs),
  });

  it("retourne null pour un tableau vide", () => {
    expect(pickNextPrimary([])).toBe(null);
  });

  it("retourne l'unique photo restante", () => {
    const p = make("a", 0, 1000);
    expect(pickNextPrimary([p])?.id).toBe("a");
  });

  it("position ASC est le critère principal", () => {
    const photos = [
      make("c", 2, 1000),
      make("a", 0, 3000),
      make("b", 1, 2000),
    ];
    expect(pickNextPrimary(photos)?.id).toBe("a");
  });

  it("createdAt ASC départage à position égale", () => {
    const photos = [
      make("a", 0, 2000),
      make("b", 0, 1000), // plus ancienne
      make("c", 0, 3000),
    ];
    expect(pickNextPrimary(photos)?.id).toBe("b");
  });

  it("id ASC départage à position + createdAt égaux", () => {
    const photos = [make("b", 0, 1000), make("a", 0, 1000)];
    expect(pickNextPrimary(photos)?.id).toBe("a");
  });

  it("résultat stable pour n'importe quel ordre d'entrée", () => {
    const photos = [
      make("x", 0, 1000),
      make("y", 0, 1000),
      make("z", 0, 1000),
    ];
    const shuffled = [photos[2], photos[0], photos[1]].filter(
      (p): p is NonNullable<typeof p> => p !== undefined,
    );
    expect(pickNextPrimary(photos)?.id).toBe(pickNextPrimary(shuffled)?.id);
    expect(pickNextPrimary(photos)?.id).toBe("x");
  });

  it("ne mute pas le tableau d'entrée", () => {
    const photos = [make("b", 1, 1000), make("a", 0, 2000)];
    const snapshot = photos.map((p) => p.id);
    pickNextPrimary(photos);
    expect(photos.map((p) => p.id)).toEqual(snapshot);
  });
});
