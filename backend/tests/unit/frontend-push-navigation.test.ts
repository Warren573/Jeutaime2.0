import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PUSH_FALLBACK_ROUTE,
  badgeCountFor,
  createPushNavigator,
  isSafeId,
  foregroundPresentation,
  isAlreadyAtRoute,
  isViewingDestination,
  onForegroundNotification,
  prepareDestinationWith,
  routeToLocation,
  resolvePushDestination,
  shouldShowForegroundBanner,
  type PushAuthState,
  type PushDestination,
  type PushDiscardReason,
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
    [{ type: "LETTER_RECEIVED", matchId: "m1" }, "/(tabs)/letters?matchId=m1"],
    [{ type: "MATCH_CREATED", matchId: "m_2-X" }, "/(tabs)/letters?questionsMatchId=m_2-X"],
    [{ type: "QUESTIONS_PASSED", matchId: "m1" }, "/(tabs)/letters"],
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
  const ALLOWED = [/^\/\(tabs\)\/letters(?:\?questionsMatchId=[A-Za-z0-9_-]{1,64})?$/, /^\/\(tabs\)\/letters\?matchId=[A-Za-z0-9_-]{1,64}$/, /^\/salon\/[A-Za-z0-9_-]{1,64}$/, /^\/(offerings|bottles-main|private-salons|admin-messages|premium|security|journal|notifications)$/];
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
    expect(resolvePushDestination({ type: "LETTER_RECEIVED", matchId: "m1", route: "/admin" }).route).toBe("/(tabs)/letters?matchId=m1");
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
    expect(shouldShowForegroundBanner(loc("/(tabs)/letters", { matchId: "m1" }), data)).toBe(false);
    expect(shouldShowForegroundBanner(loc("/(tabs)/letters", { matchId: ["m1"] }), data)).toBe(false);
    expect(shouldShowForegroundBanner(loc("/(tabs)/letters", { matchId: "m2" }), data)).toBe(true);
    expect(shouldShowForegroundBanner(loc("/(tabs)/letters"), data)).toBe(true);
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

describe("notification reçue application PAS « active » (transition) : présentation système, bannière, son ET vibration, compteur", () => {
  const loc = (pathname: string, params: Record<string, string | string[]> = {}) => ({ pathname, params });
  const prefs = { sound: true, vibration: true };
  const letter = (matchId: string) => ({ type: "LETTER_RECEIVED", matchId });

  function receive(current: ReturnType<typeof loc> | null, data: unknown, p = prefs) {
    const vibrate = vi.fn();
    const refreshUnread = vi.fn();
    const presentation = onForegroundNotification({ current, data, prefs: p, appState: "inactive", vibrate, refreshUnread });
    return { presentation, vibrate, refreshUnread };
  }

  it("écran ET ressource déjà affichés : bannière, liste, son et vibration supprimés, compteur actualisé", () => {
    const r = receive(loc("/(tabs)/letters", { matchId: "m1" }), letter("m1"));
    expect(r.presentation).toEqual({ showBanner: false, showList: false, playSound: false, vibrate: false });
    expect(r.vibrate).not.toHaveBeenCalled();
    expect(r.refreshUnread).toHaveBeenCalledTimes(1);
  });

  it("autre correspondance : tout est conservé (bannière, son, vibration) et le compteur est actualisé", () => {
    for (const current of [loc("/(tabs)/letters", { matchId: "m2" }), loc("/(tabs)/letters"), loc("/(tabs)/letters", { matchId: ["m2", "m1"] })]) {
      const r = receive(current, letter("m1"));
      expect(r.presentation).toEqual({ showBanner: true, showList: true, playSound: true, vibrate: true });
      expect(r.vibrate).toHaveBeenCalledTimes(1);
      expect(r.refreshUnread).toHaveBeenCalledTimes(1);
    }
  });

  it("écran fixe déjà ouvert : tout supprimé ; autre écran : tout conservé", () => {
    for (const [path, data] of [["/admin-messages", { type: "ADMIN_MESSAGE" }], ["/security", { type: "SECURITY_ALERT" }], ["/journal", { route: "/journal" }], ["/salon/s1", { type: "MAGIE_RECEIVED", salonId: "s1" }]] as const) {
      const same = receive(loc(path), data);
      expect(same.vibrate, path).not.toHaveBeenCalled();
      expect(same.presentation.playSound, path).toBe(false);
      expect(same.refreshUnread, path).toHaveBeenCalledTimes(1);
    }
    const other = receive(loc("/letters"), { type: "ADMIN_MESSAGE" });
    expect(other.presentation.showBanner).toBe(true);
    expect(other.vibrate).toHaveBeenCalledTimes(1);
  });

  it("réglages respectés quand la notification est visible : son coupé / vibration coupée", () => {
    const quiet = receive(loc("/letters"), letter("m1"), { sound: false, vibration: false });
    expect(quiet.presentation).toEqual({ showBanner: true, showList: true, playSound: false, vibrate: false });
    expect(quiet.vibrate).not.toHaveBeenCalled();
    expect(quiet.refreshUnread).toHaveBeenCalledTimes(1);
    const soundOnly = foregroundPresentation(loc("/letters"), letter("m1"), { sound: true, vibration: false }, "inactive");
    expect(soundOnly).toMatchObject({ playSound: true, vibrate: false });
  });

  it("écran inconnu, repli ou charge inconnue : jamais masqué", () => {
    for (const data of [null, undefined, "x", { type: "INCONNU" }, { type: "LETTER_RECEIVED" }]) {
      const r = receive(loc("/notifications"), data);
      expect(r.presentation.showBanner, JSON.stringify(data)).toBe(true);
      expect(r.vibrate).toHaveBeenCalledTimes(1);
    }
    expect(receive(null, letter("m1")).presentation.vibrate).toBe(true);
  });

  it("le compteur est actualisé même si la vibration lève une erreur", () => {
    const refreshUnread = vi.fn();
    expect(() => onForegroundNotification({ current: loc("/letters"), data: letter("m1"), prefs, appState: "inactive", vibrate: () => { throw new Error("haptique"); }, refreshUnread })).toThrow("haptique");
    expect(refreshUnread).toHaveBeenCalledTimes(1);
  });

  it("rafale de notifications de deux correspondances pendant la consultation de m1 : seules celles de m1 sont masquées", () => {
    const current = loc("/(tabs)/letters", { matchId: "m1" });
    const shown = ["m1", "m2", "m1", "m3", "m1"].map((id) => receive(current, letter(id)).presentation.showBanner);
    expect(shown).toEqual([false, true, false, true, false]);
  });

  it("routeToLocation / isAlreadyAtRoute", () => {
    expect(routeToLocation("/(tabs)/letters?matchId=m1")).toEqual({ pathname: "/(tabs)/letters", params: { matchId: "m1" } });
    expect(routeToLocation("/security")).toEqual({ pathname: "/security", params: {} });
    expect(isAlreadyAtRoute(loc("/(tabs)/letters", { matchId: "m1" }), "/(tabs)/letters?matchId=m1")).toBe(true);
    expect(isAlreadyAtRoute(loc("/(tabs)/letters", { matchId: "m2" }), "/(tabs)/letters?matchId=m1")).toBe(false);
    expect(isAlreadyAtRoute(loc("/notifications"), "/notifications")).toBe(true);
    expect(isAlreadyAtRoute(loc("/notifications/"), "/notifications")).toBe(true);
    expect(isAlreadyAtRoute(null, "/security")).toBe(false);
    expect(isAlreadyAtRoute(loc("/letters"), "/security")).toBe(false);
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
    expect(await prepareDestinationWith(match("m1"), { hasMatch: () => true, refreshMatches: refresh, timeoutMs: 50 })).toBe("/(tabs)/letters?matchId=m1");
    expect(refresh).not.toHaveBeenCalled();
  });
  it("nouveau match absent du magasin : rechargé, puis ouvert", async () => {
    const known = new Set<string>();
    const refresh = vi.fn(async () => { known.add("m1"); });
    expect(await prepareDestinationWith(match("m1"), { hasMatch: (id) => known.has(id), refreshMatches: refresh, timeoutMs: 50 })).toBe("/(tabs)/letters?matchId=m1");
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
    expect(nav).toHaveBeenCalledWith("/(tabs)/letters?matchId=m1");
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
    expect(discard).toHaveBeenCalledWith("unauthenticated", expect.anything());
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
    expect(discard).toHaveBeenCalledWith("duplicate", expect.anything());
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
    expect(discard).toHaveBeenCalledWith("expired", expect.anything());
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
    n.onResponse(resp("n1", { type: "LETTER_RECEIVED", matchId: "m1" }));
    await tick();
    expect(nav).toHaveBeenCalledWith(PUSH_FALLBACK_ROUTE);
  });

  it("préparation qui échoue : repli, jamais d'exception", async () => {
    const n = make({ prepare: async () => { throw new Error("x"); } });
    n.update(ready());
    n.onResponse(resp("n1", { type: "LETTER_RECEIVED", matchId: "m1" }));
    await tick();
    expect(nav).toHaveBeenCalledWith(PUSH_FALLBACK_ROUTE);
  });

  it("déconnexion PENDANT la préparation : aucune navigation", async () => {
    let release!: (r: string) => void;
    const n = make({ prepare: () => new Promise<string>((r) => { release = r; }) });
    n.update(ready());
    n.onResponse(resp("n1", { type: "LETTER_RECEIVED", matchId: "m1" }));
    await tick();
    n.update(ready("unauthenticated"));
    release("/(tabs)/letters?matchId=m1");
    await tick();
    expect(nav).not.toHaveBeenCalled();
  });

  it("nouvelle notification pendant la préparation d'une autre : les deux sont ouvertes, dans l'ordre", async () => {
    let release!: (r: string) => void;
    let first = true;
    const n = make({ prepare: (d: PushDestination) => (first && d.kind === "match" ? ((first = false), new Promise<string>((r) => { release = r; })) : Promise.resolve(d.route)) });
    n.update(ready());
    n.onResponse(resp("n1", { type: "LETTER_RECEIVED", matchId: "m1" }));
    await tick();
    n.onResponse(resp("n2", { type: "SECURITY_ALERT" }));
    release("/(tabs)/letters?matchId=m1");
    await tick(); await tick();
    expect(nav.mock.calls.map((c) => c[0])).toEqual(["/(tabs)/letters?matchId=m1", "/security"]);
  });

  it("mises à jour d'état répétées : une seule navigation", async () => {
    const n = make();
    n.onResponse(resp("n1", { type: "SECURITY_ALERT" }));
    for (let i = 0; i < 5; i++) n.update(ready());
    await tick();
    expect(nav).toHaveBeenCalledTimes(1);
  });
});

describe("appuis concurrents : file ordonnée, rien n'est écrasé", () => {
  let nav: ReturnType<typeof vi.fn>;
  let consume: ReturnType<typeof vi.fn>;
  let discard: ReturnType<typeof vi.fn>;
  let clock = 5_000_000;
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const flush = async () => { for (let i = 0; i < 6; i++) await tick(); };
  const m = (id: string, notif: string) => resp(notif, { type: "LETTER_RECEIVED", matchId: id });
  const route = (id: string) => `/(tabs)/letters?matchId=${id}`;
  /** `prepare` pilotable : chaque destination attend qu'on la libère. */
  function gatedPrepare() {
    const gates = new Map<string, () => void>();
    const prepare = (d: PushDestination) => new Promise<string>((resolve) => { gates.set(d.route, () => resolve(d.route)); });
    return { prepare, release: (r: string) => gates.get(r)?.(), has: (r: string) => gates.has(r) };
  }
  const make = (over: Record<string, unknown> = {}) =>
    createPushNavigator({ navigate: nav as never, consume: consume as never, onDiscard: discard as never, defaultActionId: DEFAULT, now: () => clock, ...over });
  const active = { auth: "authenticated" as PushAuthState, navReady: true, sessionKey: "u1" };
  const reasons = () => discard.mock.calls.map((c) => c[0] as PushDiscardReason);

  beforeEach(() => { nav = vi.fn(); consume = vi.fn(); discard = vi.fn(); clock = 5_000_000; });

  it("trois appuis distincts pendant le rechargement de la première : les trois sont ouverts, dans l'ordre", async () => {
    const g = gatedPrepare();
    const n = make({ prepare: g.prepare });
    n.update(active);
    n.onResponse(m("m1", "A"));
    await tick();
    n.onResponse(m("m2", "B"));
    n.onResponse(m("m3", "C"));
    expect(n.pendingCount()).toBe(3);
    g.release(route("m1")); await flush();
    g.release(route("m2")); await flush();
    g.release(route("m3")); await flush();
    expect(nav.mock.calls.map((c) => c[0])).toEqual([route("m1"), route("m2"), route("m3")]);
    expect(n.pendingCount()).toBe(0);
  });

  it("l'ordre des appuis est conservé même si la seconde préparation est prête avant la première", async () => {
    const g = gatedPrepare();
    const n = make({ prepare: g.prepare });
    n.update(active);
    n.onResponse(m("m1", "A"));
    n.onResponse(m("m2", "B"));
    await tick();
    expect(g.has(route("m2"))).toBe(false); // la seconde n'est préparée qu'après la première
    g.release(route("m1")); await flush();
    g.release(route("m2")); await flush();
    expect(nav.mock.calls.map((c) => c[0])).toEqual([route("m1"), route("m2")]);
  });

  it("DÉMARRAGE À FROID : dernière réponse + appui reçu avant la session → les deux ouverts, dans l'ordre", async () => {
    const n = make();
    n.onResponse(m("m1", "X"));
    n.onResponse(m("m2", "Y"));
    n.update({ auth: "unknown", navReady: false });
    expect(nav).not.toHaveBeenCalled();
    n.update({ auth: "authenticated", navReady: false, sessionKey: "u1" });
    await flush();
    expect(nav).not.toHaveBeenCalled();
    n.update(active);
    await flush();
    expect(nav.mock.calls.map((c) => c[0])).toEqual([route("m1"), route("m2")]);
  });

  it("deux lettres de la MÊME correspondance : une seule ouverture (pas de double navigation)", async () => {
    const n = make();
    n.update(active);
    n.onResponse(m("m1", "A"));
    n.onResponse(m("m1", "B"));
    n.onResponse(m("m1", "C"));
    await flush();
    expect(nav.mock.calls.map((c) => c[0])).toEqual([route("m1")]);
    expect(reasons().filter((r) => r === "same-destination")).toHaveLength(2);
  });

  it("l'utilisateur est déjà sur la destination : aucune réouverture", async () => {
    const n = make({ isAtRoute: (r: string) => r === route("m1") });
    n.update(active);
    n.onResponse(m("m1", "A"));
    n.onResponse(m("m2", "B"));
    await flush();
    expect(nav.mock.calls.map((c) => c[0])).toEqual([route("m2")]);
    expect(reasons()).toContain("already-there");
  });

  it("même destination rouverte plus tard (après la fenêtre) : de nouveau acceptée", async () => {
    const n = make();
    n.update(active);
    n.onResponse(m("m1", "A"));
    await flush();
    clock += 6_000;
    n.onResponse(m("m1", "B"));
    await flush();
    expect(nav).toHaveBeenCalledTimes(2);
  });

  it("même appui reçu pendant sa préparation (écouteur + dernière réponse) : un seul traitement", async () => {
    const g = gatedPrepare();
    const n = make({ prepare: g.prepare });
    n.update(active);
    n.onResponse(m("m1", "A"));
    await tick();
    n.onResponse(m("m1", "A"));
    n.onResponse(m("m1", "A"));
    expect(n.pendingCount()).toBe(1);
    g.release(route("m1")); await flush();
    expect(nav).toHaveBeenCalledTimes(1);
    expect(reasons().filter((r) => r === "duplicate")).toHaveLength(2);
  });

  it("file saturée : les plus anciens sont abandonnés explicitement, jamais en silence", async () => {
    const g = gatedPrepare();
    const n = make({ prepare: g.prepare, maxQueue: 3 });
    n.update(active);
    ["m1", "m2", "m3", "m4", "m5"].forEach((id, i) => n.onResponse(m(id, `N${i}`)));
    await tick();
    expect(reasons().filter((r) => r === "overflow")).toHaveLength(2);
    // L'ouverture en cours de préparation (m1) est conservée ; les plus anciennes EN ATTENTE sont abandonnées.
    expect(discard.mock.calls.filter((c) => c[0] === "overflow").map((c) => c[1])).toEqual(["N1", "N2"]);
    for (const id of ["m1", "m4", "m5"]) { g.release(route(id)); await flush(); }
    expect(nav.mock.calls.map((c) => c[0])).toEqual([route("m1"), route("m4"), route("m5")]);
  });

  it("DÉCONNEXION pendant la préparation de la première : ni elle ni les suivantes ne s'ouvrent", async () => {
    const g = gatedPrepare();
    const n = make({ prepare: g.prepare });
    n.update(active);
    n.onResponse(m("m1", "A"));
    n.onResponse(m("m2", "B"));
    n.onResponse(m("m3", "C"));
    await tick();
    n.update({ auth: "unauthenticated", navReady: true, sessionKey: null });
    g.release(route("m1")); await flush();
    expect(nav).not.toHaveBeenCalled();
    expect(n.pendingCount()).toBe(0);
    // Reconnexion ensuite : rien n'est rejoué.
    n.update(active);
    await flush();
    expect(nav).not.toHaveBeenCalled();
    expect(consume).toHaveBeenCalled();
  });

  it("déconnexion puis reconnexion RAPIDE (même compte ou autre) pendant la préparation : l'ancienne ouverture est abandonnée", async () => {
    const g = gatedPrepare();
    const n = make({ prepare: g.prepare });
    n.update(active);
    n.onResponse(m("m1", "A"));
    await tick();
    n.update({ auth: "unauthenticated", navReady: true, sessionKey: null });
    n.update({ auth: "authenticated", navReady: true, sessionKey: "u2" });
    g.release(route("m1")); await flush();
    expect(nav).not.toHaveBeenCalled();
  });

  it("déconnexion puis reconnexion RAPIDE avec plusieurs appuis en file : aucune ouverture de l'ancienne session, même pour les suivants", async () => {
    const g = gatedPrepare();
    const n = make({ prepare: g.prepare });
    n.update(active);
    n.onResponse(m("m1", "A"));
    n.onResponse(m("m2", "B"));
    n.onResponse(m("m3", "C"));
    await tick();
    n.update({ auth: "unauthenticated", navReady: true, sessionKey: null });
    n.update({ auth: "authenticated", navReady: true, sessionKey: "u2" });
    expect(n.pendingCount()).toBe(0); // la file de l'ancienne session est vidée immédiatement
    g.release(route("m1")); await flush();
    g.release(route("m2")); g.release(route("m3")); await flush();
    expect(nav).not.toHaveBeenCalled();
    expect(discard.mock.calls.map((c) => c[1]).sort()).toEqual(["A", "B", "C"]);
  });

  it("changement direct de compte (identité connue → autre) : file abandonnée ; une clé qui apparaît après la connexion n'abandonne rien", async () => {
    const g = gatedPrepare();
    const n = make({ prepare: g.prepare });
    n.update({ auth: "authenticated", navReady: true, sessionKey: null });
    n.onResponse(m("m1", "A"));
    await tick();
    n.update({ auth: "authenticated", navReady: true, sessionKey: "u1" }); // clé qui apparaît : pas un changement
    g.release(route("m1")); await flush();
    expect(nav).toHaveBeenCalledTimes(1);

    nav.mockClear();
    n.onResponse(m("m2", "B"));
    await tick();
    n.update({ auth: "authenticated", navReady: true, sessionKey: "u2" }); // autre compte
    g.release(route("m2")); await flush();
    expect(nav).not.toHaveBeenCalled();
    expect(reasons()).toContain("session-changed");
  });

  it("un appui reçu APRÈS la reconnexion est traité normalement", async () => {
    const g = gatedPrepare();
    const n = make({ prepare: g.prepare });
    n.update(active);
    n.onResponse(m("m1", "A"));
    await tick();
    n.update({ auth: "unauthenticated", navReady: true, sessionKey: null });
    n.update({ auth: "authenticated", navReady: true, sessionKey: "u2" });
    g.release(route("m1")); await flush();
    n.onResponse(m("m2", "B"));
    await tick();
    g.release(route("m2")); await flush();
    expect(nav.mock.calls.map((c) => c[0])).toEqual([route("m2")]);
  });

  it("démarrage à froid sans session avec plusieurs appuis : tous abandonnés, aucun rejeu après connexion", async () => {
    const n = make();
    n.onResponse(m("m1", "X"));
    n.onResponse(m("m2", "Y"));
    n.update({ auth: "unauthenticated", navReady: true, sessionKey: null });
    await flush();
    expect(nav).not.toHaveBeenCalled();
    expect(reasons().filter((r) => r === "unauthenticated")).toHaveLength(2);
    n.update(active);
    await flush();
    expect(nav).not.toHaveBeenCalled();
  });

  it("attente périmée : seule l'ouverture trop ancienne est abandonnée, la plus récente est ouverte", async () => {
    const n = make();
    n.onResponse(m("m1", "A"));
    clock += 61_000;
    n.onResponse(m("m2", "B"));
    n.update(active);
    await flush();
    expect(nav.mock.calls.map((c) => c[0])).toEqual([route("m2")]);
    expect(reasons()).toContain("expired");
  });

  it("préparation qui échoue pour la première : repli pour elle, la seconde est tout de même ouverte", async () => {
    let first = true;
    const n = make({ prepare: async (d: PushDestination) => { if (first) { first = false; throw new Error("x"); } return d.route; } });
    n.update(active);
    n.onResponse(m("m1", "A"));
    n.onResponse(m("m2", "B"));
    await flush();
    expect(nav.mock.calls.map((c) => c[0])).toEqual([PUSH_FALLBACK_ROUTE, route("m2")]);
  });

  it("routeur indisponible en cours de route : rien n'est perdu, reprise quand il est prêt", async () => {
    const g = gatedPrepare();
    const n = make({ prepare: g.prepare });
    n.update(active);
    n.onResponse(m("m1", "A"));
    n.onResponse(m("m2", "B"));
    await tick();
    n.update({ ...active, navReady: false });
    g.release(route("m1")); await flush();
    expect(nav).not.toHaveBeenCalled();
    expect(n.pendingCount()).toBe(2);
    n.update(active);
    await tick();
    g.release(route("m1")); await flush();
    g.release(route("m2")); await flush();
    expect(nav.mock.calls.map((c) => c[0])).toEqual([route("m1"), route("m2")]);
  });

  it("appuis distincts mélangés avec des écrans fixes : tous ouverts dans l'ordre d'arrivée", async () => {
    const n = make();
    n.update(active);
    n.onResponse(resp("A", { type: "SECURITY_ALERT" }));
    n.onResponse(m("m1", "B"));
    n.onResponse(resp("C", { type: "ADMIN_MESSAGE" }));
    await flush();
    expect(nav.mock.calls.map((c) => c[0])).toEqual(["/security", route("m1"), "/admin-messages"]);
  });
});

it("annonce de match : application ouverte → aucune bannière ni vibration en plus (annonce dans l'application) ; sans identifiant exploitable → notification interne comme les autres", () => {
  const current = { pathname: "/discover" };
  const prefs = { sound: true, vibration: true };
  expect(foregroundPresentation(current, { type: "MATCH_CREATED", matchId: "m1" }, prefs)).toEqual({
    showBanner: false, showList: false, playSound: false, vibrate: false,
  });
  expect(foregroundPresentation(current, { type: "MATCH_CREATED" }, prefs)).toEqual({ showBanner: false, showList: false, playSound: false, vibrate: true });
  expect(foregroundPresentation(current, { type: "MATCH_CREATED" }, prefs, "inactive").showBanner).toBe(true);
});

// ============================================================
// Refuge : application ouverte (notification interne) ou en arrière-plan (push) — tous les types, même règle
// ============================================================
describe("Refuge : redirection et présentation des notifications", () => {
  const REFUGE_TYPES = [
    "REFUGE_ADOPTED", "REFUGE_CHOICE_READY", "REFUGE_RESULT_READY", "REFUGE_DAY_RESULT", "REFUGE_NEW_DAY",
    "REFUGE_COINS", "REFUGE_REVEAL_PHASE", "REFUGE_REVEALED", "REFUGE_REVEAL_REFUSED", "REFUGE_EXPIRED", "REFUGE_ATTENTION", "REFUGE_ADOPTION_CONFIRMED", "REFUGE_FINAL_REPORT",
  ];
  const prefs = { sound: true, vibration: true };
  const loc = (pathname: string) => ({ pathname });

  it.each(REFUGE_TYPES)("%s : l'appui (push ou cloche) ouvre LE Refuge concerné ; sans identifiant valide → /refuge", (type) => {
    expect(resolvePushDestination({ type, refugeSessionId: "r1" }).route).toBe("/refuge/r1");
    expect(getNotificationTarget({ id: "n", type, message: "m", meta: { refugeSessionId: "r1" }, isRead: false, readAt: null, createdAt: "2026-11-26T00:00:00Z" } as never)).toBe("/refuge/r1");
    expect(resolvePushDestination({ type, refugeSessionId: "../x" }).route).toBe("/refuge");
  });

  it.each(REFUGE_TYPES)("%s : application ouverte → notification INTERNE uniquement (ni bannière, ni son) ; compteur toujours rafraîchi", (type) => {
    const data = { type, refugeSessionId: "r1" };
    for (const where of ["/(tabs)/letters", "/refuge/r1", "/refuge/autre", "/"]) {
      expect(foregroundPresentation(loc(where), data, prefs, "active"), where).toMatchObject({ showBanner: false, showList: false, playSound: false });
    }
    const refreshUnread = vi.fn();
    onForegroundNotification({ current: loc("/refuge/r1"), data, prefs, appState: "active", vibrate: vi.fn(), refreshUnread });
    expect(refreshUnread).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// RÈGLE POUR TOUT JEUTAIME : application ouverte → notification interne uniquement
// ============================================================
import { NotificationType } from "@prisma/client";

describe("application ouverte : notification interne uniquement, pour TOUS les types de JeuTaime", () => {
  const ALL = Object.values(NotificationType);
  const prefs = { sound: true, vibration: true };
  const loc = (pathname: string, params: Record<string, string> = {}) => ({ pathname, params });
  const dataFor = (type: string) => ({ type, matchId: "m1", refugeSessionId: "r1", duelId: "d1", bottleId: "b1" });

  it("couvre tous les types connus du serveur (au moins 30)", () => {
    expect(ALL.length).toBeGreaterThanOrEqual(30);
  });

  it.each(ALL)("%s : « active » → ni bannière, ni liste système, ni son, quel que soit l'écran affiché", (type) => {
    for (const current of [null, loc("/"), loc("/(tabs)/letters", { matchId: "m1" }), loc("/refuge/r1"), loc("/notifications")]) {
      const p = foregroundPresentation(current, dataFor(type), prefs, "active");
      expect(p.showBanner, `${type} ${current?.pathname}`).toBe(false);
      expect(p.showList, `${type} ${current?.pathname}`).toBe(false);
      expect(p.playSound, `${type} ${current?.pathname}`).toBe(false);
    }
  });

  it.each(ALL)("%s : « active » → le compteur de la cloche est toujours actualisé", (type) => {
    const refreshUnread = vi.fn();
    onForegroundNotification({ current: loc("/"), data: dataFor(type), prefs, appState: "active", vibrate: vi.fn(), refreshUnread });
    expect(refreshUnread).toHaveBeenCalledTimes(1);
  });

  it("état par défaut = « active » (jamais de bannière par oubli de paramètre)", () => {
    expect(foregroundPresentation(loc("/"), { type: "LETTER_RECEIVED", matchId: "m1" }, prefs)).toMatchObject({ showBanner: false, showList: false, playSound: false });
  });

  it("vibration légère de l'application : selon le réglage, et jamais si l'écran concerné est déjà ouvert", () => {
    expect(foregroundPresentation(loc("/"), { type: "LETTER_RECEIVED", matchId: "m1" }, prefs, "active").vibrate).toBe(true);
    expect(foregroundPresentation(loc("/"), { type: "LETTER_RECEIVED", matchId: "m1" }, { sound: true, vibration: false }, "active").vibrate).toBe(false);
    expect(foregroundPresentation(loc("/(tabs)/letters", { matchId: "m1" }), { type: "LETTER_RECEIVED", matchId: "m1" }, prefs, "active").vibrate).toBe(false);
  });

  it.each(["inactive", "background", "unknown", "extension"])("état « %s » (pas ouverte) : présentation système conservée (bannière + son selon les réglages)", (state) => {
    for (const type of ["LETTER_RECEIVED", "REFUGE_ADOPTED", "DUEL_RECEIVED", "SECURITY_ALERT"]) {
      expect(foregroundPresentation(loc("/"), dataFor(type), prefs, state), `${type} ${state}`).toEqual({ showBanner: true, showList: true, playSound: true, vibrate: true });
    }
    expect(foregroundPresentation(loc("/"), { type: "LETTER_RECEIVED" }, { sound: false, vibration: false }, state)).toMatchObject({ playSound: false, vibrate: false });
  });

  it("annonce de match : jamais de bannière application ouverte (annonce dans l'application) ; montrée si l'application n'est pas active", () => {
    const match = { type: "MATCH_CREATED", matchId: "m1" };
    expect(foregroundPresentation(loc("/"), match, prefs, "active").showBanner).toBe(false);
    expect(foregroundPresentation(loc("/"), match, prefs, "inactive").showBanner).toBe(true);
    expect(foregroundPresentation(loc("/(tabs)/letters", { matchId: "m1" }), match, prefs, "inactive").showBanner).toBe(true);
  });
});

describe("diagnostic des notifications : notification de test", () => {
  const prefs = { sound: true, vibration: true };
  it("l'appui sur la notification de test ouvre l'écran de diagnostic", () => {
    expect(resolvePushDestination({ type: "PUSH_TEST" }).route).toBe("/notification-diagnostics");
    expect(resolvePushDestination({ type: "PUSH_TEST", refugeSessionId: "r1" }).route).toBe("/notification-diagnostics");
  });
  it("exception voulue : le test s'affiche même application ouverte ; aucune autre notification n'est concernée", () => {
    expect(foregroundPresentation({ pathname: "/" }, { type: "PUSH_TEST" }, prefs, "active")).toEqual({ showBanner: true, showList: true, playSound: true, vibrate: false });
    expect(foregroundPresentation({ pathname: "/" }, { type: "PUSH_TEST" }, { sound: false, vibration: true }, "active").playSound).toBe(false);
    for (const type of ["LETTER_RECEIVED", "REFUGE_ADOPTED", "DUEL_RECEIVED", "PUSH_TESTS", "push_test"]) {
      expect(foregroundPresentation({ pathname: "/" }, { type }, prefs, "active").showBanner, type).toBe(false);
    }
  });
});
