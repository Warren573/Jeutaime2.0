import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * De l'événement métier au push : deux lettres distinctes = deux notifications ;
 * le même événement rejoué = un seul envoi. Vrais handlers, vrai service push ; base et Expo simulés.
 */
vi.mock("../../src/config/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: { update: vi.fn(async () => ({})) },
    $transaction: vi.fn(async () => []),
    user: { findUnique: vi.fn() },
    pushToken: { findMany: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
  },
}));
vi.mock("../../src/config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../src/modules/operations/operations.service", () => ({ recordSystemIncident: vi.fn(async () => undefined) }));
vi.mock("../../src/modules/auth/accountLifecycle.service", () => ({ isAccountDeactivated: vi.fn(async () => false) }));
const createNotification = vi.hoisted(() => vi.fn(async () => ({ id: "n" })));
vi.mock("../../src/modules/notifications/notifications.service", () => ({ createNotification }));

import "../../src/events/handlers";
import { emitLetterSent, emitMagieCast, emitMatchCreated, emitOfferingSent } from "../../src/events";
import { resetPushIdempotency } from "../../src/modules/notifications/push.service";
import { resetPendingReceipts } from "../../src/modules/notifications/pushReceipts";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
let fetchMock: ReturnType<typeof vi.fn>;
const flush = () => new Promise((r) => setTimeout(r, 30));
const sentTo = () => fetchMock.mock.calls.map((c) => (JSON.parse(c[1].body as string) as Array<{ to: string; body: string }>)[0]!);

const letter = (over: Record<string, unknown> = {}) => ({
  matchId: "m1", fromUserId: "uA", toUserId: "uB", matchLetterCountA: 1, matchLetterCountB: 0, isGhostRelance: false, ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  resetPushIdempotency();
  resetPendingReceipts();
  prismaMock.user.findUnique.mockResolvedValue({ isBanned: false, settings: { notifPush: true, soundEnabled: true, notifMeetings: true, notifLetters: true, notifSalons: true, notifActivities: true, notifNews: true } });
  prismaMock.pushToken.findMany.mockResolvedValue([{ id: "r1", token: "ExponentPushToken[abcdefghij1234]" }]);
  fetchMock = vi.fn(async () => json({ data: [{ status: "ok", id: `t-${Math.random()}` }] }));
  vi.stubGlobal("fetch", fetchMock);
});

describe("lettres", () => {
  it("deux lettres successives, texte identique, quasi simultanées : DEUX notifications push", async () => {
    emitLetterSent(letter({ matchLetterCountA: 1 }));
    emitLetterSent(letter({ matchLetterCountA: 2 }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sentTo().map((m) => m.body)).toEqual(["Tu as reçu une nouvelle lettre", "Tu as reçu une nouvelle lettre"]);
    expect(createNotification).toHaveBeenCalledTimes(2); // la cloche reçoit aussi les deux
  });

  it("lettres de deux correspondances différentes ou d'expéditeurs différents : chacune notifiée", async () => {
    emitLetterSent(letter());
    emitLetterSent(letter({ matchId: "m2" }));
    emitLetterSent(letter({ fromUserId: "uC", matchLetterCountA: 0, matchLetterCountB: 1 }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it("le MÊME événement rejoué (même lettre) : un seul envoi", async () => {
    emitLetterSent(letter());
    emitLetterSent(letter());
    emitLetterSent(letter());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("une relance (même compteurs que la dernière lettre) est un événement distinct", async () => {
    emitLetterSent(letter({ matchLetterCountA: 3, matchLetterCountB: 3 }));
    emitLetterSent(letter({ matchLetterCountA: 3, matchLetterCountB: 3, isGhostRelance: true }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("échange alterné A, B, A : trois lettres, trois envois, vers les bons destinataires", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isBanned: false, settings: null });
    emitLetterSent(letter({ fromUserId: "uA", toUserId: "uB", matchLetterCountA: 1, matchLetterCountB: 0 }));
    emitLetterSent(letter({ fromUserId: "uB", toUserId: "uA", matchLetterCountA: 1, matchLetterCountB: 1 }));
    emitLetterSent(letter({ fromUserId: "uA", toUserId: "uB", matchLetterCountA: 2, matchLetterCountB: 1 }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });
});

describe("autres événements", () => {
  it("offrande : deux offrandes distinctes = deux envois ; la même rejouée = un", async () => {
    const o = (id: string) => ({ offeringSentId: id, offeringId: "rose", fromUserId: "uA", toUserId: "uB", salonId: "s1", cost: 60, expiresAt: null });
    emitOfferingSent(o("os1"));
    emitOfferingSent(o("os2"));
    emitOfferingSent(o("os2"));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("magie : deux sorts distincts = deux envois ; le même rejoué = un", async () => {
    const m = (id: string) => ({ magieCastId: id, magieId: "x", fromUserId: "uA", toUserId: "uB", salonId: null, expiresAt: new Date(), cost: 10 });
    emitMagieCast(m("c1"));
    emitMagieCast(m("c2"));
    emitMagieCast(m("c1"));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("match créé : un push par participant, une seule fois même si l'événement est rejoué", async () => {
    prismaMock.pushToken.findMany.mockImplementation(async (args: { where: { userId: string } }) => [{ id: `r-${args.where.userId}`, token: `ExponentPushToken[tok${args.where.userId}abcdefgh]` }]);
    const e = { matchId: "m9", userAId: "uA", userBId: "uB", initiatorId: "uA" };
    emitMatchCreated(e);
    emitMatchCreated(e);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentTo().map((m) => m.to).sort()).toEqual(["ExponentPushToken[tokuAabcdefgh]", "ExponentPushToken[tokuBabcdefgh]"]);
  });
});
