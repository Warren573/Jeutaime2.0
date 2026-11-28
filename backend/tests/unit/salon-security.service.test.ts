import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Sécurité des salons — tests unitaires (Prisma simulé, aucune base). Ils vérifient surtout que :
 *   - chaque action non autorisée est refusée AVANT toute écriture (aucun message créé, aucune transaction
 *     de débit ouverte) ;
 *   - le contrôle d'accès commun (salonAccess) applique les règles « session ouverte », « participant actif »
 *     et « blocage dans les deux sens ».
 * Les parcours complets sur PostgreSQL sont dans tests/integration/salon-security.http.test.ts.
 */
const m = vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    prisma: {
      salon: { findUnique: fn() },
      salonSession: { findFirst: fn(), findMany: fn(), findUnique: fn() },
      salonSessionParticipant: { findFirst: fn() },
      salonMessage: { create: fn(), findMany: fn() },
      profile: { findUnique: fn() },
      block: { findFirst: fn(), findMany: fn() },
      user: { findUnique: fn() },
      offeringCatalog: { findUnique: fn() },
      offeringSent: { findUnique: fn(), findFirst: fn(), findMany: fn(), updateMany: fn(), findUniqueOrThrow: fn() },
      magieCatalog: { findUnique: fn() },
      magieCast: { findUnique: fn() },
      $transaction: fn(),
    },
  };
});
vi.mock("../../src/config/prisma", () => ({ prisma: m.prisma }));
vi.mock("../../src/events", () => ({ emitOfferingSent: vi.fn(), emitMagieCast: vi.fn(), emitMagieBroken: vi.fn() }));

import { ForbiddenError } from "../../src/core/errors";
import {
  areBlocked,
  findBlockedAmong,
  findOpenMembership,
  findSharedOpenSession,
  isSessionOpen,
  requireOpenMembership,
} from "../../src/modules/salon-sessions/salonAccess";
import { listMessages, postMessage } from "../../src/modules/salons/salons.service";
import { castSpell, breakMagie, assertCanViewActiveMagies } from "../../src/modules/magies/magies.service";
import { authorizeOfferingConsumption, sendOffering } from "../../src/modules/offerings/offerings.service";

const SALON = { id: "salon-1", isActive: true, kind: "PISCINE" };

beforeEach(() => {
  vi.clearAllMocks();
  m.prisma.block.findFirst.mockResolvedValue(null);
  m.prisma.block.findMany.mockResolvedValue([]);
});

describe("salonAccess — règles communes", () => {
  it("une session est ouverte si ACTIVE et non échue ; expirée ou EXPIRED : fermée", () => {
    const now = new Date("2026-11-28T12:00:00Z");
    expect(isSessionOpen({ status: "ACTIVE", expiresAt: new Date("2026-11-29T00:00:00Z") }, now)).toBe(true);
    expect(isSessionOpen({ status: "ACTIVE", expiresAt: new Date("2026-11-28T11:59:59Z") }, now)).toBe(false);
    expect(isSessionOpen({ status: "ACTIVE", expiresAt: now }, now)).toBe(false);
    expect(isSessionOpen({ status: "EXPIRED", expiresAt: new Date("2027-01-01T00:00:00Z") }, now)).toBe(false);
  });

  it("l'appartenance exige un participant ACTIF d'une session ACTIVE non échue du bon salon", async () => {
    m.prisma.salonSessionParticipant.findFirst.mockResolvedValue(null);
    expect(await findOpenMembership("u1", "PISCINE" as never)).toBeNull();
    const where = m.prisma.salonSessionParticipant.findFirst.mock.calls[0]![0].where;
    expect(where).toMatchObject({ userId: "u1", status: "ACTIVE", session: { salonKind: "PISCINE", status: "ACTIVE" } });
    expect(where.session.expiresAt.gt).toBeInstanceOf(Date);
    await expect(requireOpenMembership("u1", "PISCINE" as never)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("la session commune exige TOUS les participants actifs, sans doublon d'identifiant", async () => {
    m.prisma.salonSession.findFirst.mockResolvedValue(null);
    expect(await findSharedOpenSession(["a", "b", "a"], "PISCINE" as never)).toBeNull();
    const where = m.prisma.salonSession.findFirst.mock.calls[0]![0].where;
    expect(where.AND).toHaveLength(2);
    expect(where.AND[0]).toEqual({ participants: { some: { userId: "a", status: "ACTIVE" } } });
  });

  it("le blocage est détecté dans les deux sens et jamais pour soi-même", async () => {
    m.prisma.block.findFirst.mockResolvedValue({ id: "b1" });
    expect(await areBlocked("a", "b")).toBe(true);
    expect(m.prisma.block.findFirst.mock.calls[0]![0].where.OR).toEqual([
      { fromId: "a", toId: "b" },
      { fromId: "b", toId: "a" },
    ]);
    m.prisma.block.findFirst.mockClear();
    expect(await areBlocked("a", "a")).toBe(false);
    expect(m.prisma.block.findFirst).not.toHaveBeenCalled();
  });

  it("findBlockedAmong renvoie les autres utilisateurs bloqués, quel que soit le sens", async () => {
    m.prisma.block.findMany.mockResolvedValue([
      { fromId: "me", toId: "x" },
      { fromId: "y", toId: "me" },
    ]);
    expect([...(await findBlockedAmong("me", ["me", "x", "y", "z"]))].sort()).toEqual(["x", "y"]);
    m.prisma.block.findMany.mockClear();
    expect((await findBlockedAmong("me", ["me"])).size).toBe(0);
    expect(m.prisma.block.findMany).not.toHaveBeenCalled();
  });
});

describe("messages de salon", () => {
  it("écriture refusée sans session ouverte : AUCUN message créé", async () => {
    m.prisma.salon.findUnique.mockResolvedValue(SALON);
    m.prisma.salonSessionParticipant.findFirst.mockResolvedValue(null);
    await expect(postMessage("salon-1", "intrus", "salut")).rejects.toBeInstanceOf(ForbiddenError);
    expect(m.prisma.salonMessage.create).not.toHaveBeenCalled();
  });

  it("écriture rattachée à la session résolue du membre (jamais null)", async () => {
    m.prisma.salon.findUnique.mockResolvedValue(SALON);
    m.prisma.salonSessionParticipant.findFirst.mockResolvedValue({ sessionId: "s1", session: { startedAt: new Date() } });
    m.prisma.salonMessage.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "m1", meta: null, createdAt: new Date(), ...data,
    }));
    m.prisma.profile.findUnique.mockResolvedValue({ pseudo: "Alice", gender: "FEMME", birthDate: null });
    const res = await postMessage("salon-1", "u1", "salut");
    expect(m.prisma.salonMessage.create.mock.calls[0]![0].data.sessionId).toBe("s1");
    expect(res.pseudo).toBe("Alice");
  });

  it("lecture refusée à un non-membre, sans aucune requête sur les messages", async () => {
    m.prisma.salon.findUnique.mockResolvedValue(SALON);
    m.prisma.salonSessionParticipant.findFirst.mockResolvedValue(null);
    await expect(listMessages("salon-1", "intrus", 50, "s-autre")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(listMessages("salon-1", "intrus", 50)).rejects.toBeInstanceOf(ForbiddenError);
    expect(m.prisma.salonMessage.findMany).not.toHaveBeenCalled();
  });

  it("lecture limitée à la session du membre (filtre sessionId toujours présent)", async () => {
    m.prisma.salon.findUnique.mockResolvedValue(SALON);
    m.prisma.salonSessionParticipant.findFirst.mockResolvedValue({ sessionId: "s1" });
    m.prisma.salonMessage.findMany.mockResolvedValue([]);
    await listMessages("salon-1", "u1", 50, "s1");
    expect(m.prisma.salonMessage.findMany.mock.calls[0]![0].where).toMatchObject({ salonId: "salon-1", sessionId: "s1", isHidden: false });
  });
});

describe("sorts : refus avant tout débit", () => {
  const spell = { id: "mag_ane", enabled: true, durationSec: 90, cost: 80, type: "TRANSFORMATION" };
  beforeEach(() => {
    m.prisma.magieCatalog.findUnique.mockResolvedValue(spell);
    m.prisma.user.findUnique.mockResolvedValue({ id: "t", isBanned: false });
    m.prisma.salon.findUnique.mockResolvedValue(SALON);
  });

  it("sans salon : refusé, aucune transaction", async () => {
    await expect(castSpell("a", { magieId: "mag_ane", toUserId: "b" })).rejects.toBeInstanceOf(ForbiddenError);
    expect(m.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("sans session commune : refusé, aucune transaction", async () => {
    m.prisma.salonSession.findFirst.mockResolvedValue(null);
    await expect(castSpell("a", { magieId: "mag_ane", toUserId: "b", salonId: "salon-1" })).rejects.toBeInstanceOf(ForbiddenError);
    expect(m.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("utilisateurs bloqués : refusé, aucune transaction", async () => {
    m.prisma.salonSession.findFirst.mockResolvedValue({ id: "s1", startedAt: new Date() });
    m.prisma.block.findFirst.mockResolvedValue({ id: "blk" });
    await expect(castSpell("a", { magieId: "mag_ane", toUserId: "b", salonId: "salon-1" })).rejects.toBeInstanceOf(ForbiddenError);
    expect(m.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("anti-sort par une personne hors de la session : refusé, aucune transaction", async () => {
    m.prisma.magieCast.findUnique.mockResolvedValue({
      id: "c1", brokenAt: null, expiresAt: new Date(Date.now() + 60_000), salonId: "salon-1", toUserId: "b",
      magie: { breakConditionId: "compliment" },
    });
    m.prisma.magieCatalog.findUnique.mockResolvedValue({ id: "mag_compliment", enabled: true, durationSec: 0, cost: 30 });
    m.prisma.salonSession.findFirst.mockResolvedValue(null);
    await expect(breakMagie("tiers", "c1", "mag_compliment")).rejects.toBeInstanceOf(ForbiddenError);
    expect(m.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("sorts actifs d'autrui : visibles seulement avec une session commune", async () => {
    await expect(assertCanViewActiveMagies("a", "a")).resolves.toBeUndefined();
    m.prisma.salonSession.findFirst.mockResolvedValue(null);
    await expect(assertCanViewActiveMagies("a", "b")).rejects.toBeInstanceOf(ForbiddenError);
    m.prisma.salonSession.findFirst.mockResolvedValue({ id: "s1", startedAt: new Date() });
    await expect(assertCanViewActiveMagies("a", "b")).resolves.toBeUndefined();
  });
});

describe("offrandes : refus avant tout débit", () => {
  beforeEach(() => {
    m.prisma.offeringCatalog.findUnique.mockResolvedValue({
      id: "off_cafe", enabled: true, category: "BOISSON", cost: 20, salonOnly: null, durationMs: null,
    });
    m.prisma.user.findUnique.mockResolvedValue({ id: "t", isBanned: false });
    m.prisma.salon.findUnique.mockResolvedValue(SALON);
  });

  it("une offrande de salon sans salon est refusée", async () => {
    await expect(sendOffering("a", { offeringId: "off_cafe", toUserId: "b" })).rejects.toBeInstanceOf(ForbiddenError);
    expect(m.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("utilisateurs bloqués : refusée, aucune transaction", async () => {
    m.prisma.block.findFirst.mockResolvedValue({ id: "blk" });
    await expect(sendOffering("a", { offeringId: "off_cafe", toUserId: "b", salonId: "salon-1", sessionId: "s1" }))
      .rejects.toBeInstanceOf(ForbiddenError);
    expect(m.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("session expirée ou expéditeur absent de la session : refusée, aucune transaction", async () => {
    m.prisma.salonSession.findUnique.mockResolvedValue({
      id: "s1", salonKind: "PISCINE", startedAt: new Date(), status: "ACTIVE",
      expiresAt: new Date(Date.now() - 1000), participants: [{ userId: "a" }, { userId: "b" }],
    });
    await expect(sendOffering("a", { offeringId: "off_cafe", toUserId: "b", salonId: "salon-1", sessionId: "s1" }))
      .rejects.toThrow();
    m.prisma.salonSession.findUnique.mockResolvedValue({
      id: "s1", salonKind: "PISCINE", startedAt: new Date(), status: "ACTIVE",
      expiresAt: new Date(Date.now() + 60_000), participants: [{ userId: "b" }],
    });
    await expect(sendOffering("a", { offeringId: "off_cafe", toUserId: "b", salonId: "salon-1", sessionId: "s1" }))
      .rejects.toBeInstanceOf(ForbiddenError);
    expect(m.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("consommation HTTP : hors salon, seul le destinataire ; en salon, session commune obligatoire", async () => {
    m.prisma.offeringSent.findUnique.mockResolvedValue({ id: "o1", toUserId: "b", fromUserId: "a", salonId: null });
    await expect(authorizeOfferingConsumption("o1", "tiers")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(authorizeOfferingConsumption("o1", "b")).resolves.toBeUndefined();

    m.prisma.offeringSent.findUnique.mockResolvedValue({ id: "o2", toUserId: "b", fromUserId: "a", salonId: "salon-1" });
    m.prisma.salon.findUnique.mockResolvedValue({ kind: "PISCINE" });
    m.prisma.salonSession.findFirst.mockResolvedValue(null);
    await expect(authorizeOfferingConsumption("o2", "c")).rejects.toBeInstanceOf(ForbiddenError);
    m.prisma.salonSession.findFirst.mockResolvedValue({ id: "s1", startedAt: new Date() });
    await expect(authorizeOfferingConsumption("o2", "b")).resolves.toBeUndefined();
    m.prisma.block.findFirst.mockResolvedValue({ id: "blk" });
    await expect(authorizeOfferingConsumption("o2", "b")).rejects.toBeInstanceOf(ForbiddenError);
  });
});
