/**
 * SÉCURITÉ — Anonymat des Bouteilles à la mer (cahier des charges §5 et §13).
 *
 * Un participant ne doit JAMAIS recevoir l'identifiant interne de l'autre
 * participant avant le dévoilement mutuel, ni par l'écran de la mer
 * (GET /inbox), ni par le détail (GET /:id), ni par l'état du dévoilement
 * (GET /:id/reveal/status), ni par la demande de dévoilement
 * (POST /:id/reveal/request). Après dévoilement mutuel, les identifiants
 * restent disponibles pour le menu « profil dévoilé ».
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { prisma } from "../../src/config/prisma";
import { maskBottleParticipantsForViewer } from "../../src/modules/bottles/bottles.privacy";

vi.mock("../../src/config/prisma", () => ({
  prisma: {
    messageInABottle: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    bottleReceipt: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    bottleRevealRequest: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    userSettings: { findMany: vi.fn(), findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    profile: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("../../src/policies/premium", () => ({ isPremiumActive: vi.fn(() => false) }));
vi.mock("../../src/modules/notifications/push.service", () => ({ sendPushToUser: vi.fn() }));
// Authentification simulée : l'utilisateur est donné par l'en-tête x-user.
vi.mock("../../src/core/middleware/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.user = { userId: req.headers["x-user"] }; next(); },
}));

const SENDER = "user-sender-111";
const ACCEPTOR = "user-acceptor-222";
const STRANGER = "user-stranger-333";
const now = new Date("2026-11-06T10:00:00Z");
const later = new Date("2026-12-06T10:00:00Z");

function bottle(overrides: Record<string, unknown> = {}) {
  return {
    id: "bottle-1", senderId: SENDER, message: "Bonjour", senderCity: "Paris", targetGender: "FEMME",
    ageMin: 25, ageMax: 35, status: "ACCEPTED", acceptedById: ACCEPTOR, acceptedAt: now, createdAt: now,
    expiresAt: later, lastReadBySenderId: null, lastReadByAcceptorId: null, revealedAt: null, matchId: null,
    ...overrides,
  };
}

async function app() {
  const { default: router } = await import("../../src/modules/bottles/bottles.routes");
  const a = express();
  a.use(express.json());
  a.use("/api/bottles", router);
  return a;
}

/** Vérifie récursivement qu'un identifiant n'apparaît nulle part dans la réponse. */
function expectIdAbsent(body: unknown, id: string) {
  expect(JSON.stringify(body)).not.toContain(id);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.userSettings.findMany).mockResolvedValue([] as any);
  vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ locationShared: false } as any);
});

describe("maskBottleParticipantsForViewer", () => {
  it("répondant, conversation anonyme : l'expéditeur est masqué, son propre id conservé", () => {
    const out = maskBottleParticipantsForViewer(bottle(), ACCEPTOR);
    expect(out.senderId).toBeNull();
    expect(out.acceptedById).toBe(ACCEPTOR);
  });
  it("expéditeur, conversation anonyme : le répondant est masqué", () => {
    const out = maskBottleParticipantsForViewer(bottle(), SENDER);
    expect(out.senderId).toBe(SENDER);
    expect(out.acceptedById).toBeNull();
  });
  it("bouteille en mer vue par un tiers : l'expéditeur est masqué", () => {
    const out = maskBottleParticipantsForViewer(bottle({ status: "FLOATING", acceptedById: null }), STRANGER);
    expect(out.senderId).toBeNull();
    expect(out.acceptedById).toBeNull();
  });
  it("dévoilement mutuel (REVEALED) : identifiants conservés pour les participants", () => {
    const b = bottle({ status: "REVEALED", revealedAt: now });
    expect(maskBottleParticipantsForViewer(b, ACCEPTOR)).toEqual(b);
  });
  it("dévoilée puis rompue : reste dévoilée ; rompue sans dévoilement : reste masquée", () => {
    expect(maskBottleParticipantsForViewer(bottle({ status: "BROKEN", revealedAt: now }), ACCEPTOR).senderId).toBe(SENDER);
    expect(maskBottleParticipantsForViewer(bottle({ status: "BROKEN" }), ACCEPTOR).senderId).toBeNull();
  });
  it("un tiers ne reçoit jamais les identifiants, même d'une bouteille dévoilée", () => {
    const out = maskBottleParticipantsForViewer(bottle({ status: "REVEALED", revealedAt: now }), STRANGER);
    expect(out.senderId).toBeNull();
    expect(out.acceptedById).toBeNull();
  });
});

describe("GET /api/bottles/inbox", () => {
  it("bouteille en mer d'un autre + conversation anonyme : aucun identifiant de l'autre participant", async () => {
    const floating = bottle({ id: "bottle-floating", status: "FLOATING", acceptedById: null, acceptedAt: null });
    vi.mocked(prisma.messageInABottle.findMany)
      .mockResolvedValueOnce([] as any) // ensureReceiptsForFloatingBottles
      .mockResolvedValueOnce([bottle()] as any) // conversations
      .mockResolvedValueOnce([] as any); // mes bouteilles en mer
    vi.mocked(prisma.bottleReceipt.findMany).mockResolvedValue([{ bottle: floating }] as any);

    const res = await request(await app()).get("/api/bottles/inbox").set("x-user", ACCEPTOR);
    expect(res.status).toBe(200);
    expectIdAbsent(res.body, SENDER);
    const ids = res.body.data.bottles.map((b: any) => b.id);
    expect(ids).toEqual(["bottle-floating", "bottle-1"]);
    // Non-régression de l'app : la bouteille en mer reste « disponible » (pas à moi, pas acceptée).
    expect(res.body.data.bottles[0]).toMatchObject({ status: "FLOATING", acceptedById: null, senderId: null });
  });

  it("expéditeur : il reconnaît encore sa propre bouteille en mer (senderId = lui-même)", async () => {
    const mine = bottle({ id: "bottle-mine", status: "FLOATING", acceptedById: null, acceptedAt: null });
    vi.mocked(prisma.messageInABottle.findMany)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([bottle()] as any)
      .mockResolvedValueOnce([mine] as any);
    vi.mocked(prisma.bottleReceipt.findMany).mockResolvedValue([] as any);

    const res = await request(await app()).get("/api/bottles/inbox").set("x-user", SENDER);
    expect(res.status).toBe(200);
    expectIdAbsent(res.body, ACCEPTOR);
    expect(res.body.data.bottles.find((b: any) => b.id === "bottle-mine").senderId).toBe(SENDER);
  });
});

describe("GET /api/bottles/:id", () => {
  it("conversation anonyme : ni l'expéditeur ni le répondant ne reçoivent l'id de l'autre", async () => {
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(bottle() as any);
    const a = await app();
    const asAcceptor = await request(a).get("/api/bottles/bottle-1").set("x-user", ACCEPTOR);
    expect(asAcceptor.status).toBe(200);
    expectIdAbsent(asAcceptor.body, SENDER);
    const asSender = await request(a).get("/api/bottles/bottle-1").set("x-user", SENDER);
    expect(asSender.status).toBe(200);
    expectIdAbsent(asSender.body, ACCEPTOR);
  });

  it("après dévoilement mutuel : les identifiants sont disponibles (menu « profil dévoilé »)", async () => {
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(
      bottle({ status: "REVEALED", revealedAt: now, matchId: "match-1" }) as any,
    );
    const res = await request(await app()).get("/api/bottles/bottle-1").set("x-user", ACCEPTOR);
    expect(res.body.data).toMatchObject({ senderId: SENDER, acceptedById: ACCEPTOR, matchId: "match-1" });
  });

  it("un tiers reçoit 404", async () => {
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(bottle() as any);
    const res = await request(await app()).get("/api/bottles/bottle-1").set("x-user", STRANGER);
    expect(res.status).toBe(404);
    expectIdAbsent(res.body, SENDER);
  });
});

describe("GET /api/bottles/:id/reveal/status", () => {
  const pending = { id: "rr-1", bottleId: "bottle-1", requestedById: SENDER, respondentId: ACCEPTOR, status: "PENDING" };

  it("l'autre participant voit qu'une demande existe, sans l'identifiant du demandeur", async () => {
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(bottle() as any);
    vi.mocked(prisma.bottleRevealRequest.findFirst).mockResolvedValue(pending as any);
    const res = await request(await app()).get("/api/bottles/bottle-1/reveal/status").set("x-user", ACCEPTOR);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ hasPendingRequest: true, isRequester: false });
    expectIdAbsent(res.body, SENDER);
  });

  it("le demandeur voit sa propre demande (non-régression)", async () => {
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(bottle() as any);
    vi.mocked(prisma.bottleRevealRequest.findFirst).mockResolvedValue(pending as any);
    const res = await request(await app()).get("/api/bottles/bottle-1/reveal/status").set("x-user", SENDER);
    expect(res.body.data).toEqual({ hasPendingRequest: true, isRequester: true, requestedById: SENDER });
    expectIdAbsent(res.body, ACCEPTOR);
  });

  it("un tiers ne peut pas interroger l'état d'une bouteille : 404, aucun identifiant", async () => {
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(bottle() as any);
    vi.mocked(prisma.bottleRevealRequest.findFirst).mockResolvedValue(pending as any);
    const res = await request(await app()).get("/api/bottles/bottle-1/reveal/status").set("x-user", STRANGER);
    expect(res.status).toBe(404);
    expectIdAbsent(res.body, SENDER);
    expectIdAbsent(res.body, ACCEPTOR);
  });
});

describe("POST /api/bottles/:id/reveal/request", () => {
  it("la réponse ne contient pas l'identifiant de l'autre participant ; la demande est bien créée", async () => {
    vi.mocked(prisma.messageInABottle.findUnique).mockResolvedValue(bottle() as any);
    vi.mocked(prisma.bottleRevealRequest.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.bottleRevealRequest.create).mockResolvedValue({
      id: "rr-1", bottleId: "bottle-1", requestedById: ACCEPTOR, respondentId: SENDER,
      status: "PENDING", createdAt: now, respondedAt: null,
    } as any);
    const res = await request(await app()).post("/api/bottles/bottle-1/reveal/request").set("x-user", ACCEPTOR).send({});
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: "rr-1", requestedById: ACCEPTOR, status: "PENDING" });
    expectIdAbsent(res.body, SENDER);
    // Côté serveur, la demande vise toujours le bon participant (fonctionnement interne préservé).
    expect(prisma.bottleRevealRequest.create).toHaveBeenCalledWith({
      data: { bottleId: "bottle-1", requestedById: ACCEPTOR, respondentId: SENDER },
    });
  });
});
