import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyExpoError, fetchReceipts, isExpoPushToken, postPushBatch, type ExpoPushMessage } from "../../src/modules/notifications/expoPush";

vi.mock("../../src/config/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const msg: ExpoPushMessage = { to: "ExponentPushToken[abcdefghij1234]", title: "t", body: "b" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const noSleep = vi.fn(async () => undefined);
afterEach(() => { vi.unstubAllGlobals(); noSleep.mockClear(); });

describe("format des jetons Expo", () => {
  it("accepte les formats Expo valides", () => {
    for (const t of ["ExponentPushToken[abcdefghij1234]", "ExpoPushToken[Abc_def-GHI12345]", `ExponentPushToken[${"a".repeat(22)}]`]) {
      expect(isExpoPushToken(t), t).toBe(true);
    }
  });
  it("refuse tout le reste", () => {
    const bad = [
      "", "abc", "ExponentPushToken[]", "ExponentPushToken[court]", "ExponentPushToken[abcdefghij1234", "exponentpushtoken[abcdefghij1234]",
      "ExponentPushToken[abc def ghij1234]", "ExponentPushToken[abcdefghij1234]x", " ExponentPushToken[abcdefghij1234]",
      "ExponentPushToken[abcdefghij1234]\n", "ExponentPushToken[<script>alert(1)</script>]", "fcm:APA91bH...", `ExponentPushToken[${"a".repeat(600)}]`,
      null, undefined, 42, {},
    ];
    for (const t of bad) expect(isExpoPushToken(t as never), String(t).slice(0, 40)).toBe(false);
  });
});

describe("classification des erreurs Expo", () => {
  it("seul DeviceNotRegistered est définitif", () => {
    expect(classifyExpoError("DeviceNotRegistered")).toBe("invalid_token");
    expect(classifyExpoError("MessageRateExceeded")).toBe("transient");
    for (const c of ["InvalidCredentials", "MismatchSenderId", "MessageTooBig"]) expect(classifyExpoError(c)).toBe("configuration");
    for (const c of [undefined, "", "Autre"]) expect(classifyExpoError(c)).toBe("unknown");
  });
});

describe("postPushBatch", () => {
  it("succès : renvoie les tickets", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ data: [{ status: "ok", id: "t1" }] })));
    const r = await postPushBatch([msg], { sleep: noSleep });
    expect(r).toEqual({ kind: "ok", tickets: [{ status: "ok", id: "t1" }] });
  });

  it("429 puis succès : rejoue avec attente exponentielle", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(json({}, 429))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ data: [{ status: "ok", id: "t1" }] }));
    vi.stubGlobal("fetch", f);
    const r = await postPushBatch([msg], { sleep: noSleep, baseDelayMs: 100 });
    expect(r.kind).toBe("ok");
    expect(f).toHaveBeenCalledTimes(3);
    expect(noSleep.mock.calls.map((c) => c[0])).toEqual([100, 200]);
  });

  it("500 persistant : abandon après 3 essais, marqué rejouable", async () => {
    const f = vi.fn(async () => json({}, 500));
    vi.stubGlobal("fetch", f);
    const r = await postPushBatch([msg], { sleep: noSleep });
    expect(f).toHaveBeenCalledTimes(3);
    expect(r).toMatchObject({ kind: "failed", retryable: true, status: 500 });
  });

  it("400 : jamais rejoué", async () => {
    const f = vi.fn(async () => json({ errors: [] }, 400));
    vi.stubGlobal("fetch", f);
    const r = await postPushBatch([msg], { sleep: noSleep });
    expect(f).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ kind: "failed", retryable: false, status: 400 });
  });

  it("coupure réseau en cours de requête : PAS de rejeu (risque de doublon)", async () => {
    const f = vi.fn(async () => { throw new TypeError("fetch failed"); });
    vi.stubGlobal("fetch", f);
    const r = await postPushBatch([msg], { sleep: noSleep });
    expect(f).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ kind: "failed", retryable: false });
  });

  it("délai dépassé : PAS de rejeu", async () => {
    const f = vi.fn(async () => { throw new DOMException("timeout", "TimeoutError"); });
    vi.stubGlobal("fetch", f);
    const r = await postPushBatch([msg], { sleep: noSleep });
    expect(f).toHaveBeenCalledTimes(1);
    expect(r.kind).toBe("failed");
  });

  it("connexion jamais établie (DNS, refus) : rejeu sans risque", async () => {
    const err = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    const f = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce(json({ data: [{ status: "ok", id: "t1" }] }));
    vi.stubGlobal("fetch", f);
    const r = await postPushBatch([msg], { sleep: noSleep });
    expect(r.kind).toBe("ok");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("2xx illisible : échec sans rejeu", async () => {
    const f = vi.fn(async () => new Response("pas du json", { status: 200 }));
    vi.stubGlobal("fetch", f);
    const r = await postPushBatch([msg], { sleep: noSleep });
    expect(f).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ kind: "failed", retryable: false });
  });
});

describe("fetchReceipts", () => {
  it("renvoie les reçus", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ data: { a: { status: "ok" } } })));
    expect(await fetchReceipts(["a"])).toEqual({ kind: "ok", receipts: { a: { status: "ok" } } });
  });
  it("HTTP ≠ 2xx ou réseau : échec, sans lever", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 502)));
    expect(await fetchReceipts(["a"])).toMatchObject({ kind: "failed", status: 502 });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("boom"); }));
    expect(await fetchReceipts(["a"])).toMatchObject({ kind: "failed" });
  });
});
