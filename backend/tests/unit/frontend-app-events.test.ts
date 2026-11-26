import { describe, expect, it, vi } from "vitest";
import { NotificationType } from "@prisma/client";
import {
  EVENT_POLICIES, MAX_QUEUED_EVENTS, MAX_SEEN_EVENTS, buildEventDialog, createEventQueue, policyFor, presentability, selectEventsToPresent,
  type EventDialogModel,
} from "../../../frontend/src/data/appEvents";
import { createEventsRuntime } from "../../../frontend/src/utils/appEventsRuntime";
import { categoryFor, hasPngIcon } from "../../../frontend/src/utils/notificationsView";
import { getNotificationTarget } from "../../../frontend/src/utils/notifications";
import { foregroundPresentation } from "../../../frontend/src/utils/pushNavigation";
import { buildNotificationMessage } from "../../src/policies/notifications";

/**
 * Système événementiel : fenêtre au milieu de l'écran, application ouverte, pour les événements importants.
 * Source de vérité = l'historique (id de notification) : jamais de doublon, jamais de réapparition.
 */
const ALL = Object.values(NotificationType);
const T0 = Date.parse("2026-11-26T15:00:00Z");
const note = (over: Record<string, unknown> = {}) => ({
  id: "n1", type: "LETTER_RECEIVED", message: "Tu as reçu une nouvelle lettre", meta: { matchId: "m1" }, isRead: false, readAt: null, createdAt: new Date(T0 + 1000).toISOString(), ...over,
}) as never;
const ctx = (over: Record<string, unknown> = {}) => ({ windowStartMs: T0, currentPath: "/", seen: new Set<string>(), ...over }) as never;
const memoryStore = (initial: string[] = []) => {
  let data = [...initial];
  return { load: async () => [...data], save: vi.fn(async (keys: string[]) => { data = [...keys]; }), snapshot: () => data };
};
const model = (key: string, priority = 50, createdAtMs = T0): EventDialogModel => ({
  key, type: "LETTER_RECEIVED" as never, title: "t", message: "m", pseudo: null, icon: "letter", label: "Lettres", cta: null, priority, createdAtMs,
});

describe("matrice des événements : chaque type est classé", () => {
  it.each(ALL)("%s a une règle explicite", (type) => {
    expect(policyFor(type), type).not.toBeNull();
    expect(["dialog", "history", "existing"]).toContain(EVENT_POLICIES[type as keyof typeof EVENT_POLICIES].mode);
  });

  it("aucune règle pour un type qui n'existe pas (ancien/futur serveur) : jamais de fenêtre improvisée", () => {
    expect(policyFor("TYPE_INCONNU")).toBeNull();
    expect(buildEventDialog({ id: "x", type: "TYPE_INCONNU" as never, message: "m", createdAt: new Date().toISOString() })).toBeNull();
  });

  it("répartition voulue : fenêtre pour les événements importants, historique pour le courant", () => {
    const dialog = ALL.filter((t) => EVENT_POLICIES[t as keyof typeof EVENT_POLICIES].mode === "dialog").sort();
    const hist = ALL.filter((t) => EVENT_POLICIES[t as keyof typeof EVENT_POLICIES].mode === "history").sort();
    expect(hist).toEqual(["ACCOUNT_RESTORED", "BOTTLE_REPLY", "DUEL_DECLINED", "DUEL_EXPIRED", "MAGIE_BROKEN", "PREMIUM_CANCELLED", "PREMIUM_SUBSCRIBED", "REFUGE_COINS", "REFUGE_DAY_RESULT", "REPORT_PROCESSED"]);
    expect(dialog).toEqual([
      "ADMIN_MESSAGE", "BOTTLE_REVEAL_ACCEPTED", "BOTTLE_REVEAL_REFUSED", "BOTTLE_REVEAL_REQUEST", "DUEL_RECEIVED", "DUEL_RESULT", "LETTER_RECEIVED",
      "MAGIE_RECEIVED", "OFFERING_RECEIVED", "PRIVATE_SALON_INVITE", "QUESTIONS_FAILED", "QUESTIONS_PASSED", "QUESTIONS_TURN", "REFUGE_ADOPTED",
      "REFUGE_CHOICE_READY", "REFUGE_EXPIRED", "REFUGE_NEW_DAY", "REFUGE_RESULT_READY", "REFUGE_REVEALED", "REFUGE_REVEAL_PHASE", "REFUGE_REVEAL_REFUSED",
      "SECURITY_ALERT",
    ].sort());
  });

  it("l'annonce de match EXISTANTE est conservée : aucune fenêtre en doublon pour MATCH_CREATED", () => {
    expect(EVENT_POLICIES.MATCH_CREATED.mode).toBe("existing");
    expect(buildEventDialog({ id: "m", type: "MATCH_CREATED", message: "Vos sourires sont réciproques", createdAt: new Date().toISOString() })).toBeNull();
  });
});

describe("fenêtre : contenu, bouton d'accès, anonymat", () => {
  const dialogTypes = ALL.filter((t) => EVENT_POLICIES[t as keyof typeof EVENT_POLICIES].mode === "dialog");

  it.each(dialogTypes)("%s : titre, message du serveur, illustration de la fonctionnalité", (type) => {
    const m = buildEventDialog({ id: "n", type, message: buildNotificationMessage(type), createdAt: new Date(T0).toISOString() }, { route: "/x" })!;
    expect(m.title.length).toBeGreaterThan(3);
    expect(m.message).toBe(buildNotificationMessage(type));
    expect(m.icon).toBe(categoryFor(type).icon); // même illustration que l'historique
    expect(m.label).toBe(categoryFor(type).label);
  });

  it("illustrations PNG pour les fonctionnalités qui en ont (Rencontres, Lettres, Bouteilles, Duels, Offrandes, Refuge)", () => {
    for (const type of ["QUESTIONS_TURN", "LETTER_RECEIVED", "BOTTLE_REVEAL_REQUEST", "DUEL_RECEIVED", "OFFERING_RECEIVED", "REFUGE_ADOPTED"]) {
      expect(hasPngIcon(categoryFor(type).icon), type).toBe(true);
    }
  });

  it("bouton d'accès : présent seulement avec un libellé ET une destination valide", () => {
    const base = { id: "n", type: "LETTER_RECEIVED" as never, message: "m", createdAt: new Date(T0).toISOString() };
    expect(buildEventDialog(base, { route: "/(tabs)/letters?matchId=m1" })!.cta).toEqual({ label: "Lire la lettre", route: "/(tabs)/letters?matchId=m1" });
    for (const bad of [null, undefined, "", "https://evil.example", "letters"]) expect(buildEventDialog(base, { route: bad as never })!.cta).toBeNull();
    // Types sans bouton prévu : fermeture seulement.
    expect(buildEventDialog({ ...base, type: "QUESTIONS_FAILED" as never }, { route: "/x" })!.cta).toBeNull();
    expect(buildEventDialog({ ...base, type: "REFUGE_EXPIRED" as never }, { route: "/x" })!.cta).toBeNull();
  });

  it("chaque type à bouton a une destination avec ses identifiants (le bouton mène à la bonne fonctionnalité)", () => {
    const meta = { matchId: "m1", bottleId: "b1", duelId: "d1", refugeSessionId: "r1", salonId: "s1" };
    for (const type of dialogTypes.filter((t) => EVENT_POLICIES[t as keyof typeof EVENT_POLICIES].cta)) {
      const route = getNotificationTarget({ id: "n", type, message: "m", meta, isRead: false, readAt: null, createdAt: new Date().toISOString() } as never);
      expect(route, `${type} doit mener quelque part`).not.toBeNull();
    }
    expect(getNotificationTarget({ type: "REFUGE_RESULT_READY", meta: { refugeSessionId: "r1" } } as never)).toBe("/refuge/r1");
  });

  it("le titre ne répète jamais le début du message (pas de redite dans la fenêtre)", () => {
    for (const type of dialogTypes) {
      const m = buildEventDialog({ id: "n", type, message: buildNotificationMessage(type as never, { sponsorGender: "HOMME" }), createdAt: new Date(T0).toISOString() })!;
      const norm = (x: string) => x.toLowerCase().replace(/[^a-zà-ÿ0-9 ]/g, "").trim();
      expect(norm(m.message).startsWith(norm(m.title)), `${type} : « ${m.title} » / « ${m.message} »`).toBe(false);
    }
  });

  it("pseudo de la personne : affiché pour les rencontres, lettres, duels… (nettoyé, borné)", () => {
    const m = buildEventDialog({ id: "n", type: "LETTER_RECEIVED" as never, message: "m", createdAt: new Date(T0).toISOString() }, { pseudo: "  testuser9  " });
    expect(m!.pseudo).toBe("testuser9");
    expect(buildEventDialog({ id: "n", type: "LETTER_RECEIVED" as never, message: "m", createdAt: new Date(T0).toISOString() }, { pseudo: "x".repeat(100) })!.pseudo!.length).toBe(30);
    expect(buildEventDialog({ id: "n", type: "LETTER_RECEIVED" as never, message: "m", createdAt: new Date(T0).toISOString() }, { pseudo: "   " })!.pseudo).toBeNull();
  });

  it("ANONYMAT : jamais de pseudo pour les bouteilles ni pour le Refuge, même si l'appelant en fournit un", () => {
    const anonymous = ALL.filter((t) => t.startsWith("BOTTLE_") || t.startsWith("REFUGE_")).filter((t) => EVENT_POLICIES[t as keyof typeof EVENT_POLICIES].mode === "dialog");
    expect(anonymous.length).toBeGreaterThanOrEqual(11);
    for (const type of anonymous) {
      const m = buildEventDialog({ id: "n", type, message: buildNotificationMessage(type), createdAt: new Date(T0).toISOString() }, { pseudo: "Alice-secret" });
      expect(m!.pseudo, type).toBeNull();
      expect(JSON.stringify(m), type).not.toContain("Alice-secret");
    }
  });

  it("DÉVOILEMENT : aucun texte de fenêtre du Refuge ne nomme une action ni un pseudo ; titres sans « gestes »", () => {
    for (const type of ALL.filter((t) => t.startsWith("REFUGE_"))) {
      const policy = EVENT_POLICIES[type as keyof typeof EVENT_POLICIES];
      if (policy.mode !== "dialog") continue;
      const m = buildEventDialog({ id: "n", type, message: buildNotificationMessage(type as never, { sponsorGender: "FEMME", refugeScore: 1, coinsDelta: 5 }), createdAt: new Date(T0).toISOString() })!;
      expect(`${m.title} ${m.message} ${m.cta?.label ?? ""}`, type).not.toMatch(/nourrir|caresser|câliner|laver|jouer|geste|\d\/2/i);
    }
  });
});

describe("quand une fenêtre est admise", () => {
  it("non lue, récente, jamais vue, écran non concerné : admise", () => {
    expect(presentability(note(), ctx())).toEqual({ ok: true });
  });
  it.each([
    ["lue (déjà consultée dans l'historique)", note({ isRead: true }), ctx(), "read"],
    ["déjà présentée", note(), ctx({ seen: new Set(["n1"]) }), "seen"],
    ["arrivée AVANT cette session (push déjà montré, ou dans l'historique)", note({ createdAt: new Date(T0 - 60_000).toISOString() }), ctx(), "before-session"],
    ["historique seulement", note({ type: "BOTTLE_REPLY" }), ctx(), "not-dialog"],
    ["date illisible", note({ createdAt: "pas une date" }), ctx(), "invalid"],
    ["identifiant manquant", note({ id: "" }), ctx(), "invalid"],
    ["lettre pendant qu'on est déjà sur les lettres", note(), ctx({ currentPath: "/(tabs)/letters" }), "viewing"],
    ["idem, chemin affiché sans le groupe « (tabs) »", note(), ctx({ currentPath: "/letters" }), "viewing"],
    ["résultat du Refuge pendant qu'on est sur ce Refuge", note({ type: "REFUGE_RESULT_READY" }), ctx({ currentPath: "/refuge/r1" }), "viewing"],
    ["sort pendant qu'on est dans le salon", note({ type: "MAGIE_RECEIVED" }), ctx({ currentPath: "/salon/s1" }), "viewing"],
  ])("refusée : %s", (_label, n, c, reason) => {
    expect(presentability(n, c)).toEqual({ ok: false, reason });
  });
  it("marge d'horloge de 5 s entre l'appareil et le serveur", () => {
    expect(presentability(note({ createdAt: new Date(T0 - 4000).toISOString() }), ctx()).ok).toBe(true);
    expect(presentability(note({ createdAt: new Date(T0 - 6000).toISOString() }), ctx()).ok).toBe(false);
  });
  it("sélection d'une page d'historique : fenêtres retenues, écran déjà ouvert et annonce de match marqués « vus » sans fenêtre", () => {
    const items = [
      note({ id: "a", type: "QUESTIONS_TURN" }), note({ id: "b", type: "MATCH_CREATED" }), note({ id: "c", type: "BOTTLE_REPLY" }),
      note({ id: "d", type: "REFUGE_RESULT_READY" }), note({ id: "e", type: "LETTER_RECEIVED", isRead: true }),
    ];
    const out = selectEventsToPresent(items, ctx({ currentPath: "/refuge/r1" }), { pseudoOf: () => "Bastien", routeOf: () => "/x" });
    expect(out.models.map((m) => m.key)).toEqual(["a"]);
    expect(out.models[0]!.pseudo).toBe("Bastien");
    expect(out.markSeen.sort()).toEqual(["b", "d"]); // match déjà annoncé par l'alerte existante ; Refuge déjà à l'écran
  });
});

describe("file d'attente : une fenêtre à la fois, sans doublon, sans réapparition", () => {
  it("plusieurs événements simultanés : jamais superposés, présentés l'un après l'autre par priorité", async () => {
    const q = createEventQueue(memoryStore());
    q.enqueue([model("low", 30), model("high", 90), model("mid", 50)]);
    expect(q.current()!.key).toBe("high"); // une seule fenêtre à la fois
    expect(q.pending()).toBe(2);
    expect(q.dismiss()!.key).toBe("mid");
    expect(q.dismiss()!.key).toBe("low");
    expect(q.dismiss()).toBeNull();
  });
  it("même priorité : ordre d'arrivée", () => {
    const q = createEventQueue(memoryStore());
    q.enqueue([model("second", 50, T0 + 10), model("first", 50, T0)]);
    expect(q.current()!.key).toBe("first");
  });
  it("AUCUN DOUBLON : le même événement (push + hausse du compteur + relecture) n'entre qu'une fois", () => {
    const q = createEventQueue(memoryStore());
    expect(q.enqueue([model("e1")])).toBe(1);
    expect(q.enqueue([model("e1"), model("e1")])).toBe(0); // déjà affiché
    q.enqueue([model("e2")]);
    expect(q.enqueue([model("e2")])).toBe(0); // déjà en file
    expect(q.pending()).toBe(1);
  });
  it("AUCUNE RÉAPPARITION : un événement fermé ne revient pas, même ré-offert, même après un redémarrage", async () => {
    const store = memoryStore();
    const q = createEventQueue(store);
    q.enqueue([model("e1")]);
    q.dismiss();
    expect(q.enqueue([model("e1")])).toBe(0);
    expect(store.snapshot()).toEqual(["e1"]);
    const restarted = createEventQueue(store); // redémarrage de l'application
    await restarted.hydrate();
    expect(restarted.enqueue([model("e1")])).toBe(0);
    expect(restarted.enqueue([model("e2")])).toBe(1);
  });
  it("mémoire des événements vus bornée (200) : les plus anciens sont oubliés, jamais de croissance sans fin", () => {
    const store = memoryStore();
    const q = createEventQueue(store);
    q.markSeen(Array.from({ length: MAX_SEEN_EVENTS + 25 }, (_, i) => `k${i}`));
    expect(q.seenKeys().size).toBe(MAX_SEEN_EVENTS);
    expect(q.seenKeys().has("k0")).toBe(false);
    expect(q.seenKeys().has(`k${MAX_SEEN_EVENTS + 24}`)).toBe(true);
  });
  it("file bornée : une rafale ne produit jamais plus de 20 fenêtres en attente", () => {
    const q = createEventQueue(memoryStore());
    q.enqueue(Array.from({ length: 60 }, (_, i) => model(`e${i}`, 50, T0 + i)));
    expect(q.pending()).toBeLessThanOrEqual(MAX_QUEUED_EVENTS);
  });
  it("mémoire locale illisible ou en échec : on continue (le risque est une réapparition, jamais un blocage)", async () => {
    const q = createEventQueue({ load: async () => { throw new Error("corrompu"); }, save: async () => { throw new Error("plein"); } });
    await q.hydrate();
    expect(q.enqueue([model("e1")])).toBe(1);
    expect(() => q.dismiss()).not.toThrow();
  });
  it("abonné défaillant : les autres sont quand même prévenus ; déconnexion : tout est effacé", () => {
    const q = createEventQueue(memoryStore());
    const ok = vi.fn();
    q.subscribe(() => { throw new Error("écran cassé"); });
    q.subscribe(ok);
    q.enqueue([model("e1")]);
    expect(ok).toHaveBeenCalled();
    q.reset();
    expect(q.current()).toBeNull();
    expect(q.seenKeys().size).toBe(0);
  });
});

describe("moteur : signaux, regroupement, coût réseau", () => {
  function setup(items: unknown[] | (() => Promise<unknown[]>), over: Record<string, unknown> = {}) {
    const queue = createEventQueue(memoryStore());
    let clock = T0;
    const timers: Array<() => void> = [];
    const fetchLatest = vi.fn(typeof items === "function" ? items : async () => items) as never;
    const runtime = createEventsRuntime({
      queue, fetchLatest, pseudoOf: () => null, routeOf: () => "/x", currentPath: () => "/", now: () => clock,
      schedule: (fn) => { timers.push(fn); return timers.length; }, ...over,
    } as never);
    return { queue, runtime, fetchLatest: fetchLatest as unknown as ReturnType<typeof vi.fn>, advance: (ms: number) => { clock += ms; }, fire: async () => { const fns = timers.splice(0); fns.forEach((f) => f()); await Promise.resolve(); await Promise.resolve(); await new Promise((r) => setTimeout(r, 0)); } };
  }

  it("push reçu ET hausse du compteur pour le MÊME événement : UNE seule lecture, UNE seule fenêtre", async () => {
    const s = setup([note({ id: "e1", type: "QUESTIONS_TURN" })]);
    s.advance(10_000);
    s.runtime.signal();
    s.runtime.signalCountIncrease();
    s.runtime.signal();
    await s.fire();
    expect(s.fetchLatest).toHaveBeenCalledTimes(1);
    expect(s.queue.current()!.key).toBe("e1");
    expect(s.queue.pending()).toBe(0);
  });
  it("même événement relu plus tard : pas de seconde fenêtre", async () => {
    const s = setup([note({ id: "e1", type: "QUESTIONS_TURN" })]);
    s.runtime.signal(); await s.fire();
    s.queue.dismiss();
    s.runtime.signal(); await s.fire();
    expect(s.queue.current()).toBeNull();
  });
  it("hausse du compteur pendant le chargement initial de la session : ignorée (pas de lecture à chaque ouverture)", async () => {
    const s = setup([]);
    s.advance(2_000);
    s.runtime.signalCountIncrease();
    await s.fire();
    expect(s.fetchLatest).not.toHaveBeenCalled();
    s.advance(4_000);
    s.runtime.signalCountIncrease();
    await s.fire();
    expect(s.fetchLatest).toHaveBeenCalledTimes(1);
  });
  it("nouvelle session au premier plan : les événements antérieurs ne sont JAMAIS présentés (déjà montrés par un push)", async () => {
    const s = setup([note({ id: "old", type: "QUESTIONS_TURN", createdAt: new Date(T0 - 3_600_000).toISOString() })]);
    s.runtime.startSession();
    s.runtime.signal(); await s.fire();
    expect(s.queue.current()).toBeNull();
  });
  it("réseau en échec : aucune fenêtre, aucune erreur, l'historique reste la source de vérité", async () => {
    const s = setup(async () => { throw new Error("réseau"); });
    s.runtime.signal();
    await expect(s.fire()).resolves.toBeUndefined();
    expect(s.queue.current()).toBeNull();
  });
  it("écran concerné déjà ouvert : événement marqué vu, aucune fenêtre", async () => {
    const s = setup([note({ id: "e1", type: "REFUGE_RESULT_READY" })], { currentPath: () => "/refuge/r1" });
    s.runtime.signal(); await s.fire();
    expect(s.queue.current()).toBeNull();
    expect(s.queue.seenKeys().has("e1")).toBe(true);
  });
  it("annonce de match existante : jamais de fenêtre en plus, l'événement est marqué vu", async () => {
    const s = setup([note({ id: "m1", type: "MATCH_CREATED" })]);
    s.runtime.signal(); await s.fire();
    expect(s.queue.current()).toBeNull();
    expect(s.queue.seenKeys().has("m1")).toBe(true);
  });
  it("lecture légère : première page non lue seulement ; aucun sondage propre (aucun minuteur sans signal)", async () => {
    const s = setup([]);
    await s.fire();
    expect(s.fetchLatest).not.toHaveBeenCalled();
  });
});

describe("application ouverte : fenêtre OU bannière, jamais les deux", () => {
  const dialogTypes = ALL.filter((t) => EVENT_POLICIES[t as keyof typeof EVENT_POLICIES].mode === "dialog");
  it.each(dialogTypes)("%s : fenêtre événementielle, et AUCUNE bannière système application ouverte", (type) => {
    const p = foregroundPresentation({ pathname: "/" }, { type, matchId: "m1", refugeSessionId: "r1", duelId: "d1", bottleId: "b1" }, { sound: true, vibration: true }, "active");
    expect(p.showBanner).toBe(false);
    expect(p.showList).toBe(false);
    expect(p.playSound).toBe(false);
  });
});

describe("historique et cloche : catégories, icônes, intitulés", () => {
  it.each(ALL)("%s : catégorie et icône propres (jamais « Notification » avec une cloche)", (type) => {
    const c = categoryFor(type);
    expect(c.label, type).not.toBe("Notification");
    expect(c.icon, type).not.toBe("bell");
  });
  it("types du Refuge : « Refuge » avec la patte ; Rencontres : cœur ; Lettres : lettre ; Duels ; Offrandes ; Bouteilles", () => {
    for (const t of ALL.filter((x) => x.startsWith("REFUGE_"))) expect(categoryFor(t)).toEqual({ label: "Refuge", icon: "refuge" });
    expect(categoryFor("MATCH_CREATED")).toEqual({ label: "Rencontres", icon: "heart" });
    expect(categoryFor("LETTER_RECEIVED")).toEqual({ label: "Lettres", icon: "letter" });
    expect(categoryFor("DUEL_RESULT")).toEqual({ label: "Duels", icon: "duel" });
    expect(categoryFor("OFFERING_RECEIVED")).toEqual({ label: "Offrandes", icon: "gift" });
    expect(categoryFor("BOTTLE_REPLY")).toEqual({ label: "Bouteilles", icon: "bottle" });
  });
  it("type inconnu (ancien client / futur serveur) : repli sûr, sans erreur", () => {
    expect(categoryFor("INCONNU")).toEqual({ label: "Notification", icon: "bell" });
  });
});
