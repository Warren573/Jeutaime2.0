import { describe, expect, it } from "vitest";
import {
  SCENARIOS, STAGES, accountLabel, accountRefusals, confirmationPhrase, expectedOutcome, maskPublic, preconditionFailures, sessionCode, testAccountNumber, type PreconditionInput,
} from "../../scripts/refuge-testkit";

const user = (email: string, over: Record<string, unknown> = {}) => ({ email, role: "USER", isBanned: false, ...over });

describe("outillage de test : comptes autorisés", () => {
  it("seuls testuser2 à testuser11@jeutaime.test, comparaison exacte", () => {
    expect([2, 5, 11].map((n) => testAccountNumber(`testuser${n}@jeutaime.test`))).toEqual([2, 5, 11]);
    expect(testAccountNumber("TestUser9@JeuTaime.test")).toBe(9);
    for (const bad of ["testuser1@jeutaime.test", "testuser12@jeutaime.test", "testuser2@jeutaime.com", "xtestuser2@jeutaime.test", "testuser2@jeutaime.test.evil.io", "toto@gmail.com", "", null, undefined, "testuser02@jeutaime.test", "testuser2+a@jeutaime.test"]) {
      expect(testAccountNumber(bad as never)).toBeNull();
    }
  });
  it("jamais un compte d'administration, suspendu ou exclu", () => {
    expect(accountRefusals(user("testuser4@jeutaime.test", { role: "OWNER" })).join()).toMatch(/administration/);
    expect(accountRefusals(user("testuser3@jeutaime.test", { role: "ADMIN" })).length).toBe(1);
    expect(accountRefusals(user("testuser3@jeutaime.test", { role: "MODERATOR" })).length).toBe(1);
    expect(accountRefusals(user("testuser3@jeutaime.test", { isBanned: true })).join()).toMatch(/suspendu/);
    expect(accountRefusals(user("testuser3@jeutaime.test"), ["TESTUSER3@jeutaime.test"]).join()).toMatch(/exclu/);
    expect(accountRefusals(user("testuser3@jeutaime.test"))).toEqual([]);
    expect(accountRefusals(user("vraie.personne@gmail.com")).length).toBeGreaterThan(0);
  });
});

describe("outillage de test : valeurs attendues (calculées avec les règles de production)", () => {
  it("S1 parcours parfait : 170 pièces chacun, aucun point retiré, 14/14", () => {
    const e = expectedOutcome(SCENARIOS.S1);
    expect(e.companion).toMatchObject({ coins: 70, bonus: 100, totalCoins: 170, points: 0, participationDays: 7 });
    expect(e.sponsor).toMatchObject({ coins: 70, bonus: 100, totalCoins: 170, points: 0, participationDays: 7 });
    expect([e.perfectDays, e.correctActions, e.perfectCourse]).toEqual([7, 14, true]);
    expect(e.calendar).toEqual(Array(7).fill("❤️"));
  });
  it("S2 incomplet : compagnon 50 pièces / −10 points, parrain 40 pièces / −10 points, aucun bonus, 1 journée parfaite, 3/14", () => {
    const e = expectedOutcome(SCENARIOS.S2);
    expect(e.companion).toMatchObject({ coins: 50, bonus: 0, totalCoins: 50, points: -10, participationDays: 5 });
    expect(e.sponsor).toMatchObject({ coins: 40, bonus: 0, totalCoins: 40, points: -10, participationDays: 4 });
    expect([e.perfectDays, e.correctActions, e.perfectCourse]).toEqual([1, 3, false]);
    expect(e.calendar).toEqual(["❤️", "♡", "⚠️", "⚠️", "⚠️", "—", "❌"]);
  });
  it("S3 assiduité 7/7 non parfaite : 120 pièces chacun, bonus de 50 seulement, 8/14", () => {
    const e = expectedOutcome(SCENARIOS.S3);
    expect(e.companion).toMatchObject({ coins: 70, bonus: 50, totalCoins: 120, points: 0 });
    expect(e.sponsor).toMatchObject({ coins: 70, bonus: 50, totalCoins: 120, points: 0 });
    expect([e.perfectDays, e.correctActions, e.perfectCourse]).toEqual([3, 8, false]);
  });
  it("les trois scénarios couvrent les cas demandés", () => {
    // Plus aucune décision de dévoilement : la fin est automatique pour les trois scénarios.
    for (const id of ["S1", "S2", "S3"] as const) expect("reveal" in SCENARIOS[id]).toBe(false);
    for (const s of Object.values(SCENARIOS)) expect(s.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(STAGES).toEqual(["adopt", "days-1-3", "days-4-6", "day-7", "fast-forward", "decision", "status"]);
  });
});

describe("outillage de test : préconditions", () => {
  const C = user("testuser5@jeutaime.test"), S = user("testuser6@jeutaime.test");
  const base = (over: Partial<PreconditionInput> = {}): PreconditionInput => ({ stage: "adopt", companion: C, sponsor: S, excludedEmails: [], protectedSessionIds: [], openSessions: [], target: null, pairAlreadyUsed: false, ...over });
  const target = { id: "s1", companionEmail: C.email, sponsorEmail: S.email, status: "ACTIVE", rulesVersion: 2 };
  it("adopt : comptes libres et couple libre → autorisé", () => {
    expect(preconditionFailures(base())).toEqual([]);
  });
  it("adopt : un Refuge ouvert (adoption en cours à préserver) bloque le compte", () => {
    const f = preconditionFailures(base({ openSessions: [{ id: "reel", status: "ACTIVE", companionEmail: C.email, sponsorEmail: "testuser9@jeutaime.test" }] }));
    expect(f.join()).toMatch(/adoption en cours préservée/);
  });
  it("adopt : un couple ne peut avoir qu'un seul Refuge", () => {
    expect(preconditionFailures(base({ pairAlreadyUsed: true })).join()).toMatch(/un seul/);
  });
  it("compte réel, administrateur, identique ou exclu : refusé", () => {
    expect(preconditionFailures(base({ companion: user("vrai@gmail.com") })).length).toBeGreaterThan(0);
    expect(preconditionFailures(base({ sponsor: user("testuser4@jeutaime.test", { role: "OWNER" }) })).length).toBeGreaterThan(0);
    expect(preconditionFailures(base({ sponsor: C })).join()).toMatch(/deux comptes différents/);
    expect(preconditionFailures(base({ excludedEmails: [S.email] })).join()).toMatch(/exclu/);
  });
  it("étapes suivantes : session v2 du bon couple obligatoire", () => {
    const ok = base({ stage: "days-1-3", target, openSessions: [{ id: "s1", status: "ACTIVE", companionEmail: C.email, sponsorEmail: S.email }] });
    expect(preconditionFailures(ok)).toEqual([]);
    expect(preconditionFailures({ ...ok, target: null }).join()).toMatch(/introuvable/);
    expect(preconditionFailures({ ...ok, target: { ...target, rulesVersion: 1 } }).join()).toMatch(/v1/);
    expect(preconditionFailures({ ...ok, target: { ...target, sponsorEmail: "testuser9@jeutaime.test" } }).join()).toMatch(/ne correspond pas/);
    expect(preconditionFailures({ ...ok, protectedSessionIds: ["s1"] }).join()).toMatch(/protégée/);
    expect(preconditionFailures({ ...ok, openSessions: [...ok.openSessions, { id: "autre", status: "ACTIVE", companionEmail: C.email, sponsorEmail: "x" }] }).join()).toMatch(/AUTRE Refuge/);
  });
  it("phrase de confirmation précise (scénario, étape, numéros de comptes, code de session), sans adresse", () => {
    expect(confirmationPhrase("S2", "adopt", 5, 6)).toBe("JE CONFIRME S2 adopt 5 6");
    expect(confirmationPhrase("S2", "fast-forward", 5, 6, "n0y3gr")).toBe("JE CONFIRME S2 fast-forward 5 6 n0y3gr");
    expect(confirmationPhrase("S2", "adopt", testAccountNumber("TestUser5@jeutaime.test"), null)).not.toMatch(/@/);
  });
  it("journaux publics : adresses → « compte n°N », identifiants complets → 6 derniers caractères, code de session", () => {
    const id = "cmwyvwoli00011236376jgn0y";
    expect(sessionCode(id)).toBe("6jgn0y");
    expect(accountLabel("testuser10@jeutaime.test")).toBe("compte n°10");
    expect(accountLabel("vrai@gmail.com")).toBe("compte inconnu");
    const masked = maskPublic(`compte testuser5@jeutaime.test, session ${id}, vrai@gmail.com`);
    expect(masked).toBe("compte compte n°5, session …6jgn0y, vrai@gmail.com");
    expect(masked).not.toMatch(/testuser5@|cmwyvwoli/);
  });
  it("les messages de refus n'affichent ni adresse ni identifiant complet", () => {
    const f = preconditionFailures({ stage: "adopt", companion: user("testuser5@jeutaime.test"), sponsor: user("testuser4@jeutaime.test", { role: "OWNER" }), excludedEmails: [], protectedSessionIds: [], openSessions: [{ id: "cmwyvwoli00011236376jgn0y", status: "ACTIVE", companionEmail: "testuser5@jeutaime.test", sponsorEmail: null }], target: null, pairAlreadyUsed: false }).join(" | ");
    expect(f).toMatch(/compte n°4/);
    expect(f).not.toMatch(/@|cmwyvwoli/);
  });
});
