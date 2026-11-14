import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { isAlreadyAtRoute, resolvePushDestination } from "../../../frontend/src/utils/pushNavigation";
import { getNotificationTarget } from "../../../frontend/src/utils/notifications";
import {
  NOTIFICATION_CATEGORIES,
  PNG_ICON_NAMES,
  categoryFor,
  hasPngIcon,
} from "../../../frontend/src/utils/notificationsView";

/**
 * Icônes PNG de « Mes notifications » et navigation exacte vers une conversation de bouteille.
 * Logique pure (le dépôt n'a pas de banc de test côté application) + garde sur les fichiers d'illustration.
 */
const FRONT = resolve(__dirname, "../../../frontend");
const ICON_FILE = resolve(FRONT, "src/components/NotificationIcon.tsx");
const note = (type: string, meta: Record<string, unknown> | null) =>
  ({ id: "n", type, message: "m", meta, isRead: false, readAt: null, createdAt: new Date().toISOString() }) as never;

describe("icônes PNG : catégories couvertes", () => {
  const PNG_TYPES: Array<[string, string, string]> = [
    ["DUEL_RECEIVED", "Duels", "duel"], ["DUEL_RESULT", "Duels", "duel"], ["DUEL_DECLINED", "Duels", "duel"], ["DUEL_EXPIRED", "Duels", "duel"],
    ["BOTTLE_REPLY", "Bouteilles", "bottle"], ["BOTTLE_REVEAL_REQUEST", "Bouteilles", "bottle"],
    ["BOTTLE_REVEAL_ACCEPTED", "Bouteilles", "bottle"], ["BOTTLE_REVEAL_REFUSED", "Bouteilles", "bottle"],
    ["LETTER_RECEIVED", "Lettres", "letter"],
    ["MATCH_CREATED", "Rencontres", "heart"], ["QUESTIONS_PASSED", "Rencontres", "heart"], ["QUESTIONS_FAILED", "Rencontres", "heart"], ["QUESTIONS_TURN", "Rencontres", "heart"],
    ["OFFERING_RECEIVED", "Offrandes", "gift"],
    ["REFUGE_ADOPTED", "Refuge", "refuge"], ["REFUGE_REVEAL_PHASE", "Refuge", "refuge"], ["REFUGE_REVEALED", "Refuge", "refuge"],
  ];
  it.each(PNG_TYPES)("%s → %s : illustration PNG « %s »", (type, label, icon) => {
    expect(categoryFor(type)).toEqual({ label, icon });
    expect(hasPngIcon(categoryFor(type).icon)).toBe(true);
  });

  it("catégories SANS illustration cohérente disponible : icône au trait conservée (signalées dans la PR)", () => {
    for (const type of ["SECURITY_ALERT", "ACCOUNT_RESTORED", "REPORT_PROCESSED", "MAGIE_RECEIVED", "MAGIE_BROKEN", "PRIVATE_SALON_INVITE", "PREMIUM_SUBSCRIBED", "PREMIUM_CANCELLED", "ADMIN_MESSAGE"]) {
      expect(hasPngIcon(categoryFor(type).icon), type).toBe(false);
    }
  });

  it("aucun emoji dans les libellés ni les noms d'icônes", () => {
    const EMOJI = /\p{Extended_Pictographic}/u;
    for (const [type, c] of Object.entries(NOTIFICATION_CATEGORIES)) {
      expect(EMOJI.test(c.label), `${type} label`).toBe(false);
      expect(EMOJI.test(c.icon), `${type} icon`).toBe(false);
    }
  });

  it("hasPngIcon rejette les valeurs inconnues ou piégées", () => {
    for (const bad of [undefined, null, 3, "", "bell", "shield", "__proto__", "constructor", "../x"]) expect(hasPngIcon(bad), String(bad)).toBe(false);
    for (const name of PNG_ICON_NAMES) expect(hasPngIcon(name)).toBe(true);
  });
});

describe("icônes PNG : fichiers d'illustration", () => {
  const src = readFileSync(ICON_FILE, "utf8");
  const block = src.slice(src.indexOf("const PNG_ICONS"), src.indexOf("};", src.indexOf("const PNG_ICONS")));
  const entries = [...block.matchAll(/^\s*(\w+):\s*require\('([^']+)'\)/gm)].map((m) => ({ name: m[1]!, path: resolve(dirname(ICON_FILE), m[2]!) }));

  it("chaque nom d'icône PNG a un require() ; aucun nom en trop", () => {
    expect(entries.map((e) => e.name).sort()).toEqual([...PNG_ICON_NAMES].sort());
  });

  it.each(entries.map((e) => [e.name, e.path] as const))("%s : fichier présent, PNG RGBA carré et léger", (_name, file) => {
    expect(existsSync(file), file).toBe(true);
    expect(file).toContain("/frontend/assets/ui-icons/"); // uniquement l'identité graphique existante
    const buf = readFileSync(file);
    expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a"); // signature PNG
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), colorType = buf[25];
    expect(colorType).toBe(6); // RGBA : fond transparent, comme les autres illustrations
    expect(w).toBeGreaterThanOrEqual(200);
    expect(w).toBeLessThanOrEqual(300);
    expect(Math.abs(w - h)).toBeLessThanOrEqual(12); // à peu près carré, comme book/bottle/heart…
    expect(statSync(file).size).toBeLessThan(150_000); // léger : une liste de notifications l'affiche souvent
  });

  it("l'écran passe `dimmed` pour les notifications lues, et le composant l'applique aux PNG", () => {
    const screen = readFileSync(resolve(FRONT, "src/screens/NotificationsScreen.tsx"), "utf8");
    expect(screen).toMatch(/<NotificationIcon[^>]*dimmed=\{!unread\}/);
    expect(src).toMatch(/opacity:\s*dimmed\s*\?\s*PNG_READ_OPACITY\s*:\s*1/);
  });
});

describe("bouteilles : l'appui ouvre la conversation exacte (push ET cloche)", () => {
  const ID = "cm1abcDEF_ghi-123";
  it.each(["BOTTLE_REPLY", "BOTTLE_REVEAL_REQUEST", "BOTTLE_REVEAL_REFUSED"])("%s → /bottles-discussion?bottleId=…, même route partout", (type) => {
    const route = `/bottles-discussion?bottleId=${ID}`;
    expect(resolvePushDestination({ type, bottleId: ID }).route).toBe(route);
    expect(getNotificationTarget(note(type, { bottleId: ID }))).toBe(route);
  });

  it("sans identifiant valide : la liste des bouteilles, jamais une route forgée", () => {
    for (const type of ["BOTTLE_REPLY", "BOTTLE_REVEAL_REQUEST", "BOTTLE_REVEAL_REFUSED"]) {
      for (const bad of [undefined, null, "", "../admin", "a/b", "x?y=1", "https://evil.example", "a".repeat(65), 7, {}]) {
        expect(resolvePushDestination({ type, bottleId: bad }).route, `${type} ${String(bad)}`).toBe("/bottles-main");
        expect(getNotificationTarget(note(type, { bottleId: bad })), `${type} ${String(bad)}`).toBe("/bottles-main");
      }
    }
  });

  it("une route fournie par la notification n'est jamais suivie", () => {
    expect(resolvePushDestination({ type: "BOTTLE_REPLY", bottleId: ID, route: "/admin", url: "https://x" }).route).toBe(`/bottles-discussion?bottleId=${ID}`);
  });

  it("dévoilement mutuel accepté : la correspondance créée (jamais avant) ; repli sur les bouteilles", () => {
    expect(resolvePushDestination({ type: "BOTTLE_REVEAL_ACCEPTED", matchId: "m-1" }).route).toBe("/match-profile?matchId=m-1");
    expect(getNotificationTarget(note("BOTTLE_REVEAL_ACCEPTED", { bottleId: ID, matchId: "m-1" }))).toBe("/match-profile?matchId=m-1");
    expect(resolvePushDestination({ type: "BOTTLE_REVEAL_ACCEPTED" }).route).toBe("/bottles-main");
    expect(getNotificationTarget(note("BOTTLE_REVEAL_ACCEPTED", { bottleId: ID }))).toBe("/bottles-main");
  });

  it("déjà dans CETTE conversation : pas de navigation ; une autre conversation : on navigue", () => {
    const at = (bottleId?: string) => ({ pathname: "/bottles-discussion", params: bottleId ? { bottleId } : {} });
    const route = `/bottles-discussion?bottleId=${ID}`;
    expect(isAlreadyAtRoute(at(ID), route)).toBe(true);
    expect(isAlreadyAtRoute(at("autre-bouteille"), route)).toBe(false);
    expect(isAlreadyAtRoute(at(), route)).toBe(false);
    expect(isAlreadyAtRoute({ pathname: "/bottles-main", params: {} }, route)).toBe(false);
  });

  it("anonymat : aucune destination ne contient d'identifiant de personne", () => {
    const evil = { bottleId: ID, userId: "u-secret", senderId: "u-sender", acceptedById: "u-acc", pseudo: "Alice-secret" };
    for (const type of ["BOTTLE_REPLY", "BOTTLE_REVEAL_REQUEST", "BOTTLE_REVEAL_REFUSED", "BOTTLE_REVEAL_ACCEPTED"]) {
      for (const r of [resolvePushDestination({ type, ...evil }).route, getNotificationTarget(note(type, evil)) ?? ""]) {
        for (const leak of ["u-secret", "u-sender", "u-acc", "Alice-secret"]) expect(r, `${type} ${leak}`).not.toContain(leak);
      }
    }
  });
});
