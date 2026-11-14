import { describe, expect, it } from "vitest";
import { NotificationType } from "@prisma/client";
import {
  PUSH_TYPE_CONFIG,
  pickPushData,
  pushCategoryFor,
  pushDestinationFor,
} from "../../src/policies/pushRouting";
import { buildPushPayload } from "../../src/policies/notifications";

const ALL_TYPES = Object.values(NotificationType);
const FORBIDDEN_DATA_KEYS = ["fromUserId", "otherUserId", "userId", "adminMessageId", "privateSalonSessionId", "bottleId", "subject", "name", "message", "coins", "amount"];

describe("correspondance centrale des types push", () => {
  it("chaque type de notification a une configuration (exhaustivité)", () => {
    for (const type of ALL_TYPES) expect(PUSH_TYPE_CONFIG[type], type).toBeDefined();
    expect(PUSH_TYPE_CONFIG.BOTTLE_REPLY).toBeDefined();
    expect(PUSH_TYPE_CONFIG.DAILY_EDITION).toBeDefined();
  });

  it("catégories : identiques aux règles historiques de sendPushToUser", () => {
    expect(pushCategoryFor("BOTTLE_REPLY")).toBe("notifLetters");
    expect(pushCategoryFor("LETTER_RECEIVED")).toBe("notifLetters");
    expect(pushCategoryFor("MATCH_CREATED")).toBe("notifMeetings");
    expect(pushCategoryFor("QUESTIONS_PASSED")).toBe("notifMeetings");
    expect(pushCategoryFor("QUESTIONS_FAILED")).toBe("notifMeetings");
    expect(pushCategoryFor("PRIVATE_SALON_INVITE")).toBe("notifSalons");
    expect(pushCategoryFor("MAGIE_RECEIVED")).toBe("notifSalons");
    expect(pushCategoryFor("MAGIE_BROKEN")).toBe("notifSalons");
    expect(pushCategoryFor("OFFERING_RECEIVED")).toBe("notifActivities");
    expect(pushCategoryFor("DAILY_EDITION")).toBe("notifNews");
    // Compte, sécurité, abonnement, administration : seul le réglage général s'applique.
    for (const t of ["ADMIN_MESSAGE", "SECURITY_ALERT", "PREMIUM_SUBSCRIBED", "PREMIUM_CANCELLED"]) {
      expect(pushCategoryFor(t), t).toBeNull();
    }
  });

  it("type inconnu, absent ou piégé : aucune catégorie, aucune destination", () => {
    for (const bad of [undefined, null, 42, "", "NOPE", "__proto__", "constructor", "toString"]) {
      expect(pushCategoryFor(bad)).toBeNull();
      expect(pushDestinationFor(bad)).toBeNull();
    }
  });

  it("destinations", () => {
    expect(pushDestinationFor("LETTER_RECEIVED")).toBe("/match-profile");
    expect(pushDestinationFor("OFFERING_RECEIVED")).toBe("/salon");
    expect(pushDestinationFor("ADMIN_MESSAGE")).toBe("/admin-messages");
    expect(pushDestinationFor("PRIVATE_SALON_INVITE")).toBe("/private-salons");
    expect(pushDestinationFor("SECURITY_ALERT")).toBe("/security");
    expect(pushDestinationFor("BOTTLE_REPLY")).toBe("/bottles-main");
    expect(pushDestinationFor("DAILY_EDITION")).toBe("/journal");
    expect(pushDestinationFor("QUESTIONS_FAILED")).toBeNull();
  });
});

describe("charge push : confidentialité et données minimales", () => {
  const polluted = {
    matchId: "m1",
    salonId: "s1",
    fromUserId: "u-from",
    otherUserId: "u-other",
    adminMessageId: "am1",
    privateSalonSessionId: "ps1",
    subject: "Avertissement sur ton compte",
    name: "Salon des amoureux",
    coins: "50",
  } as never;

  it("ne contient jamais d'identifiant d'utilisateur ni de donnée hors liste, pour tous les types", () => {
    for (const type of ALL_TYPES) {
      const { data } = buildPushPayload(type, polluted);
      expect(data["type"], type).toBe(type);
      for (const key of FORBIDDEN_DATA_KEYS) expect(data, `${type}.${key}`).not.toHaveProperty(key);
      const allowed = new Set(["type", ...PUSH_TYPE_CONFIG[type].dataKeys]);
      for (const key of Object.keys(data)) expect(allowed.has(key), `${type}.${key}`).toBe(true);
    }
  });

  it("garde les identifiants de navigation nécessaires", () => {
    expect(buildPushPayload(NotificationType.LETTER_RECEIVED, polluted).data).toEqual({ type: "LETTER_RECEIVED", matchId: "m1" });
    expect(buildPushPayload(NotificationType.MATCH_CREATED, polluted).data).toEqual({ type: "MATCH_CREATED", matchId: "m1" });
    expect(buildPushPayload(NotificationType.OFFERING_RECEIVED, polluted).data).toEqual({ type: "OFFERING_RECEIVED", salonId: "s1" });
    expect(buildPushPayload(NotificationType.MAGIE_RECEIVED, polluted).data).toEqual({ type: "MAGIE_RECEIVED", salonId: "s1" });
    expect(buildPushPayload(NotificationType.ADMIN_MESSAGE, polluted).data).toEqual({ type: "ADMIN_MESSAGE" });
    expect(buildPushPayload(NotificationType.PRIVATE_SALON_INVITE, polluted).data).toEqual({ type: "PRIVATE_SALON_INVITE" });
  });

  it("administration et invitation : textes génériques, sans sujet ni nom de salon", () => {
    const admin = buildPushPayload(NotificationType.ADMIN_MESSAGE, polluted);
    expect(admin.title).toBe("JeuTaime · Administration");
    expect(admin.body).toBe("Tu as reçu un message de l’administration");
    const invite = buildPushPayload(NotificationType.PRIVATE_SALON_INVITE, polluted);
    expect(invite.title).toBe("JeuTaime · Invitation");
    expect(invite.body).toBe("Tu as été invité dans un salon privé");
    for (const p of [admin, invite]) {
      expect(JSON.stringify(p)).not.toMatch(/Avertissement|amoureux|am1|ps1/);
    }
  });

  it("aucun texte visible ne contient d'identifiant ; le seul chiffre est « 3 questions » (règle du jeu)", () => {
    for (const type of ALL_TYPES) {
      const { title, body } = buildPushPayload(type, polluted);
      const visible = `${title} ${body}`;
      expect(visible, type).not.toMatch(/u-from|u-other|\bm1\b|\bs1\b|am1|ps1/);
      expect(visible.replace(/3 questions/g, ""), type).not.toMatch(/\d/);
    }
  });

  it("pickPushData ignore les valeurs non textuelles ou vides", () => {
    expect(pickPushData("LETTER_RECEIVED", { matchId: 42 as never })).toEqual({ type: "LETTER_RECEIVED" });
    expect(pickPushData("LETTER_RECEIVED", { matchId: "" })).toEqual({ type: "LETTER_RECEIVED" });
    expect(pickPushData("LETTER_RECEIVED", null)).toEqual({ type: "LETTER_RECEIVED" });
  });
});

describe("phase 2 : nouveaux événements", () => {
  const PHASE2: Array<[string, string | null, string | null, string[]]> = [
    ["DUEL_RECEIVED", "notifActivities", "/duel/play", ["duelId"]],
    ["DUEL_RESULT", "notifActivities", "/duel/play", ["duelId"]],
    ["DUEL_DECLINED", "notifActivities", "/duel/play", ["duelId"]],
    ["DUEL_EXPIRED", "notifActivities", "/duel/play", ["duelId"]],
    ["BOTTLE_REVEAL_REQUEST", "notifLetters", "/bottles-main", []],
    ["BOTTLE_REVEAL_ACCEPTED", "notifLetters", "/match-profile", ["matchId"]],
    ["BOTTLE_REVEAL_REFUSED", "notifLetters", "/bottles-main", []],
    ["QUESTIONS_TURN", "notifMeetings", "/match-profile", ["matchId"]],
    ["REFUGE_ADOPTED", "notifActivities", "/refuge", ["refugeSessionId"]],
    ["REFUGE_REVEAL_PHASE", "notifActivities", "/refuge", ["refugeSessionId"]],
    ["REFUGE_REVEALED", "notifActivities", "/refuge", ["refugeSessionId"]],
    ["REPORT_PROCESSED", null, "/user-reports", []],
    ["ACCOUNT_RESTORED", null, null, []],
  ];

  it.each(PHASE2)("%s : catégorie, destination et données autorisées", (type, category, destination, keys) => {
    expect(pushCategoryFor(type)).toBe(category);
    expect(pushDestinationFor(type)).toBe(destination);
    expect([...PUSH_TYPE_CONFIG[type as NotificationType]!.dataKeys]).toEqual(keys);
  });

  it("un type retiré faute d'événement réel n'existe plus (aucune notification pour un événement inexistant)", () => {
    for (const gone of ["BOTTLE_ACCEPTED", "SUPPORT_REPLY"]) {
      expect(ALL_TYPES as string[], gone).not.toContain(gone);
      expect(pushCategoryFor(gone)).toBeNull();
    }
  });

  it("les push des bouteilles ne contiennent JAMAIS d'identifiant de bouteille ni de personne (anonymat)", () => {
    for (const type of ["BOTTLE_REPLY", "BOTTLE_REVEAL_REQUEST", "BOTTLE_REVEAL_REFUSED", "BOTTLE_REVEAL_ACCEPTED"] as const) {
      const p = buildPushPayload(type, { bottleId: "bt-secret", matchId: "m1", userId: "u-secret", fromUserId: "u2", message: "texte privé" });
      const text = JSON.stringify(p);
      for (const leak of ["bt-secret", "u-secret", "u2", "texte privé"]) expect(text, `${type} ${leak}`).not.toContain(leak);
    }
  });

  it("duelId / refugeSessionId : transmis seulement pour leurs types, jamais d'autre clé", () => {
    const meta = { duelId: "d1", refugeSessionId: "r1", matchId: "m1", pseudo: "Alice" };
    expect(buildPushPayload("DUEL_RECEIVED", meta).data).toEqual({ type: "DUEL_RECEIVED", duelId: "d1" });
    expect(buildPushPayload("REFUGE_REVEALED", meta).data).toEqual({ type: "REFUGE_REVEALED", refugeSessionId: "r1" });
    expect(buildPushPayload("QUESTIONS_TURN", meta).data).toEqual({ type: "QUESTIONS_TURN", matchId: "m1" });
    expect(JSON.stringify(buildPushPayload("DUEL_RECEIVED", meta))).not.toContain("Alice");
  });
});
