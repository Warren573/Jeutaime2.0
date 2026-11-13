import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { NotificationType } from "@prisma/client";
import {
  NOTIFICATION_CATEGORIES,
  badgeLabel,
  categoryFor,
  dayGroupOf,
  daysAgo,
  formatNotificationTime,
  groupByDay,
  unreadSummary,
} from "../../../frontend/src/utils/notificationsView";

/** « Mes notifications » et cloche du Journal : logique d'affichage pure + garde-fous de confidentialité. */
const TZ = "Europe/Paris";
const NOW = new Date("2026-11-13T11:30:00Z"); // vendredi 13 novembre 2026, 12:30 à Paris
const at = (iso: string) => ({ id: iso, createdAt: iso, isRead: false });
const root = resolve(__dirname, "../../../frontend/src");
const source = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("badge de la cloche", () => {
  it("aucune non lue : pas de badge ; sinon le nombre ; « 99+ » au-delà", () => {
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(1)).toBe("1");
    expect(badgeLabel(16)).toBe("16");
    expect(badgeLabel(99)).toBe("99");
    expect(badgeLabel(100)).toBe("99+");
    expect(badgeLabel(1_000_000)).toBe("99+");
    expect(badgeLabel(7.9)).toBe("7");
  });
  it("valeurs invalides : jamais de badge ni d'erreur", () => {
    for (const bad of [-1, -0.5, NaN, Infinity, -Infinity, "16", null, undefined, {}, []]) expect(badgeLabel(bad), String(bad)).toBeNull();
  });
  it("résumé de l'en-tête", () => {
    expect(unreadSummary(16)).toBe("16 non lues");
    expect(unreadSummary(1)).toBe("1 non lue");
    expect(unreadSummary(0)).toBe("Tout est lu");
    expect(unreadSummary(-4)).toBe("Tout est lu");
    expect(unreadSummary(NaN)).toBe("Tout est lu");
    expect(unreadSummary("3" as never)).toBe("Tout est lu");
  });
});

describe("catégorie et icône de chaque type", () => {
  it("couvre TOUS les types de notification du serveur (aucun oubli quand un type est ajouté)", () => {
    for (const type of Object.values(NotificationType)) {
      expect(NOTIFICATION_CATEGORIES[type], type).toBeDefined();
      expect(categoryFor(type).label.length, type).toBeGreaterThan(0);
    }
    expect(Object.keys(NOTIFICATION_CATEGORIES).sort()).toEqual(Object.values(NotificationType).sort());
  });
  it("catégories attendues", () => {
    expect(categoryFor("LETTER_RECEIVED")).toEqual({ label: "Lettres", icon: "letter" });
    expect(categoryFor("MATCH_CREATED")).toEqual({ label: "Rencontres", icon: "heart" });
    expect(categoryFor("PRIVATE_SALON_INVITE")).toEqual({ label: "Salons", icon: "lock" });
    expect(categoryFor("OFFERING_RECEIVED")).toEqual({ label: "Offrandes", icon: "gift" });
    expect(categoryFor("ADMIN_MESSAGE")).toEqual({ label: "Administration", icon: "megaphone" });
    expect(categoryFor("SECURITY_ALERT")).toEqual({ label: "Sécurité", icon: "shield" });
  });
  it("type inconnu, absent ou piégé : repli sur la cloche, sans erreur", () => {
    for (const bad of ["FUTUR", "", "__proto__", "constructor", "toString", undefined, null, 42, {}]) {
      expect(categoryFor(bad as never), String(bad)).toEqual({ label: "Notification", icon: "bell" });
    }
  });
});

describe("dates : regroupement par jour (fuseau Europe/Paris)", () => {
  it("aujourd'hui, hier, cette semaine, plus ancien — avec les bornes à minuit", () => {
    expect(dayGroupOf("2026-11-13T00:01:00+01:00", NOW, TZ)).toBe("today");
    expect(dayGroupOf("2026-11-12T23:59:00+01:00", NOW, TZ)).toBe("yesterday");
    expect(dayGroupOf("2026-11-12T00:00:00+01:00", NOW, TZ)).toBe("yesterday");
    expect(dayGroupOf("2026-11-11T23:59:00+01:00", NOW, TZ)).toBe("week");
    expect(dayGroupOf("2026-11-07T08:00:00+01:00", NOW, TZ)).toBe("week"); // il y a 6 jours
    expect(dayGroupOf("2026-11-06T23:59:00+01:00", NOW, TZ)).toBe("older"); // il y a 7 jours
  });
  it("le fuseau compte : 23:30 UTC la veille est déjà « aujourd'hui » à Paris", () => {
    expect(dayGroupOf("2026-11-12T23:30:00Z", NOW, TZ)).toBe("today");
    expect(dayGroupOf("2026-11-12T23:30:00Z", NOW, "UTC")).toBe("yesterday");
  });
  it("horloge de l'appareil en retard (date future) : traité comme aujourd'hui ; date illisible : plus ancien", () => {
    expect(daysAgo("2026-11-14T10:00:00Z", NOW, TZ)).toBe(0);
    expect(dayGroupOf("2026-11-20T10:00:00Z", NOW, TZ)).toBe("today");
    expect(dayGroupOf("pas une date", NOW, TZ)).toBe("older");
    expect(dayGroupOf("", NOW, TZ)).toBe("older");
  });
  it("changement d'heure (passage à l'heure d'été/d'hiver) : pas de décalage de jour", () => {
    const now = new Date("2026-10-26T10:00:00Z"); // lendemain du passage à l'heure d'hiver (25 octobre)
    expect(dayGroupOf("2026-10-25T23:30:00+01:00", now, TZ)).toBe("yesterday");
    expect(dayGroupOf("2026-10-25T00:30:00+02:00", now, TZ)).toBe("yesterday");
  });
});

describe("heure ou date affichée", () => {
  it("aujourd'hui et hier : l'heure ; au-delà : date courte", () => {
    expect(formatNotificationTime("2026-11-13T13:32:00+01:00", NOW, TZ)).toBe("13:32");
    expect(formatNotificationTime("2026-11-12T21:05:00+01:00", NOW, TZ)).toBe("21:05");
    expect(formatNotificationTime("2026-11-09T10:00:00+01:00", NOW, TZ)).toMatch(/^lun\.? 9 nov\.?$/);
    expect(formatNotificationTime("2026-10-03T10:00:00+02:00", NOW, TZ)).toMatch(/^3 oct\.?$/);
    expect(formatNotificationTime("2025-12-24T10:00:00+01:00", NOW, TZ)).toMatch(/^24 déc\.? 2025$/);
  });
  it("minuit : 00:05 reste en 24 h ; date illisible : texte vide, sans exception", () => {
    expect(formatNotificationTime("2026-11-13T00:05:00+01:00", NOW, TZ)).toBe("00:05");
    expect(formatNotificationTime("???", NOW, TZ)).toBe("");
  });
});

describe("liste : de la plus récente à la plus ancienne", () => {
  const items = [
    at("2026-11-09T10:00:00+01:00"),
    at("2026-11-13T09:20:00+01:00"),
    at("2026-11-12T21:05:00+01:00"),
    at("2026-11-13T13:32:00+01:00"),
    at("2026-10-01T10:00:00+02:00"),
    { id: "bad", createdAt: "illisible", isRead: true },
    at("2026-11-13T11:48:00+01:00"),
  ];
  it("regroupe par jour, trie du plus récent au plus ancien, conserve tout (aucune perte)", () => {
    const sections = groupByDay(items, NOW, TZ);
    expect(sections.map((s) => s.key)).toEqual(["today", "yesterday", "week", "older"]);
    expect(sections.map((s) => s.title)).toEqual(["AUJOURD'HUI", "HIER", "CETTE SEMAINE", "PLUS ANCIEN"]);
    expect(sections[0]!.data.map((n) => n.createdAt)).toEqual(["2026-11-13T13:32:00+01:00", "2026-11-13T11:48:00+01:00", "2026-11-13T09:20:00+01:00"]);
    expect(sections[3]!.data.map((n) => n.id)).toEqual(["2026-10-01T10:00:00+02:00", "bad"]); // la date illisible en dernier
    expect(sections.flatMap((s) => s.data)).toHaveLength(items.length);
  });
  it("ne modifie pas la liste d'origine ; sections vides omises ; liste vide", () => {
    const copy = JSON.stringify(items);
    groupByDay(items, NOW, TZ);
    expect(JSON.stringify(items)).toBe(copy);
    expect(groupByDay([at("2026-11-13T09:20:00+01:00")], NOW, TZ).map((s) => s.key)).toEqual(["today"]);
    expect(groupByDay([], NOW, TZ)).toEqual([]);
  });
  it("les lues restent dans l'historique, mêlées aux non lues selon leur date", () => {
    const mixed = [{ ...at("2026-11-13T09:00:00+01:00"), isRead: true }, at("2026-11-13T10:00:00+01:00")];
    const [today] = groupByDay(mixed, NOW, TZ);
    expect(today!.data.map((n) => n.isRead)).toEqual([false, true]);
  });
});

describe("même compteur et confidentialité (garde-fous sur les sources)", () => {
  it("la cloche, le badge de l'icône et l'écran lisent le MÊME compteur du store", () => {
    // Lecture du compteur du store (pas seulement une mention dans un commentaire).
    for (const file of ["components/NotificationBell.tsx", "hooks/usePushNotifications.ts"]) {
      expect(source(file), file).toMatch(/useStore\(\(s\) => s\.unreadNotificationsCount\)/);
    }
    expect(source("screens/NotificationsScreen.tsx")).toMatch(/^\s*unreadNotificationsCount,$/m);
    expect(source("hooks/usePushNotifications.ts")).toMatch(/setBadgeCountAsync/);
  });
  it("l'écran n'affiche que le message générique : jamais la meta (identifiants, pseudos) ni de contenu", () => {
    for (const file of ["screens/NotificationsScreen.tsx", "components/NotificationBell.tsx"]) {
      const src = source(file);
      expect(src, file).not.toMatch(/\.meta\b/);
      expect(src, file).not.toMatch(/fromUserId|otherUserId|pseudo|\bcontent\b/);
    }
    expect(source("screens/NotificationsScreen.tsx")).toMatch(/item\.message/);
  });
  it("la cloche ouvre l'écran existant /notifications (pas de système parallèle)", () => {
    expect(source("components/NotificationBell.tsx")).toMatch(/router\.push\('\/notifications'/);
    expect(source("screens/NotificationsScreen.tsx")).toMatch(/markNotificationRead/);
    expect(source("screens/NotificationsScreen.tsx")).toMatch(/markAllNotificationsRead/);
    expect(source("screens/NotificationsScreen.tsx")).toMatch(/getNotificationTarget/);
  });
  it("les écrans exclus de ce chantier ne sont pas touchés (Paramètres, barre d'onglets)", () => {
    expect(source("components/NotificationBell.tsx")).not.toMatch(/SettingsScreen|CustomTabBar/);
  });
});
