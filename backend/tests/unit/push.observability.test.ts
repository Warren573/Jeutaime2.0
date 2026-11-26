import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Observabilité du push : chaque issue d'un envoi laisse UNE trace dans les journaux Render, sans jamais exposer
 * de jeton d'appareil, de texte de notification ni d'adresse. Avant : seuls les échecs étaient journalisés ; un envoi
 * réussi, un compte sans appareil, un réglage coupé et un jeton retiré après reçu ne laissaient aucune trace.
 */
const log = vi.hoisted(() => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }));
vi.mock("../../src/config/logger", () => ({ logger: log }));
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
    pushToken: { findMany: vi.fn(), deleteMany: vi.fn(async () => ({ count: 1 })), updateMany: vi.fn(), upsert: vi.fn() },
  },
}));
vi.mock("../../src/config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../src/modules/operations/operations.service", () => ({ recordSystemIncident: vi.fn(async () => undefined) }));
vi.mock("../../src/modules/auth/accountLifecycle.service", () => ({ isAccountDeactivated: vi.fn(async () => false) }));

import { resetPushIdempotency, sendPushToUser } from "../../src/modules/notifications/push.service";
import { processPendingReceipts, resetPendingReceipts, RECEIPT_MIN_AGE_MS } from "../../src/modules/notifications/pushReceipts";

const TOKEN = "ExponentPushToken[SECRET-DEVICE-TOKEN-123]";
const settings = (over: Record<string, boolean> = {}) => ({ isBanned: false, settings: { notifPush: true, soundEnabled: true, notifMeetings: true, notifLetters: true, notifSalons: true, notifActivities: true, notifNews: true, ...over } });
const payload = { title: "JeuTaime", body: "Tu as été adopté ! Ton aventure de sept jours commence.", data: { type: "REFUGE_ADOPTED", refugeSessionId: "r1" } };
const infoLines = () => log.info.mock.calls.map((c) => ({ obj: c[0] as Record<string, unknown>, msg: c[1] as string }));
const everything = () => JSON.stringify([...log.info.mock.calls, ...log.warn.mock.calls, ...log.error.mock.calls]);
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

beforeEach(() => {
  vi.clearAllMocks();
  resetPushIdempotency();
  resetPendingReceipts();
  prismaMock.user.findUnique.mockResolvedValue(settings());
  prismaMock.pushToken.findMany.mockResolvedValue([{ id: "row1", token: TOKEN }]);
  vi.stubGlobal("fetch", vi.fn(async () => json({ data: [{ status: "ok", id: "ticket-1" }] })));
});

describe("trace de chaque issue d'un envoi", () => {
  it("envoi réussi : appareils, tickets et identifiants de tickets, sans jeton ni texte", async () => {
    await sendPushToUser({ userId: "u1", ...payload });
    const sent = infoLines().find((l) => l.msg === "[push] envoi Expo");
    expect(sent?.obj).toMatchObject({ userId: "u1", type: "REFUGE_ADOPTED", devices: 1, tickets: ["ok"], ticketIds: ["ticket-1"] });
    expect(everything()).not.toContain("SECRET-DEVICE-TOKEN");
    expect(everything()).not.toContain("Tu as été adopté");
  });

  it("compte SANS appareil (cas silencieux auparavant) : raison journalisée, aucun appel à Expo", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue([]);
    await sendPushToUser({ userId: "u2", ...payload });
    expect(infoLines().find((l) => l.msg === "[push] non envoyé")?.obj).toMatchObject({ userId: "u2", type: "REFUGE_ADOPTED", registered: 0, reason: "aucun jeton d'appareil valide" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("push coupé dans les réglages, ou catégorie « Activités » coupée : raison journalisée", async () => {
    prismaMock.user.findUnique.mockResolvedValue(settings({ notifPush: false }));
    await sendPushToUser({ userId: "u3", ...payload });
    expect(infoLines().find((l) => l.msg === "[push] non envoyé")?.obj.reason).toBe("notifications push désactivées dans les réglages");
    log.info.mockClear();
    prismaMock.user.findUnique.mockResolvedValue(settings({ notifActivities: false }));
    await sendPushToUser({ userId: "u3", ...payload, idempotencyKey: "autre" });
    expect(infoLines().find((l) => l.msg === "[push] non envoyé")?.obj).toMatchObject({ category: "notifActivities", reason: "catégorie désactivée dans les réglages" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ticket refusé par Expo : le code d'erreur figure dans la trace", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ data: [{ status: "error", message: "x", details: { error: "InvalidCredentials" } }] })));
    await sendPushToUser({ userId: "u4", ...payload });
    expect(infoLines().find((l) => l.msg === "[push] envoi Expo")?.obj.tickets).toEqual(["error:InvalidCredentials"]);
  });
});

describe("trace des reçus de livraison", () => {
  const sendThenReceipts = async (receipt: unknown) => {
    await sendPushToUser({ userId: "u5", ...payload });
    vi.stubGlobal("fetch", vi.fn(async () => json({ data: { "ticket-1": receipt } })));
    return processPendingReceipts(Date.now() + RECEIPT_MIN_AGE_MS + 1000);
  };

  it("reçu « ok » : la remise est tracée avec le type et le ticket", async () => {
    await sendThenReceipts({ status: "ok" });
    expect(infoLines().find((l) => l.msg === "[push] reçu Expo")?.obj).toEqual({ userId: "u5", type: "REFUGE_ADOPTED", ticketId: "ticket-1", receipt: "ok" });
  });

  it("reçu en erreur de configuration (identifiants APNs) : tracé, jeton CONSERVÉ", async () => {
    const result = await sendThenReceipts({ status: "error", message: "m", details: { error: "InvalidCredentials" } });
    expect(infoLines().find((l) => l.msg === "[push] reçu Expo")?.obj.receipt).toBe("error:InvalidCredentials");
    expect(result.tokensRemoved).toBe(0);
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
  });

  it("reçu DeviceNotRegistered : le retrait du jeton n'est plus silencieux", async () => {
    const result = await sendThenReceipts({ status: "error", message: "m", details: { error: "DeviceNotRegistered" } });
    expect(result.tokensRemoved).toBe(1);
    expect(infoLines().find((l) => l.msg === "[push] jeton retiré (appareil non enregistré)")?.obj).toMatchObject({ userId: "u5", type: "REFUGE_ADOPTED", removed: 1, code: "DeviceNotRegistered" });
    expect(everything()).not.toContain("SECRET-DEVICE-TOKEN");
  });
});
