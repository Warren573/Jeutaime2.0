import { beforeEach, describe, expect, it, vi } from "vitest";

const log = vi.hoisted(() => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }));
vi.mock("../../src/config/logger", () => ({ logger: log }));
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { userSettings: { findUnique: vi.fn() }, pushToken: { findMany: vi.fn() } },
}));
vi.mock("../../src/config/prisma", () => ({ prisma: prismaMock }));
const expo = vi.hoisted(() => ({ postPushBatch: vi.fn(), fetchReceipts: vi.fn() }));
vi.mock("../../src/modules/notifications/expoPush", async (orig) => ({ ...(await orig<typeof import("../../src/modules/notifications/expoPush")>()), postPushBatch: expo.postPushBatch, fetchReceipts: expo.fetchReceipts }));

import {
  MAX_TEST_DELAY_S, TEST_COOLDOWN_MS, TEST_PUSH_BODY, describeToken, getPushStatus, getPushTest, resetPushTests, runPushTest, scheduleTestPush,
} from "../../src/modules/notifications/pushDiagnostics.service";

const TOKEN = "ExponentPushToken[SECRET-TOKEN-abcdef]";
const settings = (over: Record<string, boolean> = {}) => ({ notifPush: true, notifActivities: true, notifMeetings: true, notifLetters: true, ...over });
beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  resetPushTests();
  prismaMock.userSettings.findUnique.mockResolvedValue(settings());
  prismaMock.pushToken.findMany.mockResolvedValue([{ token: TOKEN, platform: "ios", updatedAt: new Date("2026-11-26T12:23:23Z") }]);
  expo.postPushBatch.mockResolvedValue({ kind: "ok", tickets: [{ status: "ok", id: "tk-1" }] });
  expo.fetchReceipts.mockResolvedValue({ kind: "ok", receipts: { "tk-1": { status: "ok" } } });
});

describe("état des appareils : jetons masqués", () => {
  it("type + 6 derniers caractères seulement, jamais le jeton entier", async () => {
    const status = await getPushStatus("u1");
    expect(status.devices).toEqual([{ platform: "ios", kind: "ExponentPushToken", suffix: "abcdef", valid: true, updatedAt: "2026-11-26T12:23:23.000Z" }]);
    expect(JSON.stringify(status)).not.toContain("SECRET-TOKEN");
  });
  it("jeton au format inattendu signalé comme invalide ; sans réglages : push autorisé (comportement historique)", async () => {
    prismaMock.userSettings.findUnique.mockResolvedValue(null);
    prismaMock.pushToken.findMany.mockResolvedValue([{ token: "ancien-format-123456", platform: "ios", updatedAt: new Date() }]);
    const status = await getPushStatus("u1");
    expect(status.devices[0]).toMatchObject({ kind: "inconnu", valid: false });
    expect(status.settings).toEqual({ notifPush: true, notifActivities: true, notifMeetings: true, notifLetters: true });
    expect(describeToken("ExpoPushToken[abcdefghij]")).toMatchObject({ kind: "ExpoPushToken", valid: true });
  });
});

describe("test d'envoi", () => {
  it("compte sans appareil : aucun appel à Expo, raison claire", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue([]);
    const r = await runPushTest("u1");
    expect(r).toMatchObject({ devices: 0, tickets: [], skipped: "aucun appareil enregistré pour ce compte" });
    expect(expo.postPushBatch).not.toHaveBeenCalled();
  });
  it("push coupé dans les réglages : aucun envoi, raison claire", async () => {
    prismaMock.userSettings.findUnique.mockResolvedValue(settings({ notifPush: false }));
    const r = await runPushTest("u1");
    expect(r.skipped).toMatch(/désactivées dans les réglages/);
    expect(expo.postPushBatch).not.toHaveBeenCalled();
  });
  it("envoi réussi : message visible (titre, corps, son), type PUSH_TEST, ticket mémorisé ; jeton jamais journalisé ni renvoyé", async () => {
    const r = await runPushTest("u1");
    const sent = expo.postPushBatch.mock.calls[0]![0];
    expect(sent).toEqual([expect.objectContaining({ to: TOKEN, title: "JeuTaime", body: TEST_PUSH_BODY, sound: "default", priority: "high", data: { type: "PUSH_TEST" } })]);
    expect(r).toMatchObject({ devices: 1, skipped: null, tickets: [{ status: "ok", ticketId: "tk-1" }] });
    expect(JSON.stringify([r, ...log.info.mock.calls, ...log.error.mock.calls])).not.toContain("SECRET-TOKEN");
  });
  it("ticket refusé : le code d'erreur est rapporté (ex. DeviceNotRegistered)", async () => {
    expo.postPushBatch.mockResolvedValue({ kind: "ok", tickets: [{ status: "error", details: { error: "DeviceNotRegistered" } }] });
    expect((await runPushTest("u1")).tickets).toEqual([{ status: "error:DeviceNotRegistered", ticketId: null }]);
  });
  it("Expo injoignable : le résultat le dit, rien ne lève", async () => {
    expo.postPushBatch.mockResolvedValue({ kind: "failed", retryable: true, status: 503, reason: "Expo a répondu 503" });
    expect((await runPushTest("u1")).skipped).toMatch(/envoi à Expo impossible/);
  });
});

describe("programmation, limite et lecture du résultat", () => {
  it("délai borné à 30 s ; un second test dans les 20 s est refusé (429) — jamais d'envoi en rafale", () => {
    vi.useFakeTimers();
    const t0 = 1_000_000;
    expect(scheduleTestPush("u1", 999, t0).scheduledFor).toBe(new Date(t0 + MAX_TEST_DELAY_S * 1000).toISOString());
    expect(() => scheduleTestPush("u1", 5, t0 + TEST_COOLDOWN_MS - 1)).toThrow(/vient d'être demandé/);
    expect(() => scheduleTestPush("u1", 5, t0 + TEST_COOLDOWN_MS)).not.toThrow();
    expect(() => scheduleTestPush("autre-compte", 5, t0 + 1)).not.toThrow(); // limite PAR compte
  });
  it("le test part après le délai, pas avant ; état « pending » puis « sent » avec reçu Expo à la demande", async () => {
    vi.useFakeTimers();
    scheduleTestPush("u1", 10, Date.now());
    expect((await getPushTest("u1")).state).toBe("pending");
    await vi.advanceTimersByTimeAsync(9_000);
    expect(expo.postPushBatch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(expo.postPushBatch).toHaveBeenCalledTimes(1);
    const view = await getPushTest("u1");
    expect(view).toMatchObject({ state: "sent", receipts: ["ok"] });
    expect(expo.fetchReceipts).toHaveBeenCalledWith(["tk-1"]); // lecture chez Expo seulement à la demande
  });
  it("reçu pas encore publié, en erreur ou illisible : dit tel quel", async () => {
    await runPushTest("u1");
    expo.fetchReceipts.mockResolvedValue({ kind: "ok", receipts: {} });
    expect((await getPushTest("u1")).receipts).toEqual(["pas encore disponible"]);
    expo.fetchReceipts.mockResolvedValue({ kind: "ok", receipts: { "tk-1": { status: "error", details: { error: "InvalidCredentials" } } } });
    expect((await getPushTest("u1")).receipts).toEqual(["error:InvalidCredentials"]);
    expo.fetchReceipts.mockResolvedValue({ kind: "failed", reason: "x" });
    expect((await getPushTest("u1")).receipts).toEqual(["lecture impossible"]);
  });
  it("aucun test : état « none »", async () => {
    expect(await getPushTest("jamais")).toEqual({ state: "none", result: null, receipts: [] });
  });
});
