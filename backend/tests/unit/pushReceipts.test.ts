import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
const { prismaMock, incident } = vi.hoisted(() => ({
  prismaMock: { pushToken: { deleteMany: vi.fn() } },
  incident: vi.fn(async () => undefined),
}));
vi.mock("../../src/config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../src/modules/operations/operations.service", () => ({ recordSystemIncident: incident }));

import {
  RECEIPT_MAX_AGE_MS,
  RECEIPT_MIN_AGE_MS,
  pendingReceiptCount,
  processPendingReceipts,
  rememberTickets,
  resetPendingReceipts,
} from "../../src/modules/notifications/pushReceipts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const T0 = 1_700_000_000_000;
const ticket = (id: string, over: Record<string, unknown> = {}) => ({ ticketId: id, token: `ExponentPushToken[${id}-abcdefgh]`, userId: "u1", sentAt: T0, ...over });
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  resetPendingReceipts();
  prismaMock.pushToken.deleteMany.mockResolvedValue({ count: 1 });
  fetchMock = vi.fn(async () => json({ data: {} }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { resetPendingReceipts(); vi.unstubAllGlobals(); });

describe("reçus Expo", () => {
  it("rien n'est vérifié avant 15 minutes", async () => {
    rememberTickets([ticket("a")]);
    const r = await processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(r.checked).toBe(0);
    expect(pendingReceiptCount()).toBe(1);
  });

  it("un même ticket n'est suivi qu'une fois", () => {
    rememberTickets([ticket("a"), ticket("a"), ticket("b")]);
    expect(pendingReceiptCount()).toBe(2);
  });

  it("reçu ok : ticket retiré du suivi, aucun jeton supprimé", async () => {
    rememberTickets([ticket("a")]);
    fetchMock.mockResolvedValue(json({ data: { a: { status: "ok" } } }));
    const r = await processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS);
    expect(r).toEqual({ checked: 1, tokensRemoved: 0, dropped: 0 });
    expect(pendingReceiptCount()).toBe(0);
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
  });

  it("DeviceNotRegistered : jeton supprimé pour ce compte, sauf s'il a été ré-enregistré après l'envoi", async () => {
    rememberTickets([ticket("a")]);
    fetchMock.mockResolvedValue(json({ data: { a: { status: "error", details: { error: "DeviceNotRegistered" } } } }));
    const r = await processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS);
    expect(r.tokensRemoved).toBe(1);
    expect(prismaMock.pushToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", token: "ExponentPushToken[a-abcdefgh]", updatedAt: { lte: new Date(T0) } },
    });
  });

  it.each(["MessageRateExceeded", "MessageTooBig", "InvalidCredentials", "MismatchSenderId", "Autre"])(
    "reçu en erreur %s : jeton CONSERVÉ",
    async (code) => {
      rememberTickets([ticket("a")]);
      fetchMock.mockResolvedValue(json({ data: { a: { status: "error", details: { error: code } } } }));
      await processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS);
      expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
      expect(pendingReceiptCount()).toBe(0);
    },
  );

  it("erreur de configuration : incident journalisé ; erreur temporaire : non", async () => {
    rememberTickets([ticket("a"), ticket("b")]);
    fetchMock.mockResolvedValue(json({ data: { a: { status: "error", details: { error: "InvalidCredentials" } }, b: { status: "error", details: { error: "MessageRateExceeded" } } } }));
    await processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS);
    expect(incident).toHaveBeenCalledTimes(1);
    expect(incident).toHaveBeenCalledWith(expect.objectContaining({ code: "EXPO_RECEIPT_INVALIDCREDENTIALS" }));
  });

  it("échec de lecture des reçus (HTTP, réseau) : aucune suppression, ticket conservé puis abandonné après 5 échecs", async () => {
    rememberTickets([ticket("a")]);
    fetchMock.mockResolvedValue(json({}, 503));
    for (let i = 0; i < 4; i++) await processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS);
    expect(pendingReceiptCount()).toBe(1);
    const r = await processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS);
    expect(r.dropped).toBe(1);
    expect(pendingReceiptCount()).toBe(0);
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
    fetchMock.mockRejectedValue(new Error("réseau"));
    rememberTickets([ticket("z")]);
    await processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS);
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
  });

  it("reçu pas encore disponible : conservé ; abandonné après 24 h", async () => {
    rememberTickets([ticket("a")]);
    fetchMock.mockResolvedValue(json({ data: {} }));
    await processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS);
    expect(pendingReceiptCount()).toBe(1);
    const r = await processPendingReceipts(T0 + RECEIPT_MAX_AGE_MS + 1);
    expect(r.dropped).toBe(1);
    expect(pendingReceiptCount()).toBe(0);
  });

  it("les identifiants sont lus par lots de 300 au plus", async () => {
    rememberTickets(Array.from({ length: 650 }, (_, i) => ticket(`t${i}`)));
    fetchMock.mockResolvedValue(json({ data: {} }));
    await processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS);
    const sizes = fetchMock.mock.calls.map((c) => (JSON.parse(c[1].body as string) as { ids: string[] }).ids.length);
    expect(sizes).toEqual([300, 300, 50]);
  });
});

describe("reçus en mémoire : pas de blocage, pas de suppression injustifiée", () => {
  it("le minuteur ne retient jamais l'arrêt du processus (unref) et n'existe qu'en un seul exemplaire", () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(globalThis, "setTimeout");
    try {
      rememberTickets([ticket("a")]);
      rememberTickets([ticket("b")]);
      expect(spy).toHaveBeenCalledTimes(1);
      const handle = spy.mock.results[0]!.value as { unref?: () => unknown };
      expect(typeof handle.unref).toBe("function");
      expect(vi.getTimerCount()).toBe(1);
    } finally {
      spy.mockRestore();
      resetPendingReceipts();
      vi.useRealTimers();
    }
  });

  it("une passe en cours n'est jamais doublée : un second appel simultané ne lit rien", async () => {
    rememberTickets([ticket("a")]);
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    fetchMock.mockImplementation(async () => { await gate; return json({ data: { a: { status: "ok" } } }); });
    const first = processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const second = await processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS);
    expect(second).toEqual({ checked: 0, tokensRemoved: 0, dropped: 0 });
    release();
    expect((await first).checked).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("une lecture lente n'empêche pas le serveur de répondre : la boucle d'événements reste libre", async () => {
    rememberTickets(Array.from({ length: 900 }, (_, i) => ticket(`t${i}`)));
    fetchMock.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(json({ data: {} })), 40)));
    let ticks = 0;
    const interval = setInterval(() => { ticks += 1; }, 5);
    await processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS);
    clearInterval(interval);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(ticks).toBeGreaterThan(10); // d'autres tâches ont tourné pendant les attentes réseau
  });

  it("une erreur inattendue pendant une passe ne se propage pas comme exception non gérée côté minuteur", async () => {
    rememberTickets([ticket("a")]);
    fetchMock.mockImplementation(async () => { throw new Error("boom"); });
    await expect(processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS)).resolves.toMatchObject({ tokensRemoved: 0 });
    expect(prismaMock.pushToken.deleteMany).not.toHaveBeenCalled();
    prismaMock.pushToken.deleteMany.mockRejectedValueOnce(new Error("db down"));
    fetchMock.mockResolvedValue(json({ data: { a: { status: "error", details: { error: "DeviceNotRegistered" } } } }));
    await expect(processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS)).rejects.toThrow("db down");
    // …et la passe suivante n'est pas bloquée par la précédente.
    rememberTickets([ticket("c")]);
    fetchMock.mockResolvedValue(json({ data: { c: { status: "ok" } } }));
    await expect(processPendingReceipts(T0 + RECEIPT_MIN_AGE_MS)).resolves.toMatchObject({ checked: 1 });
  });

  it("la mémoire est bornée : au-delà de 5 000 tickets, les plus anciens sont abandonnés", () => {
    rememberTickets(Array.from({ length: 6000 }, (_, i) => ticket(`t${i}`)));
    expect(pendingReceiptCount()).toBe(5000);
  });

  it("aucun ticket sans identifiant n'est suivi", () => {
    rememberTickets([ticket(""), ticket("a")]);
    expect(pendingReceiptCount()).toBe(1);
  });
});
