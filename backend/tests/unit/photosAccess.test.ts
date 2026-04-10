/**
 * Tests unitaires de la logique d'accès photos.
 * Pures fonctions → aucun mock Prisma nécessaire.
 */
import { describe, it, expect } from "vitest";
import {
  resolvePhotoAccess,
  pickNextPrimary,
  type PhotoAccessContext,
} from "../../src/modules/photos/photos.access";

// ============================================================
// resolvePhotoAccess
// ============================================================

describe("resolvePhotoAccess", () => {
  const viewerId = "user-viewer";
  const ownerId = "user-owner";

  const baseCtx: PhotoAccessContext = {
    viewerId,
    ownerId,
    variant: "original",
    viewerIsPremium: false,
    hasBlock: false,
    match: null,
  };

  // --- Owner --------------------------------------------------

  it("owner peut voir son original", () => {
    const res = resolvePhotoAccess({ ...baseCtx, viewerId: ownerId });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("OWNER");
  });

  it("owner peut voir son blurred", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      viewerId: ownerId,
      variant: "blurred",
    });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("OWNER");
  });

  it("owner passe même avec un Block côté DB (l'owner n'est jamais bloqué pour lui-même)", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      viewerId: ownerId,
      hasBlock: true, // hypothétique — l'ownership court-circuite
    });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("OWNER");
  });

  // --- Autre user : blurred ----------------------------------

  it("autre user voit blurred même sans match", () => {
    const res = resolvePhotoAccess({ ...baseCtx, variant: "blurred" });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("NO_BLOCK_BLURRED");
  });

  // --- Autre user : original sans match -----------------------

  it("autre user ne peut PAS voir original sans match", () => {
    const res = resolvePhotoAccess(baseCtx);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("NO_MATCH_FOR_ORIGINAL");
  });

  // --- Autre user : original avec match Free -----------------

  it("Free : non déverrouillé avec < 10 lettres chacun", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      match: { userAId: viewerId, letterCountA: 9, letterCountB: 10 },
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("NOT_UNLOCKED");
  });

  it("Free : déverrouillé avec 10 lettres chacun", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      match: { userAId: viewerId, letterCountA: 10, letterCountB: 10 },
    });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("UNLOCKED");
  });

  // --- Autre user : original avec match Premium --------------

  it("Premium : déverrouillé à 3 lettres chacun", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      viewerIsPremium: true,
      match: { userAId: viewerId, letterCountA: 3, letterCountB: 3 },
    });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("UNLOCKED");
  });

  it("Premium : non déverrouillé à 2 lettres", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      viewerIsPremium: true,
      match: { userAId: viewerId, letterCountA: 2, letterCountB: 3 },
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("NOT_UNLOCKED");
  });

  // --- Compte des côtés : viewer = userA vs userB -------------

  it("compte correctement le côté viewer quand viewer = userA", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      match: { userAId: viewerId, letterCountA: 10, letterCountB: 10 },
    });
    expect(res.allowed).toBe(true);
  });

  it("compte correctement le côté viewer quand viewer = userB", () => {
    // Ici l'owner est userA
    const res = resolvePhotoAccess({
      ...baseCtx,
      match: { userAId: ownerId, letterCountA: 10, letterCountB: 10 },
    });
    expect(res.allowed).toBe(true);
  });

  // --- Block bidirectionnel ----------------------------------

  it("block refuse le blurred", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      variant: "blurred",
      hasBlock: true,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("BLOCKED");
  });

  it("block refuse l'original même si les lettres sont suffisantes", () => {
    const res = resolvePhotoAccess({
      ...baseCtx,
      hasBlock: true,
      match: { userAId: viewerId, letterCountA: 10, letterCountB: 10 },
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("BLOCKED");
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
