/**
 * SÉCURITÉ — Bouteilles à la mer, PR 2 : routes dangereuses et contrôles d'accès.
 * - POST /:id/accept (accepter sans répondre) et POST /:id/restart (remettre en
 *   mer avec les anciens messages) sont désactivées : 410, aucune écriture.
 * - Blocages (deux sens), mode vacances et suspensions respectés à la
 *   distribution, dans la mer (/inbox), à la première réponse et à l'envoi.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { prisma } from "../../src/config/prisma";
import { claimBottleWithReply, createBottle, ensureReceiptsForFloatingBottles, postMessage } from "../../src/modules/bottles/bottles.service";

vi.mock("../../src/config/prisma", () => {
  const p: any = {
    messageInABottle: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    bottleReceipt: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    anonymousMessage: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    bottleRevealRequest: { deleteMany: vi.fn() },
    block: { findFirst: vi.fn(), findMany: vi.fn() },
    bottleSuspension: { findUnique: vi.fn() },
    userSettings: { findMany: vi.fn(), findUnique: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    profile: { findUnique: vi.fn() },
  };
  p.$transaction = vi.fn((fn: any) => fn(p));
  return { prisma: p };
});
vi.mock("../../src/policies/premium", () => ({ isPremiumActive: vi.fn(() => false) }));
vi.mock("../../src/modules/notifications/push.service", () => ({ sendPushToUser: vi.fn() }));
vi.mock("../../src/core/middleware/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.user = { userId: req.headers["x-user"] }; next(); },
}));

const SENDER = "user-sender-111";
const READER = "user-reader-222";
const now = Date.now();
const floating = {
  id: "bottle-1", senderId: SENDER, message: "Bonjour", senderCity: "Paris", targetGender: "FEMME", ageMin: 25, ageMax: 35,
  status: "FLOATING", acceptedById: null, acceptedAt: null, createdAt: new Date(now), expiresAt: new Date(now + 86400000),
  revealedAt: null, matchId: null, lastReadBySenderId: null, lastReadByAcceptorId: null,
};

async function app() {
  const { default: router } = await import("../../src/modules/bottles/bottles.routes");
  const a = express(); a.use(express.json()); a.use("/api/bottles", router); return a;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.block.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.block.findMany).mockResolvedValue([] as any);
  vi.mocked(prisma.bottleSuspension.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.userSettings.findMany).mockResolvedValue([] as any);
  vi.mocked(prisma.userSettings.findUnique).mockResolvedValue(null);
});

describe("Routes désactivées", () => {
  it("POST /:id/accept → 410, aucune écriture (on accepte une bouteille en y répondant)", async () => {
    const res = await request(await app()).post("/api/bottles/bottle-1/accept").set("x-user", READER).send({});
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe("BOTTLE_ACCEPT_DISABLED");
    expect(prisma.messageInABottle.updateMany).not.toHaveBeenCalled();
    expect(prisma.bottleReceipt.update).not.toHaveBeenCalled();
  });
  it("POST /:id/restart → 410, aucune écriture (les anciens messages ne sont jamais remis en mer)", async () => {
    const res = await request(await app()).post("/api/bottles/bottle-1/restart").set("x-user", SENDER).send({});
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe("BOTTLE_RESTART_DISABLED");
    expect(prisma.messageInABottle.update).not.toHaveBeenCalled();
    expect(prisma.bottleRevealRequest.deleteMany).not.toHaveBeenCalled();
  });
  it("la première réponse écrite (claim-reply) reste disponible", async () => {
    const res = await request(await app()).post("/api/bottles/bottle-1/claim-reply").set("x-user", READER).send({});
    expect(res.status).not.toBe(410);
  });
});

describe("Blocages", () => {
  it("/inbox : la bouteille d'une personne bloquée n'est pas proposée, même distribuée avant le blocage", async () => {
    vi.mocked(prisma.messageInABottle.findMany).mockResolvedValueOnce([] as any).mockResolvedValueOnce([] as any).mockResolvedValueOnce([] as any);
    vi.mocked(prisma.bottleReceipt.findMany).mockResolvedValue([{ bottle: floating }, { bottle: { ...floating, id: "bottle-2", senderId: "user-other-999" } }] as any);
    vi.mocked(prisma.block.findMany).mockResolvedValue([{ fromId: SENDER, toId: READER }] as any);
    const res = await request(await app()).get("/api/bottles/inbox").set("x-user", READER);
    expect(res.status).toBe(200);
    expect(res.body.data.bottles.map((b: any) => b.id)).toEqual(["bottle-2"]);
  });
  it("première réponse refusée si un blocage existe : aucune attribution", async () => {
    vi.mocked(prisma.anonymousMessage.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.bottleReceipt.findUnique).mockResolvedValue({ status: "PENDING" } as any);
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(floating as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ premiumTier: "FREE", premiumUntil: null } as any);
    vi.mocked(prisma.block.findFirst).mockResolvedValue({ id: "block-1" } as any);
    await expect(claimBottleWithReply("bottle-1", READER, "Salut", "00000000-0000-4000-8000-000000000001")).rejects.toThrow("n'est plus disponible");
    expect(prisma.messageInABottle.updateMany).not.toHaveBeenCalled();
    expect(prisma.anonymousMessage.create).not.toHaveBeenCalled();
  });
  it("distribution : la requête exclut les blocages (deux sens) et le mode vacances", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({ city: "Paris", gender: "HOMME" } as any);
    vi.mocked(prisma.messageInABottle.count).mockResolvedValue(0);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ premiumTier: "FREE", premiumUntil: null } as any);
    vi.mocked(prisma.messageInABottle.create).mockResolvedValue(floating as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);
    await createBottle(SENDER, "Bonjour", "FEMME", 25, 35);
    const where = vi.mocked(prisma.user.findMany).mock.calls[0]![0]!.where as any;
    expect(where.blocksMade).toEqual({ none: { toId: SENDER } });
    expect(where.blocksAgainst).toEqual({ none: { fromId: SENDER } });
    expect(where.NOT).toEqual(expect.arrayContaining([{ id: SENDER }, { settings: { is: { vacationMode: true } } }]));
  });
});

describe("Mode vacances", () => {
  it("une personne en vacances ne reçoit pas de nouvelle bouteille en ouvrant la mer", async () => {
    vi.mocked(prisma.messageInABottle.findMany).mockResolvedValue([floating] as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: READER, isBanned: false, bottleSuspension: null, settings: { vacationMode: true },
      profile: { gender: "FEMME", interestedIn: [], birthDate: new Date(new Date().getFullYear() - 30, 0, 15) },
    } as any);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({ gender: "HOMME" } as any);
    vi.mocked(prisma.bottleReceipt.findUnique).mockResolvedValue(null);
    await ensureReceiptsForFloatingBottles(READER);
    expect(prisma.bottleReceipt.create).not.toHaveBeenCalled();
  });
  it("hors vacances et sans blocage, la bouteille compatible est bien distribuée (non-régression)", async () => {
    vi.mocked(prisma.messageInABottle.findMany).mockResolvedValue([floating] as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: READER, isBanned: false, bottleSuspension: null, settings: { vacationMode: false },
      profile: { gender: "FEMME", interestedIn: [], birthDate: new Date(new Date().getFullYear() - 30, 0, 15) },
    } as any);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({ gender: "HOMME" } as any);
    vi.mocked(prisma.bottleReceipt.findUnique).mockResolvedValue(null);
    await ensureReceiptsForFloatingBottles(READER);
    expect(prisma.bottleReceipt.create).toHaveBeenCalledWith({ data: { bottleId: "bottle-1", recipientId: READER } });
  });
});

describe("Suspensions", () => {
  const active = { userId: "x", endsAt: new Date(now + 86400000) };
  it("une personne suspendue ne peut pas envoyer de bouteille", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({ city: "Paris" } as any);
    vi.mocked(prisma.bottleSuspension.findUnique).mockResolvedValue(active as any);
    await expect(createBottle(SENDER, "Bonjour", "FEMME", 25, 35)).rejects.toThrow("temporairement indisponibles");
    expect(prisma.messageInABottle.create).not.toHaveBeenCalled();
  });
  it("une personne suspendue ne peut pas répondre à une bouteille", async () => {
    vi.mocked(prisma.anonymousMessage.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.bottleReceipt.findUnique).mockResolvedValue({ status: "PENDING" } as any);
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(floating as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ premiumTier: "FREE", premiumUntil: null } as any);
    vi.mocked(prisma.bottleSuspension.findUnique).mockResolvedValue(active as any);
    await expect(claimBottleWithReply("bottle-1", READER, "Salut", "00000000-0000-4000-8000-000000000002")).rejects.toThrow("temporairement indisponibles");
    expect(prisma.messageInABottle.updateMany).not.toHaveBeenCalled();
  });
  it("une suspension terminée n'empêche plus rien", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({ city: "Paris", gender: "HOMME" } as any);
    vi.mocked(prisma.bottleSuspension.findUnique).mockResolvedValue({ userId: SENDER, endsAt: new Date(now - 1000) } as any);
    vi.mocked(prisma.messageInABottle.count).mockResolvedValue(0);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ premiumTier: "FREE", premiumUntil: null } as any);
    vi.mocked(prisma.messageInABottle.create).mockResolvedValue(floating as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);
    await expect(createBottle(SENDER, "Bonjour", "FEMME", 25, 35)).resolves.toMatchObject({ id: "bottle-1" });
  });
});

describe("Blocage pendant une conversation déjà commencée", () => {
  const conversation = { ...floating, status: "ACCEPTED", acceptedById: READER, acceptedAt: new Date(now) };

  function setupConversation(lastSenderId: string) {
    vi.mocked(prisma.anonymousMessage.findFirst).mockReset();
    vi.mocked(prisma.anonymousMessage.findFirst)
      .mockResolvedValueOnce(null) // pas de rejeu (clé d'idempotence)
      .mockResolvedValueOnce({ senderId: lastSenderId } as any); // dernier message
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(conversation as any);
    vi.mocked(prisma.anonymousMessage.create).mockResolvedValue({ id: "msg-new" } as any);
  }

  it("le répondant a bloqué l'expéditeur : l'expéditeur ne peut plus écrire, rien n'est supprimé", async () => {
    setupConversation(READER);
    vi.mocked(prisma.block.findFirst).mockResolvedValue({ id: "block-1" } as any);
    await expect(postMessage("bottle-1", SENDER, "Encore moi", "00000000-0000-4000-8000-000000000003"))
      .rejects.toMatchObject({ code: "BOTTLE_CONVERSATION_UNAVAILABLE" });
    expect(prisma.anonymousMessage.create).not.toHaveBeenCalled();
    expect(prisma.anonymousMessage.delete).not.toHaveBeenCalled();
    expect(prisma.anonymousMessage.deleteMany).not.toHaveBeenCalled();
    expect(prisma.block.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ fromId: SENDER, toId: READER }, { fromId: READER, toId: SENDER }] },
    }));
  });

  it("dans l'autre sens aussi : le répondant ne peut plus écrire", async () => {
    setupConversation(SENDER);
    vi.mocked(prisma.block.findFirst).mockResolvedValue({ id: "block-2" } as any);
    await expect(postMessage("bottle-1", READER, "Coucou", "00000000-0000-4000-8000-000000000004"))
      .rejects.toMatchObject({ code: "BOTTLE_CONVERSATION_UNAVAILABLE" });
    expect(prisma.anonymousMessage.create).not.toHaveBeenCalled();
  });

  it("HTTP : réponse 409 générique, sans identifiant de l'autre participant", async () => {
    setupConversation(READER);
    vi.mocked(prisma.block.findFirst).mockResolvedValue({ id: "block-1" } as any);
    const res = await request(await app()).post("/api/bottles/bottle-1/messages").set("x-user", SENDER)
      .send({ content: "Encore moi", idempotencyKey: "00000000-0000-4000-8000-000000000005" });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ message: "Cette correspondance n'est plus disponible.", code: "BOTTLE_CONVERSATION_UNAVAILABLE" });
    expect(JSON.stringify(res.body)).not.toContain(READER);
  });

  it("sans blocage, la conversation continue normalement (non-régression)", async () => {
    setupConversation(READER);
    await expect(postMessage("bottle-1", SENDER, "Je réponds", "00000000-0000-4000-8000-000000000006"))
      .resolves.toMatchObject({ idempotentReplay: false });
    expect(prisma.anonymousMessage.create).toHaveBeenCalled();
  });
});

describe("Mode vacances et bouteilles reçues avant les vacances", () => {
  it("impossible de commencer une correspondance depuis une bouteille reçue avant : aucune attribution", async () => {
    vi.mocked(prisma.anonymousMessage.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.bottleReceipt.findUnique).mockResolvedValue({ status: "PENDING" } as any);
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(floating as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ premiumTier: "FREE", premiumUntil: null } as any);
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ vacationMode: true } as any);
    await expect(claimBottleWithReply("bottle-1", READER, "Salut", "00000000-0000-4000-8000-000000000007")).rejects.toThrow("mode vacances");
    expect(prisma.messageInABottle.updateMany).not.toHaveBeenCalled();
    expect(prisma.bottleReceipt.update).not.toHaveBeenCalled();
    expect(prisma.bottleReceipt.updateMany).not.toHaveBeenCalled();
  });

  it("/inbox en vacances : bouteilles reçues masquées (reçus intacts), conversations en cours toujours là", async () => {
    const conversation = { ...floating, id: "bottle-conv", status: "ACCEPTED", acceptedById: READER, senderId: "user-other-999" };
    vi.mocked(prisma.messageInABottle.findMany)
      .mockResolvedValueOnce([] as any) // distribution paresseuse
      .mockResolvedValueOnce([conversation] as any) // conversations
      .mockResolvedValueOnce([] as any); // mes bouteilles en mer
    vi.mocked(prisma.bottleReceipt.findMany).mockResolvedValue([{ bottle: floating }] as any);
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ vacationMode: true } as any);
    const res = await request(await app()).get("/api/bottles/inbox").set("x-user", READER);
    expect(res.status).toBe(200);
    expect(res.body.data.bottles.map((b: any) => b.id)).toEqual(["bottle-conv"]);
    expect(prisma.bottleReceipt.update).not.toHaveBeenCalled();
    expect(prisma.bottleReceipt.updateMany).not.toHaveBeenCalled();
  });

  it("une conversation déjà commencée continue pendant les vacances (préservée)", async () => {
    const conversation = { ...floating, status: "ACCEPTED", acceptedById: READER, acceptedAt: new Date(now) };
    vi.mocked(prisma.anonymousMessage.findFirst).mockReset();
    vi.mocked(prisma.anonymousMessage.findFirst).mockResolvedValueOnce(null).mockResolvedValueOnce({ senderId: SENDER } as any);
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(conversation as any);
    vi.mocked(prisma.anonymousMessage.create).mockResolvedValue({ id: "msg-new" } as any);
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ vacationMode: true } as any);
    await expect(postMessage("bottle-1", READER, "Je réponds", "00000000-0000-4000-8000-000000000008"))
      .resolves.toMatchObject({ idempotentReplay: false });
  });
});

describe("Mode vacances : envoi d'une nouvelle bouteille", () => {
  it("en vacances, impossible d'envoyer une bouteille : rien n'est créé ni distribué", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({ city: "Paris", gender: "HOMME" } as any);
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ vacationMode: true } as any);
    await expect(createBottle(SENDER, "Bonjour", "FEMME", 25, 35)).rejects.toThrow("mode vacances");
    expect(prisma.messageInABottle.create).not.toHaveBeenCalled();
    expect(prisma.bottleReceipt.createMany).not.toHaveBeenCalled();
  });

  it("hors vacances, l'envoi fonctionne (non-régression)", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({ city: "Paris", gender: "HOMME" } as any);
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ vacationMode: false } as any);
    vi.mocked(prisma.messageInABottle.count).mockResolvedValue(0);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ premiumTier: "FREE", premiumUntil: null } as any);
    vi.mocked(prisma.messageInABottle.create).mockResolvedValue(floating as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);
    await expect(createBottle(SENDER, "Bonjour", "FEMME", 25, 35)).resolves.toMatchObject({ id: "bottle-1" });
  });
});
