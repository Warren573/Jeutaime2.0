import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
const { prismaMock, incident, deactivated } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
    pushToken: { findMany: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
  },
  incident: vi.fn(async () => undefined),
  deactivated: vi.fn(async () => false),
}));
vi.mock("../../src/config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../src/modules/operations/operations.service", () => ({ recordSystemIncident: incident }));
vi.mock("../../src/modules/auth/accountLifecycle.service", () => ({ isAccountDeactivated: deactivated }));

import {
  PUSH_IDEMPOTENCY_TTL_MS,
  registerDeviceToken,
  resetPushIdempotency,
  sendDailyEditionPush,
  sendPushToUser,
  unregisterDeviceToken,
} from "../../src/modules/notifications/push.service";
import { pendingReceiptCount, resetPendingReceipts } from "../../src/modules/notifications/pushReceipts";

const tok = (n: number) => `ExponentPushToken[tk${String(n).padStart(10, "0")}]`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const allOn = { notifPush: true, soundEnabled: true, notifMeetings: true, notifLetters: true, notifSalons: true, notifActivities: true, notifNews: true };
const send = (over: Record<string, unknown> = {}) =>
  sendPushToUser({ userId: "u1", title: "JeuTaime", body: "Tu as reçu une nouvelle lettre", data: { type: "LETTER_RECEIVED", matchId: "m1" }, ...over });
let fetchMock: ReturnType<typeof vi.fn>;
const sentMessages = (call = 0) => JSON.parse(fetchMock.mock.calls[call]![1].body as string) as Array<Record<string, unknown>>;

beforeEach(() => {
  vi.clearAllMocks();
  resetPushIdempotency();
  resetPendingReceipts();
  prismaMock.user.findUnique.mockResolvedValue({ isBanned: false, settings: { ...allOn } });
  prismaMock.pushToken.findMany.mockResolvedValue([{ id: "r1", token: tok(1) }]);
  prismaMock.pushToken.deleteMany.mockResolvedValue({ count: 1 });
  prismaMock.pushToken.updateMany.mockResolvedValue({ count: 1 });
  deactivated.mockResolvedValue(false);
  fetchMock = vi.fn(async () => json({ data: [{ status: "ok", id: "tick-1" }] }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("préférences", () => {
  it("réglage général coupé : aucun appel réseau", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isBanned: false, settings: { ...allOn, notifPush: false } });
    await send();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prismaMock.pushToken.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ["LETTER_RECEIVED", "notifLetters"], ["BOTTLE_REPLY", "notifLetters"], ["MATCH_CREATED", "notifMeetings"],
    ["QUESTIONS_PASSED", "notifMeetings"], ["QUESTIONS_FAILED", "notifMeetings"], ["PRIVATE_SALON_INVITE", "notifSalons"],
    ["MAGIE_RECEIVED", "notifSalons"], ["OFFERING_RECEIVED", "notifActivities"],
  ])("catégorie coupée (%s → %s) : aucun envoi ; les autres types passent", async (type, key) => {
    prismaMock.user.findUnique.mockResolvedValue({ isBanned: false, settings: { ...allOn, [key]: false } });
    await send({ data: { type } });
    expect(fetchMock).not.toHaveBeenCalled();
    resetPushIdempotency();
    await send({ data: { type: "SECURITY_ALERT" } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("administration, sécurité, abonnement : non concernés par les catégories", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isBanned: false, settings: { ...allOn, notifMeetings: false, notifLetters: false, notifSalons: false, notifActivities: false, notifNews: false } });
    for (const type of ["ADMIN_MESSAGE", "SECURITY_ALERT", "PREMIUM_SUBSCRIBED"]) {
      resetPushIdempotency();
      await send({ data: { type } });
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("aucune ligne de réglages : comportement historique (envoi autorisé)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isBanned: false, settings: null });
    await send();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("son coupé : sound null ; sinon default ; priorité haute et canal par défaut", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isBanned: false, settings: { ...allOn, soundEnabled: false } });
    await send();
    expect(sentMessages()[0]).toMatchObject({ sound: null, priority: "high", channelId: "default", to: tok(1) });
    resetPushIdempotency(); fetchMock.mockClear();
    prismaMock.user.findUnique.mockResolvedValue({ isBanned: false, settings: { ...allOn } });
    await send();
    expect(sentMessages()[0]).toMatchObject({ sound: "default" });
  });
});

describe("état du compte destinataire", () => {
  it("banni : aucun envoi ET jetons retirés", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isBanned: true, settings: { ...allOn } });
    await send();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prismaMock.pushToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });

  it("supprimé (utilisateur introuvable) : aucun envoi, aucune erreur", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(send()).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prismaMock.pushToken.findMany).not.toHaveBeenCalled();
  });

  it("désactivé : aucun envoi, jetons laissés (déjà retirés à la désactivation)", async () => {
    deactivated.mockResolvedValue(true);
    await send();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
  });

  it("statut de désactivation illisible : par prudence, aucun envoi, jetons conservés", async () => {
    deactivated.mockRejectedValue(new Error("table absente"));
    await send();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
  });

  it("compte actif : envoi normal", async () => {
    await send();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("jetons", () => {
  it("jetons au format inattendu ignorés (jamais envoyés à Expo), les valides partent", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue([
      { id: "a", token: "ancien-format-xyz" }, { id: "b", token: tok(2) }, { id: "c", token: "ExponentPushToken[" },
    ]);
    await send();
    expect(sentMessages().map((m) => m["to"])).toEqual([tok(2)]);
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled(); // jamais supprimés pour leur seul format
  });

  it("aucun jeton valide : aucun appel réseau", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue([{ id: "a", token: "n-importe-quoi" }]);
    await send();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("enregistrement : format invalide refusé sans écriture, valide accepté", async () => {
    await expect(registerDeviceToken({ userId: "u1", token: "pas-un-jeton", platform: "ios" })).rejects.toThrow(/invalide/);
    await expect(registerDeviceToken({ userId: "u1", token: "", platform: "ios" })).rejects.toThrow();
    expect(prismaMock.pushToken.upsert).not.toHaveBeenCalled();
    await registerDeviceToken({ userId: "u1", token: tok(5), platform: "ios" });
    expect(prismaMock.pushToken.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { token: tok(5) } }));
  });

  it("désenregistrement : limité au jeton de l'utilisateur, tolérant sur le format (retirer un ancien jeton)", async () => {
    await unregisterDeviceToken({ userId: "u1", token: "ancien-format" });
    expect(prismaMock.pushToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1", token: "ancien-format" } });
  });
});

describe("lots d'envoi", () => {
  it("250 appareils : 3 requêtes de 100, 100 et 50 messages, tous identiques sauf `to`", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue(Array.from({ length: 250 }, (_, i) => ({ id: `r${i}`, token: tok(i) })));
    fetchMock.mockImplementation(async (_u: string, init: { body: string }) => json({ data: JSON.parse(init.body).map((_m: unknown, i: number) => ({ status: "ok", id: `t${Math.random()}-${i}` })) }));
    await send();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect([0, 1, 2].map((i) => sentMessages(i).length)).toEqual([100, 100, 50]);
    expect(new Set(sentMessages(0).map((m) => m["to"])).size).toBe(100);
  });

  it("l'échec d'un lot n'empêche pas les suivants et ne supprime aucun jeton", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue(Array.from({ length: 150 }, (_, i) => ({ id: `r${i}`, token: tok(i) })));
    fetchMock
      .mockResolvedValueOnce(json({ errors: [] }, 400))
      .mockResolvedValueOnce(json({ data: Array.from({ length: 50 }, (_, i) => ({ status: "ok", id: `ok${i}` })) }));
    await send();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
    expect(incident).toHaveBeenCalled();
  });
});

describe("tickets, erreurs et doublons", () => {
  it("DeviceNotRegistered : seul ce jeton est supprimé, pour cet utilisateur", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue([{ id: "a", token: tok(1) }, { id: "b", token: tok(2) }]);
    fetchMock.mockResolvedValue(json({ data: [{ status: "error", details: { error: "DeviceNotRegistered" } }, { status: "ok", id: "ok-b" }] }));
    await send();
    expect(prismaMock.pushToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1", token: { in: [tok(1)] } } });
    expect(pendingReceiptCount()).toBe(1); // le ticket accepté est suivi jusqu'à son reçu
  });

  it.each(["MessageRateExceeded", "MessageTooBig", "InvalidCredentials", "MismatchSenderId", "Inconnue"])(
    "erreur de ticket %s : le jeton est CONSERVÉ",
    async (code) => {
      fetchMock.mockResolvedValue(json({ data: [{ status: "error", message: "x", details: { error: code } }] }));
      await send();
      expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
    },
  );

  it("erreur de ticket sans détail : jeton conservé", async () => {
    fetchMock.mockResolvedValue(json({ data: [{ status: "error" }] }));
    await send();
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
  });

  it("coupure réseau : aucune exception, aucune suppression, une seule tentative (pas de doublon)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(send()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
    expect(incident).toHaveBeenCalledWith(expect.objectContaining({ source: "push", code: "PUSH_SEND_FAILED" }));
  });

  it("HTTP 500 persistant : 3 tentatives, aucun jeton supprimé", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    fetchMock.mockImplementation(async () => json({}, 500));
    const p = send();
    await vi.runAllTimersAsync();
    await p;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
  });

  it("429 puis succès : un seul message remis (le rejeu n'a lieu que si le premier a été refusé)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    fetchMock.mockResolvedValueOnce(json({}, 429)).mockResolvedValueOnce(json({ data: [{ status: "ok", id: "z" }] }));
    const p = send();
    await vi.advanceTimersByTimeAsync(1000); // l'attente du rejeu (500 ms), pas le minuteur des reçus
    await p;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(pendingReceiptCount()).toBe(1);
  });

  it("une erreur inattendue (base indisponible) ne se propage jamais à l'appelant", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("db down"));
    await expect(send()).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("événements distincts et idempotence", () => {
  it("deux lettres distinctes, texte identique, même seconde : DEUX envois (aucun filtrage par contenu)", async () => {
    await send({ idempotencyKey: "letter:m1:uA:1:0:lettre" });
    await send({ idempotencyKey: "letter:m1:uA:2:0:lettre" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sans clé : jamais de filtrage, même charge identique répétée", async () => {
    await send();
    await send();
    await send();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("même événement rejoué (même clé, même utilisateur) : un seul envoi", async () => {
    await send({ idempotencyKey: "letter:m1:uA:1:0:lettre" });
    await send({ idempotencyKey: "letter:m1:uA:1:0:lettre" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("même événement rejoué en parallèle (double exécution) : un seul envoi", async () => {
    await Promise.all([send({ idempotencyKey: "offering:o1" }), send({ idempotencyKey: "offering:o1" }), send({ idempotencyKey: "offering:o1" })]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("même clé pour deux destinataires (ex. match créé) : un envoi chacun", async () => {
    await send({ userId: "uA", idempotencyKey: "match:m1" });
    await send({ userId: "uB", idempotencyKey: "match:m1" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("la réservation expire : au-delà du délai, le même identifiant peut être traité à nouveau", async () => {
    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(5_000_000);
    await send({ idempotencyKey: "k" });
    await send({ idempotencyKey: "k" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    now.mockReturnValue(5_000_000 + PUSH_IDEMPOTENCY_TTL_MS + 1);
    await send({ idempotencyKey: "k" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("échec CERTAIN (HTTP 400, rien traité) : la réservation est rendue, une relance légitime aboutit", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 400));
    await send({ idempotencyKey: "k" });
    await send({ idempotencyKey: "k" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("échec INCERTAIN (coupure en cours de requête) : réservation conservée, pas de second envoi", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await send({ idempotencyKey: "k" });
    await send({ idempotencyKey: "k" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("erreur interne (base indisponible) ou statut illisible : réservation rendue", async () => {
    prismaMock.user.findUnique.mockRejectedValueOnce(new Error("db down"));
    await send({ idempotencyKey: "k1" });
    await send({ idempotencyKey: "k1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    deactivated.mockRejectedValueOnce(new Error("table absente"));
    await send({ idempotencyKey: "k2" });
    await send({ idempotencyKey: "k2" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("événement écarté volontairement (préférence coupée) : réservation conservée", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ isBanned: false, settings: { ...allOn, notifLetters: false } });
    await send({ idempotencyKey: "k" });
    await send({ idempotencyKey: "k" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("la clé n'est jamais transmise à Expo", async () => {
    await send({ idempotencyKey: "letter:secret-ident" });
    expect(JSON.stringify(sentMessages())).not.toMatch(/secret-ident|idempotency/i);
  });
});

describe("confidentialité de la requête envoyée à Expo", () => {
  it("le contenu transmis est exactement celui fourni : titre, texte générique et données minimales", async () => {
    await send({ title: "JeuTaime · Administration", body: "Tu as reçu un message de l’administration", data: { type: "ADMIN_MESSAGE" } });
    const m = sentMessages()[0]!;
    expect(m).toMatchObject({ title: "JeuTaime · Administration", body: "Tu as reçu un message de l’administration", data: { type: "ADMIN_MESSAGE" } });
    expect(JSON.stringify(m)).not.toMatch(/u1|userId/);
  });
});

describe("Édition du jour : une seule fois par appareil et par jour", () => {
  type Row = { id: string; token: string; userId: string; lastDailyEditionKey: string | null; user: { settings: { notifPush: boolean; soundEnabled: boolean; notifNews: boolean } } };
  let table: Row[];
  const makeTable = (n: number): Row[] =>
    Array.from({ length: n }, (_, i) => ({ id: `d${i}`, token: tok(i), userId: `u${i}`, lastDailyEditionKey: null, user: { settings: { notifPush: true, soundEnabled: true, notifNews: true } } }));
  const run = (key = "2026-11-13") => sendDailyEditionPush({ editionKey: key, title: "Le JeuTaime — Édition du jour", body: "Votre édition du jour est disponible." });

  beforeEach(() => {
    table = makeTable(3);
    // Mini-base : findMany applique le filtre « pas encore servi aujourd'hui », updateMany écrit la clé.
    prismaMock.pushToken.findMany.mockImplementation(async (args: { where: { AND: Array<{ OR?: Array<{ lastDailyEditionKey: null | { not: string } }> }> } }) => {
      const key = (args.where.AND[0]!.OR![1]!.lastDailyEditionKey as { not: string }).not;
      return table.filter((r) => r.lastDailyEditionKey === null || r.lastDailyEditionKey !== key).map((r) => ({ ...r }));
    });
    prismaMock.pushToken.updateMany.mockImplementation(async (args: { where: { id: { in: string[] } }; data: { lastDailyEditionKey: string } }) => {
      for (const r of table) if (args.where.id.in.includes(r.id)) r.lastDailyEditionKey = args.data.lastDailyEditionKey;
      return { count: args.where.id.in.length };
    });
    fetchMock.mockImplementation(async (_u: string, init: { body: string }) =>
      json({ data: (JSON.parse(init.body) as unknown[]).map((_m, i) => ({ status: "ok", id: `e${Math.random()}-${i}` })) }));
  });

  it("exécutions répétées dans la journée (le job tourne toutes les 5 min) : chaque appareil reçoit UN seul push", async () => {
    expect((await run()).sent).toBe(3);
    expect((await run()).sent).toBe(0);
    expect((await run()).sent).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(table.every((r) => r.lastDailyEditionKey === "2026-11-13")).toBe(true);
  });

  it("le lendemain, une nouvelle édition est envoyée une fois à chaque appareil", async () => {
    await run("2026-11-13");
    expect((await run("2026-11-14")).sent).toBe(3);
    expect((await run("2026-11-14")).sent).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("un appareil ajouté en cours de journée reçoit l'édition, les autres non", async () => {
    await run();
    table.push({ id: "d9", token: tok(9), userId: "u9", lastDailyEditionKey: null, user: { settings: { notifPush: true, soundEnabled: true, notifNews: true } } });
    expect((await run()).sent).toBe(1);
    const lastCall = JSON.parse(fetchMock.mock.calls[1]![1].body as string) as Array<{ to: string }>;
    expect(lastCall.map((m) => m.to)).toEqual([tok(9)]);
  });

  it("exécutions CHEVAUCHANTES (envoi lent, planificateur relancé) : la seconde ne fait rien, aucun doublon", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    fetchMock.mockImplementation(async (_u: string, init: { body: string }) => {
      await gate;
      return json({ data: (JSON.parse(init.body) as unknown[]).map((_m, i) => ({ status: "ok", id: `e${i}` })) });
    });
    const first = run();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const second = await run(); // pendant que la première est encore en cours d'envoi
    expect(second).toEqual({ scanned: 0, sent: 0 });
    release();
    expect((await first).sent).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await run()).sent).toBe(0); // et après coup, plus rien non plus
  });

  it("une exécution qui échoue libère le verrou : la suivante réessaie", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect((await run()).sent).toBe(0);
    expect(table.every((r) => r.lastDailyEditionKey === null)).toBe(true);
    expect((await run()).sent).toBe(3);
  });
});

describe("Édition du jour (non-régression)", () => {
  const rows = (n: number, extra: Record<string, unknown> = {}) =>
    Array.from({ length: n }, (_, i) => ({ id: `d${i}`, token: tok(i), userId: `u${i}`, user: { settings: { notifPush: true, soundEnabled: true, notifNews: true } }, ...extra }));
  const edition = () => sendDailyEditionPush({ editionKey: "2026-11-13", title: "Le JeuTaime — Édition du jour", body: "Votre édition du jour est disponible." });

  it("charge inchangée {route:/journal, editionKey}, clé enregistrée seulement pour les tickets acceptés", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue(rows(2));
    fetchMock.mockResolvedValue(json({ data: [{ status: "ok", id: "e1" }, { status: "error", details: { error: "MessageRateExceeded" } }] }));
    const r = await edition();
    expect(r).toEqual({ scanned: 2, sent: 1 });
    expect(sentMessages()[0]).toMatchObject({ title: "Le JeuTaime — Édition du jour", body: "Votre édition du jour est disponible.", data: { route: "/journal", editionKey: "2026-11-13" }, sound: "default", priority: "high", channelId: "default" });
    expect(prismaMock.pushToken.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["d0"] } }, data: { lastDailyEditionKey: "2026-11-13" } });
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled(); // erreur temporaire : jeton conservé
  });

  it("la requête exclut les comptes bannis et ceux déjà servis aujourd'hui", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue([]);
    await edition();
    expect(prismaMock.pushToken.findMany.mock.calls[0]![0].where).toEqual({
      AND: [{ OR: [{ lastDailyEditionKey: null }, { lastDailyEditionKey: { not: "2026-11-13" } }] }, { user: { isBanned: false } }],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("préférences : push général ou « Actualités » coupés, jetons au format inattendu : exclus", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue([
      ...rows(1), { ...rows(1)[0]!, id: "x1", token: tok(11), user: { settings: { notifPush: false, soundEnabled: true, notifNews: true } } },
      { ...rows(1)[0]!, id: "x2", token: tok(12), user: { settings: { notifPush: true, soundEnabled: true, notifNews: false } } },
      { ...rows(1)[0]!, id: "x3", token: "format-bizarre" },
      { ...rows(1)[0]!, id: "x4", token: tok(14), user: { settings: null } },
    ]);
    fetchMock.mockResolvedValue(json({ data: [{ status: "ok", id: "a" }, { status: "ok", id: "b" }] }));
    const r = await edition();
    expect(sentMessages().map((m) => m["to"])).toEqual([tok(0), tok(14)]);
    expect(r.sent).toBe(2);
  });

  it("DeviceNotRegistered : jeton supprimé par identifiant ; son coupé : sound null", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue([
      { ...rows(1)[0]!, user: { settings: { notifPush: true, soundEnabled: false, notifNews: true } } }, { ...rows(1)[0]!, id: "d9", token: tok(9) },
    ]);
    fetchMock.mockResolvedValue(json({ data: [{ status: "ok", id: "a" }, { status: "error", details: { error: "DeviceNotRegistered" } }] }));
    await edition();
    expect(sentMessages()[0]).toMatchObject({ sound: null });
    expect(prismaMock.pushToken.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["d9"] } } });
  });

  it("échec d'un lot (HTTP 400) : aucune clé enregistrée, aucun jeton supprimé, les autres lots partent", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue(rows(150));
    fetchMock.mockResolvedValueOnce(json({}, 400)).mockResolvedValueOnce(json({ data: Array.from({ length: 50 }, (_, i) => ({ status: "ok", id: `k${i}` })) }));
    const r = await edition();
    expect(r).toEqual({ scanned: 150, sent: 50 });
    expect(prismaMock.pushToken.updateMany).toHaveBeenCalledTimes(1);
    expect((prismaMock.pushToken.updateMany.mock.calls[0]![0].where.id.in as string[]).length).toBe(50);
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
  });

  it("coupure réseau : aucune exception ; clés non enregistrées (le job réessaiera à l'exécution suivante)", async () => {
    prismaMock.pushToken.findMany.mockResolvedValue(rows(2));
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(edition()).resolves.toEqual({ scanned: 2, sent: 0 });
    expect(prismaMock.pushToken.updateMany).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
