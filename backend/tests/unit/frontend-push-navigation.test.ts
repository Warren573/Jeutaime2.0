import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PUSH_FALLBACK_ROUTE,
  badgeCountFor,
  createPushNavigator,
  isSafeId,
  isViewingDestination,
  prepareDestinationWith,
  resolvePushDestination,
  shouldShowForegroundBanner,
  type PushAuthState,
  type PushDestination,
  type PushResponseLike,
} from "../../../frontend/src/utils/pushNavigation";
import { getNotificationTarget } from "../../../frontend/src/utils/notifications";

/**
 * Navigation par notification push (application iOS) : logique pure testée ici
 * (le dépôt n'a pas de banc de test côté application ; la CI du backend l'exécute).
 */
const DEFAULT = "expo.modules.notifications.actions.DEFAULT";
const resp = (id: string, data: unknown, action: string | undefined = DEFAULT): PushResponseLike => ({
  actionIdentifier: action,
  notification: { request: { identifier: id, content: { data } } },
});

describe("destinations : chaque type de notification", () => {
  it.each([
    [{ type: "LETTER_RECEIVED", matchId: "m1" }, "/match-profile?matchId=m1"],
    [{ type: "MATCH_CREATED", matchId: "m_2-X" }, "/match-profile?matchId=m_2-X"],
    [{ type: "QUESTIONS_PASSED", matchId: "m1" }, "/match-profile?matchId=m1"],
    [{ type: "QUESTIONS_FAILED", matchId: "m1" }, PUSH_FALLBACK_ROUTE],
    [{ type: "OFFERING_RECEIVED", salonId: "s1" }, "/salon/s1"],
    [{ type: "OFFERING_RECEIVED" }, "/offerings"],
    [{ type: "MAGIE_RECEIVED", salonId: "s1" }, "/salon/s1"],
    [{ type: "MAGIE_RECEIVED" }, PUSH_FALLBACK_ROUTE],
    [{ type: "BOTTLE_REPLY" }, "/bottles-main"],
    [{ type: "PRIVATE_SALON_INVITE" }, "/private-salons"],
    [{ type: "ADMIN_MESSAGE" }, "/admin-messages"],
    [{ type: "PREMIUM_SUBSCRIBED" }, "/premium"],
    [{ type: "PREMIUM_CANCELLED" }, "/premium"],
    [{ type: "SECURITY_ALERT" }, "/security"],
    [{ type: "DAILY_EDITION" }, "/journal"],
    [{ route: "/journal", editionKey: "2026-11-13" }, "/journal"], // charge actuelle de l'Édition du jour
  ])("%j → %s", (data, route) => {
    expect(resolvePushDestination(data).route).toBe(route);
  });

  it("repli sûr quand l'identifiant nécessaire manque", () => {
    for (const type of ["LETTER_RECEIVED", "MATCH_CREATED", "QUESTIONS_PASSED"]) {
      expect(resolvePushDestination({ type }).route, type).toBe(PUSH_FALLBACK_ROUTE);
    }
  });

  it("cohérence avec la cloche : mêmes destinations que getNotificationTarget quand elle en a une", () => {
    const meta = { matchId: "m1", salonId: "s1" };
    const types = ["LETTER_RECEIVED", "MATCH_CREATED", "QUESTIONS_PASSED", "OFFERING_RECEIVED", "MAGIE_RECEIVED", "PREMIUM_SUBSCRIBED", "PREMIUM_CANCELLED", "ADMIN_MESSAGE", "PRIVATE_SALON_INVITE", "SECURITY_ALERT"];
    for (const type of types) {
      const bell = getNotificationTarget({ type, meta } as never);
      expect(bell, type).not.toBeNull();
      expect(resolvePushDestination({ type, ...meta }).route, type).toBe(bell);
    }
  });
});

describe("sécurité : jamais de route arbitraire", () => {
  const nasty = [
    "../admin", "/admin", "//evil.com", "https://evil.com", "javascript:alert(1)", "jeutaime://admin", "m1?x=1", "m1&matchId=2", "m1#frag",
    "a b", "a/b", "a\\b", "<script>", "%2e%2e", "m1\n", "é", "", " ", "x".repeat(65),
  ];
  const ALLOWED = [/^\/match-profile\?matchId=[A-Za-z0-9_-]{1,64}$/, /^\/salon\/[A-Za-z0-9_-]{1,64}$/, /^\/(offerings|bottles-main|private-salons|admin-messages|premium|security|journal|notifications)$/];
  const isAllowed = (route: string) => ALLOWED.some((re) => re.test(route));

  it("identifiants piégés : repli ou écran fixe, jamais utilisés tels quels", () => {
    for (const bad of nasty) {
      for (const type of ["LETTER_RECEIVED", "MATCH_CREATED", "QUESTIONS_PASSED"]) {
        expect(resolvePushDestination({ type, matchId: bad }).route, `${type} ${bad}`).toBe(PUSH_FALLBACK_ROUTE);
      }
      expect(resolvePushDestination({ type: "OFFERING_RECEIVED", salonId: bad }).route, bad).toBe("/offerings");
      expect(resolvePushDestination({ type: "MAGIE_RECEIVED", salonId: bad }).route, bad).toBe(PUSH_FALLBACK_ROUTE);
    }
    for (const bad of [42, true, null, undefined, {}, [], ["m1"]]) {
      expect(resolvePushDestination({ type: "LETTER_RECEIVED", matchId: bad }).route).toBe(PUSH_FALLBACK_ROUTE);
    }
  });

  it("le champ `route` de la charge n'est jamais suivi (sauf le Journal exact, sans type)", () => {
    for (const route of ["/admin", "/security", "//evil", "https://evil.com", "/journal/../admin", "/journal ", "/JOURNAL", "/journal?x=1", "jeutaime://x"]) {
      expect(resolvePushDestination({ route }).route, route).toBe(PUSH_FALLBACK_ROUTE);
    }
    // Avec un type, la route fournie est ignorée.
    expect(resolvePushDestination({ type: "LETTER_RECEIVED", matchId: "m1", route: "/admin" }).route).toBe("/match-profile?matchId=m1");
    expect(resolvePushDestination({ type: "ADMIN_MESSAGE", route: "/security", url: "https://evil" }).route).toBe("/admin-messages");
    expect(resolvePushDestination({ type: "UNKNOWN", route: "/journal" }).route).toBe(PUSH_FALLBACK_ROUTE);
  });

  it("charges de forme inattendue : repli, sans exception", () => {
    for (const data of [null, undefined, 42, "x", true, [], [{ type: "SECURITY_ALERT" }], () => 1, Symbol("s"), NaN]) {
      expect(() => resolvePushDestination(data as never)).not.toThrow();
      expect(resolvePushDestination(data as never).route).toBe(PUSH_FALLBACK_ROUTE);
    }
    for (const type of ["", "constructor", "__proto__", "toString", "security_alert", "SECURITY_ALERT ", 42, null, {}]) {
      expect(resolvePushDestination({ type } as never).route, String(type)).toBe(PUSH_FALLBACK_ROUTE);
    }
  });

  it("à partir de milliers de charges aléatoires, la destination reste TOUJOURS dans la liste fermée", () => {
    let seed = 1234567;
    const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const pool = [...nasty, "m1", "s-1", "ok_ID", "LETTER_RECEIVED", "SECURITY_ALERT", "/admin", "/journal", "OFFERING_RECEIVED", "MAGIE_RECEIVED", "BOTTLE_REPLY"];
    const pick = () => pool[Math.floor(rand() * pool.length)];
    for (let i = 0; i < 5000; i++) {
      const data = { type: pick(), matchId: pick(), salonId: pick(), route: pick(), url: pick(), [pick() as string]: pick() };
      const dest = resolvePushDestination(data);
      expect(isAllowed(dest.route), JSON.stringify(data)).toBe(true);
    }
  });

  it("isSafeId", () => {
    expect(isSafeId("cl9abc_DEF-123")).toBe(true);
    for (const bad of ["", "a b", "../x", "x".repeat(65), 1, null]) expect(isSafeId(bad)).toBe(false);
  });
});

describe("bannière inutile quand l'écran est déjà ouvert", () => {
  const loc = (pathname: string, params: Record<string, string | string[]> = {}) => ({ pathname, params });
  it("même correspondance ouverte : pas de bannière ; autre correspondance : bannière", () => {
    const data = { type: "LETTER_RECEIVED", matchId: "m1" };
    expect(shouldShowForegroundBanner(loc("/match-profile", { matchId: "m1" }), data)).toBe(false);
    expect(shouldShowForegroundBanner(loc("/match-profile", { matchId: ["m1"] }), data)).toBe(false);
    expect(shouldShowForegroundBanner(loc("/match-profile", { matchId: "m2" }), data)).toBe(true);
    expect(shouldShowForegroundBanner(loc("/match-profile"), data)).toBe(true);
    expect(shouldShowForegroundBanner(loc("/letters"), data)).toBe(true);
  });
  it("écrans fixes et salons", () => {
    expect(shouldShowForegroundBanner(loc("/admin-messages"), { type: "ADMIN_MESSAGE" })).toBe(false);
    expect(shouldShowForegroundBanner(loc("/admin-messages/"), { type: "ADMIN_MESSAGE" })).toBe(false);
    expect(shouldShowForegroundBanner(loc("/security"), { type: "SECURITY_ALERT" })).toBe(false);
    expect(shouldShowForegroundBanner(loc("/journal"), { route: "/journal" })).toBe(false);
    expect(shouldShowForegroundBanner(loc("/salon/s1"), { type: "MAGIE_RECEIVED", salonId: "s1" })).toBe(false);
    expect(shouldShowForegroundBanner(loc("/salon/s2"), { type: "MAGIE_RECEIVED", salonId: "s1" })).toBe(true);
    expect(shouldShowForegroundBanner(loc("/security"), { type: "ADMIN_MESSAGE" })).toBe(true);
  });
  it("jamais de suppression pour le repli ni sans écran connu", () => {
    expect(shouldShowForegroundBanner(loc("/notifications"), { type: "UNKNOWN" })).toBe(true);
    expect(shouldShowForegroundBanner(loc("/notifications"), null)).toBe(true);
    expect(shouldShowForegroundBanner(null, { type: "SECURITY_ALERT" })).toBe(true);
    expect(isViewingDestination(undefined, resolvePushDestination({ type: "SECURITY_ALERT" }))).toBe(false);
  });
});

describe("badge de l'icône", () => {
  it("valeurs sûres", () => {
    expect(badgeCountFor(0)).toBe(0);
    expect(badgeCountFor(7)).toBe(7);
    expect(badgeCountFor(7.9)).toBe(7);
    expect(badgeCountFor(-3)).toBe(0);
    expect(badgeCountFor(1e9)).toBe(9999);
    for (const bad of [NaN, Infinity, -Infinity, "5", null, undefined, {}]) expect(badgeCountFor(bad)).toBe(0);
  });
});

describe("préparation de la destination (ressource disponible ?)", () => {
  const match = (id: string): PushDestination => resolvePushDestination({ type: "LETTER_RECEIVED", matchId: id });
  afterEach(() => vi.useRealTimers());

  it("correspondance déjà connue : aucune requête, route directe", async () => {
    const refresh = vi.fn(async () => undefined);
    expect(await prepareDestinationWith(match("m1"), { hasMatch: () => true, refreshMatches: refresh, timeoutMs: 50 })).toBe("/match-profile?matchId=m1");
    expect(refresh).not.toHaveBeenCalled();
  });
  it("nouveau match absent du magasin : rechargé, puis ouvert", async () => {
    const known = new Set<string>();
    const refresh = vi.fn(async () => { known.add("m1"); });
    expect(await prepareDestinationWith(match("m1"), { hasMatch: (id) => known.has(id), refreshMatches: refresh, timeoutMs: 50 })).toBe("/match-profile?matchId=m1");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("ressource disparue (rompue, bloquée, supprimée) : repli", async () => {
    expect(await prepareDestinationWith(match("m1"), { hasMatch: () => false, refreshMatches: async () => undefined, timeoutMs: 50 })).toBe(PUSH_FALLBACK_ROUTE);
  });
  it("rechargement en erreur ou trop lent : repli, sans exception ni attente excessive", async () => {
    expect(await prepareDestinationWith(match("m1"), { hasMatch: () => false, refreshMatches: async () => { throw new Error("réseau"); }, timeoutMs: 50 })).toBe(PUSH_FALLBACK_ROUTE);
    vi.useFakeTimers();
    const p = prepareDestinationWith(match("m1"), { hasMatch: () => false, refreshMatches: () => new Promise(() => undefined), timeoutMs: 4000 });
    await vi.advanceTimersByTimeAsync(4000);
    expect(await p).toBe(PUSH_FALLBACK_ROUTE);
  });
  it("hasMatch qui lève : repli", async () => {
    expect(await prepareDestinationWith(match("m1"), { hasMatch: () => { throw new Error("x"); }, refreshMatches: async () => undefined, timeoutMs: 50 })).toBe(PUSH_FALLBACK_ROUTE);
  });
  it("destinations non correspondance : jamais de requête", async () => {
    const refresh = vi.fn();
    expect(await prepareDestinationWith(resolvePushDestination({ type: "SECURITY_ALERT" }), { hasMatch: () => false, refreshMatches: refresh, timeoutMs: 50 })).toBe("/security");
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("ouverture par appui : authentification, routeur, doublons", () => {
  let nav: ReturnType<typeof vi.fn>;
  let consume: ReturnType<typeof vi.fn>;
  let discard: ReturnType<typeof vi.fn>;
  let clock = 1_000_000;
  const make = (over: Record<string, unknown> = {}) =>
    createPushNavigator({ navigate: nav as never, consume: consume as never, onDiscard: discard as never, defaultActionId: DEFAULT, now: () => clock, ...over });
  const ready = (auth: PushAuthState = "authenticated", navReady = true) => ({ auth, navReady });
  const tick = () => new Promise((r) => setTimeout(r, 0));

  beforeEach(() => { nav = vi.fn(); consume = vi.fn(); discard = vi.fn(); clock = 1_000_000; });

  it("application OUVERTE ou en ARRIÈRE-PLAN (session active, routeur prêt) : ouverture immédiate, une fois", async () => {
    const n = make();
    n.update(ready());
    n.onResponse(resp("n1", { type: "LETTER_RECEIVED", matchId: "m1" }));
    await tick();
    expect(nav).toHaveBeenCalledTimes(1);
    expect(nav).toHaveBeenCalledWith("/match-profile?matchId=m1");
    expect(consume).toHaveBeenCalled();
  });

  it("application FERMÉE (démarrage à froid) : l'appui est mis en attente jusqu'à la session ET au routeur", async () => {
    const n = make();
    n.onResponse(resp("n1", { type: "SECURITY_ALERT" })); // dernière réponse lue au montage
    n.update(ready("unknown", false));
    await tick();
    expect(nav).not.toHaveBeenCalled();
    n.update(ready("unknown", true)); // routeur prêt, session pas encore restaurée
    await tick();
    expect(nav).not.toHaveBeenCalled();
    n.update(ready("authenticated", false)); // session restaurée, routeur pas encore prêt
    await tick();
    expect(nav).not.toHaveBeenCalled();
    n.update(ready("authenticated", true));
    await tick();
    expect(nav).toHaveBeenCalledTimes(1);
    expect(nav).toHaveBeenCalledWith("/security");
  });

  it("démarrage à froid sans session (déconnecté) : aucune ouverture, ni maintenant ni après la connexion suivante", async () => {
    const n = make();
    n.onResponse(resp("n1", { type: "ADMIN_MESSAGE" }));
    n.update(ready("unknown", true));
    n.update(ready("unauthenticated", true));
    await tick();
    expect(nav).not.toHaveBeenCalled();
    expect(discard).toHaveBeenCalledWith("unauthenticated");
    expect(consume).toHaveBeenCalled();
    n.update(ready("authenticated", true)); // l'utilisateur se connecte ensuite
    await tick();
    expect(nav).not.toHaveBeenCalled();
    expect(n.hasPending()).toBe(false);
  });

  it("aucune double navigation : écouteur ET dernière réponse pour le même appui", async () => {
    const n = make();
    n.update(ready("unknown", false));
    n.onResponse(resp("n1", { type: "LETTER_RECEIVED", matchId: "m1" })); // dernière réponse
    n.onResponse(resp("n1", { type: "LETTER_RECEIVED", matchId: "m1" })); // écouteur
    n.update(ready());
    await tick();
    n.onResponse(resp("n1", { type: "LETTER_RECEIVED", matchId: "m1" })); // rejeu après navigation
    await tick();
    expect(nav).toHaveBeenCalledTimes(1);
    expect(discard).toHaveBeenCalledWith("duplicate");
  });

  it("un rechargement de l'application rejouant la dernière réponse n'ouvre qu'une fois (déduplication)", async () => {
    const n = make();
    n.update(ready());
    n.onResponse(resp("n1", { type: "SECURITY_ALERT" }));
    await tick();
    clock += 5_000;
    n.onResponse(resp("n1", { type: "SECURITY_ALERT" }));
    await tick();
    expect(nav).toHaveBeenCalledTimes(1);
  });

  it("deux appuis DISTINCTS ouvrent deux fois ; le même appui bien plus tard est de nouveau accepté", async () => {
    const n = make();
    n.update(ready());
    n.onResponse(resp("n1", { type: "SECURITY_ALERT" }));
    await tick();
    n.onResponse(resp("n2", { type: "ADMIN_MESSAGE" }));
    await tick();
    expect(nav.mock.calls.map((c) => c[0])).toEqual(["/security", "/admin-messages"]);
    clock += 31_000;
    n.onResponse(resp("n1", { type: "SECURITY_ALERT" }));
    await tick();
    expect(nav).toHaveBeenCalledTimes(3);
  });

  it("actions autres que l'appui simple, ou sans identifiant : ignorées", async () => {
    const n = make();
    n.update(ready());
    n.onResponse(resp("n1", { type: "SECURITY_ALERT" }, "expo.modules.notifications.actions.DISMISS"));
    n.onResponse({ notification: { request: { content: { data: { type: "SECURITY_ALERT" } } } } });
    n.onResponse(null);
    n.onResponse(undefined);
    await tick();
    expect(nav).not.toHaveBeenCalled();
  });

  it("ouverture en attente périmée (> 60 s) : abandonnée", async () => {
    const n = make();
    n.onResponse(resp("n1", { type: "SECURITY_ALERT" }));
    clock += 61_000;
    n.update(ready());
    await tick();
    expect(nav).not.toHaveBeenCalled();
    expect(discard).toHaveBeenCalledWith("expired");
  });

  it("charge piégée : jamais de route arbitraire, repli sûr", async () => {
    const n = make();
    n.update(ready());
    n.onResponse(resp("n1", { route: "/admin", type: "NOPE", url: "https://evil.com" }));
    await tick();
    expect(nav).toHaveBeenCalledWith(PUSH_FALLBACK_ROUTE);
  });

  it("ressource indisponible : le repli est ouvert à la place de l'écran introuvable", async () => {
    const n = make({ prepare: async () => PUSH_FALLBACK_ROUTE });
    n.update(ready());
    n.onResponse(resp("n1", { type: "MATCH_CREATED", matchId: "m1" }));
    await tick();
    expect(nav).toHaveBeenCalledWith(PUSH_FALLBACK_ROUTE);
  });

  it("préparation qui échoue : repli, jamais d'exception", async () => {
    const n = make({ prepare: async () => { throw new Error("x"); } });
    n.update(ready());
    n.onResponse(resp("n1", { type: "MATCH_CREATED", matchId: "m1" }));
    await tick();
    expect(nav).toHaveBeenCalledWith(PUSH_FALLBACK_ROUTE);
  });

  it("déconnexion PENDANT la préparation : aucune navigation", async () => {
    let release!: (r: string) => void;
    const n = make({ prepare: () => new Promise<string>((r) => { release = r; }) });
    n.update(ready());
    n.onResponse(resp("n1", { type: "MATCH_CREATED", matchId: "m1" }));
    await tick();
    n.update(ready("unauthenticated"));
    release("/match-profile?matchId=m1");
    await tick();
    expect(nav).not.toHaveBeenCalled();
  });

  it("nouvelle notification pendant la préparation d'une autre : les deux sont ouvertes, dans l'ordre", async () => {
    let release!: (r: string) => void;
    let first = true;
    const n = make({ prepare: (d: PushDestination) => (first && d.kind === "match" ? ((first = false), new Promise<string>((r) => { release = r; })) : Promise.resolve(d.route)) });
    n.update(ready());
    n.onResponse(resp("n1", { type: "MATCH_CREATED", matchId: "m1" }));
    await tick();
    n.onResponse(resp("n2", { type: "SECURITY_ALERT" }));
    release("/match-profile?matchId=m1");
    await tick(); await tick();
    expect(nav.mock.calls.map((c) => c[0])).toEqual(["/match-profile?matchId=m1", "/security"]);
  });

  it("mises à jour d'état répétées : une seule navigation", async () => {
    const n = make();
    n.onResponse(resp("n1", { type: "SECURITY_ALERT" }));
    for (let i = 0; i < 5; i++) n.update(ready());
    await tick();
    expect(nav).toHaveBeenCalledTimes(1);
  });
});
