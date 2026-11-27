import { describe, expect, it } from "vitest";
import { isAlreadyAtRoute, resolvePushDestination } from "../../../frontend/src/utils/pushNavigation";
import { getNotificationTarget } from "../../../frontend/src/utils/notifications";
import { categoryFor, NOTIFICATION_CATEGORIES } from "../../../frontend/src/utils/notificationsView";

/**
 * Phase 2 — destinations de chaque nouvelle notification, côté application :
 * appui sur un push (resolvePushDestination) et appui dans « Mes notifications » (getNotificationTarget).
 * Les deux doivent mener au MÊME écran. Aucune route ni URL fournie par la notification n'est suivie.
 */
const note = (type: string, meta: Record<string, unknown> | null) =>
  ({ id: "n", type, message: "m", meta, isRead: false, readAt: null, createdAt: new Date().toISOString() }) as never;

const CASES: Array<[string, Record<string, unknown>, string]> = [
  ["DUEL_RECEIVED", { duelId: "d_1" }, "/duel/play?duelId=d_1"],
  ["DUEL_RESULT", { duelId: "d_1" }, "/duel/play?duelId=d_1"],
  ["DUEL_DECLINED", { duelId: "d_1" }, "/duel/play?duelId=d_1"],
  ["DUEL_EXPIRED", { duelId: "d_1" }, "/duel/play?duelId=d_1"],
  ["BOTTLE_REPLY", {}, "/bottles-main"],
  ["BOTTLE_REVEAL_REQUEST", {}, "/bottles-main"],
  ["BOTTLE_REVEAL_REFUSED", {}, "/bottles-main"],
  ["BOTTLE_REVEAL_ACCEPTED", { matchId: "m1" }, "/(tabs)/letters?matchId=m1"],
  ["QUESTIONS_TURN", { matchId: "m1" }, "/(tabs)/letters?questionsMatchId=m1"],
  ["REFUGE_ADOPTED", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REFUGE_REVEAL_PHASE", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REFUGE_REVEALED", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REFUGE_CHOICE_READY", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REFUGE_RESULT_READY", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REFUGE_DAY_RESULT", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REFUGE_NEW_DAY", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REFUGE_COINS", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REFUGE_REVEAL_REFUSED", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REFUGE_EXPIRED", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REFUGE_ATTENTION", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REFUGE_ADOPTION_CONFIRMED", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REFUGE_FINAL_REPORT", { refugeSessionId: "r1" }, "/refuge/r1"],
  ["REPORT_PROCESSED", {}, "/user-reports"],
];

describe("destinations : push et cloche mènent au même écran", () => {
  it.each(CASES)("%s", (type, data, route) => {
    expect(resolvePushDestination({ type, ...data }).route).toBe(route);
    expect(getNotificationTarget(note(type, data))).toBe(route);
  });

  it("OFFERING_RECEIVED : cadeau personnel vers /offerings, cadeau de salon vers son salon", () => {
    expect(resolvePushDestination({ type: "OFFERING_RECEIVED" }).route).toBe("/offerings");
    expect(getNotificationTarget(note("OFFERING_RECEIVED", {}))).toBe("/offerings");
    expect(resolvePushDestination({ type: "OFFERING_RECEIVED", salonId: "salon_1" }).route).toBe("/salon/salon_1");
    expect(getNotificationTarget(note("OFFERING_RECEIVED", { salonId: "salon_1" }))).toBe("/salon/salon_1");
    expect(getNotificationTarget(note("OFFERING_RECEIVED", { salonId: "../admin" }))).toBe("/offerings");
  });

  it("refuse les identifiants de correspondance ou de salon non sûrs", () => {
    for (const type of ["LETTER_RECEIVED", "QUESTIONS_PASSED", "MATCH_CREATED", "QUESTIONS_TURN"]) {
      expect(getNotificationTarget(note(type, { matchId: "../admin" }))).toBeNull();
      const target = type === "LETTER_RECEIVED" ? "/(tabs)/letters?matchId=match_1" : type === "QUESTIONS_PASSED" ? "/(tabs)/letters" : "/(tabs)/letters?questionsMatchId=match_1";
      expect(getNotificationTarget(note(type, { matchId: "match_1" }))).toBe(target);
      expect(resolvePushDestination({ type, matchId: "match_1" }).route).toBe(target);
    }
    expect(getNotificationTarget(note("MAGIE_RECEIVED", { salonId: "../admin" }))).toBeNull();
    expect(getNotificationTarget(note("MAGIE_RECEIVED", { salonId: "salon_1" }))).toBe("/salon/salon_1");
  });

  it("ACCOUNT_RESTORED : pas d'écran dédié (liste des notifications pour le push, aucune navigation pour la cloche)", () => {
    expect(resolvePushDestination({ type: "ACCOUNT_RESTORED" }).route).toBe("/notifications");
    expect(getNotificationTarget(note("ACCOUNT_RESTORED", {}))).toBeNull();
  });
});

describe("identifiants absents ou piégés : repli sûr, aucune route libre", () => {
  const EVIL = ["../admin", "d1/../../x", "d1?x=1", "https://evil.example", "", "a".repeat(65), 42, null, {}];
  it.each(["DUEL_RECEIVED", "DUEL_RESULT", "DUEL_DECLINED", "DUEL_EXPIRED"])("%s sans identifiant valide → /notifications", (type) => {
    expect(resolvePushDestination({ type }).route).toBe("/notifications");
    for (const bad of EVIL) {
      expect(resolvePushDestination({ type, duelId: bad }).route, String(bad)).toBe("/notifications");
      expect(getNotificationTarget(note(type, { duelId: bad })), String(bad)).toBeNull();
    }
  });
  it.each(["REFUGE_ADOPTED", "REFUGE_REVEAL_PHASE", "REFUGE_REVEALED", "REFUGE_CHOICE_READY", "REFUGE_RESULT_READY", "REFUGE_DAY_RESULT", "REFUGE_NEW_DAY", "REFUGE_COINS", "REFUGE_REVEAL_REFUSED", "REFUGE_EXPIRED", "REFUGE_ATTENTION", "REFUGE_ADOPTION_CONFIRMED", "REFUGE_FINAL_REPORT"])("%s sans identifiant valide → /refuge (jamais une route forgée)", (type) => {
    expect(resolvePushDestination({ type }).route).toBe("/refuge");
    for (const bad of EVIL) {
      expect(resolvePushDestination({ type, refugeSessionId: bad }).route, String(bad)).toBe("/refuge");
      expect(getNotificationTarget(note(type, { refugeSessionId: bad })), String(bad)).toBe("/refuge");
    }
  });
  it("dévoilement accepté / tour des questions sans correspondance valide", () => {
    expect(resolvePushDestination({ type: "BOTTLE_REVEAL_ACCEPTED", matchId: "../x" }).route).toBe("/bottles-main");
    expect(getNotificationTarget(note("BOTTLE_REVEAL_ACCEPTED", { matchId: "../x" }))).toBe("/bottles-main");
    expect(resolvePushDestination({ type: "QUESTIONS_TURN" }).route).toBe("/notifications");
    expect(getNotificationTarget(note("QUESTIONS_TURN", null))).toBeNull();
  });
  it("une route fournie par la notification n'est jamais suivie", () => {
    expect(resolvePushDestination({ type: "DUEL_RECEIVED", duelId: "d1", route: "/admin", url: "https://x" }).route).toBe("/duel/play?duelId=d1");
  });
});

describe("déjà à l'écran : un autre duel doit naviguer", () => {
  it("même duel → déjà là ; autre duel → naviguer ; autre écran → naviguer", () => {
    const at = (pathname: string, duelId?: string) => ({ pathname, params: duelId ? { duelId } : {} });
    expect(isAlreadyAtRoute(at("/duel/play", "d1"), "/duel/play?duelId=d1")).toBe(true);
    expect(isAlreadyAtRoute(at("/duel/play", "d2"), "/duel/play?duelId=d1")).toBe(false);
    expect(isAlreadyAtRoute(at("/duel/play"), "/duel/play?duelId=d1")).toBe(false);
    expect(isAlreadyAtRoute(at("/journal"), "/duel/play?duelId=d1")).toBe(false);
  });
});

describe("catégories et icônes de « Mes notifications »", () => {
  it("nouveaux libellés : Duels, Bouteilles, Refuge, Modération", () => {
    expect(categoryFor("DUEL_RECEIVED")).toEqual({ label: "Duels", icon: "duel" });
    expect(categoryFor("BOTTLE_REPLY")).toEqual({ label: "Bouteilles", icon: "bottle" });
    expect(categoryFor("REFUGE_REVEALED")).toEqual({ label: "Refuge", icon: "refuge" });
    expect(categoryFor("REPORT_PROCESSED")).toEqual({ label: "Modération", icon: "shield" });
    expect(categoryFor("QUESTIONS_TURN").label).toBe("Rencontres");
  });
  it("types existants inchangés (non-régression)", () => {
    expect(NOTIFICATION_CATEGORIES.LETTER_RECEIVED).toEqual({ label: "Lettres", icon: "letter" });
    expect(NOTIFICATION_CATEGORIES.OFFERING_RECEIVED).toEqual({ label: "Offrandes", icon: "gift" });
    expect(NOTIFICATION_CATEGORIES.SECURITY_ALERT).toEqual({ label: "Sécurité", icon: "shield" });
    expect(NOTIFICATION_CATEGORIES.ADMIN_MESSAGE).toEqual({ label: "Administration", icon: "megaphone" });
  });
});
