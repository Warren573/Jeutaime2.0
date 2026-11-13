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
