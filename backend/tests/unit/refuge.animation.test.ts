import { describe, it, expect } from "vitest";
import { buildAnimationSnapshot } from "../../src/modules/refuge/refuge.animation";

const t = (iso: string) => new Date(iso);
const choice = (dayNumber: number, a1: string, a2: string, at: string) =>
  ({ dayNumber, action1: a1, action2: a2, submittedAt: t(at) }) as any;
const guess = (dayNumber: number, a1: string, a2: string, at: string, foodChoice: string | null = null) =>
  ({ dayNumber, guessedAction1: a1, guessedAction2: a2, foodChoice, submittedAt: t(at) }) as any;

describe("buildAnimationSnapshot", () => {
  it("aucune donnée : aucun horodatage", () => {
    expect(buildAnimationSnapshot({ choices: [], guesses: [], currentDay: 1, animalType: "CHAT" })).toEqual({
      choiceAt: null, resolvedAt: null, matches: null, reactions: [], foodChoice: null,
    });
  });

  it("choix du compagnon seul : seule l'heure du choix est exposée (jamais les actions)", () => {
    const snap = buildAnimationSnapshot({
      choices: [choice(1, "NOURRIR", "JOUER", "2026-01-01T10:00:00Z")],
      guesses: [], currentDay: 1, animalType: "CHAT",
    });
    expect(snap).toEqual({
      choiceAt: "2026-01-01T10:00:00.000Z", resolvedAt: null, matches: null, reactions: [], foodChoice: null,
    });
    expect(JSON.stringify(snap)).not.toMatch(/NOURRIR|JOUER|CARESSER|LAVER/);
  });

  it("2 bonnes réponses : matches 2, deux réactions correctes, aliment enregistré", () => {
    const snap = buildAnimationSnapshot({
      choices: [choice(1, "NOURRIR", "JOUER", "2026-01-01T10:00:00Z")],
      guesses: [guess(1, "JOUER", "NOURRIR", "2026-01-01T12:00:00Z", "sardines")],
      currentDay: 1, animalType: "CHAT",
    });
    expect(snap.matches).toBe(2);
    expect(snap.resolvedAt).toBe("2026-01-01T12:00:00.000Z");
    expect(snap.reactions).toEqual([
      { action: "JOUER", correct: true },
      { action: "NOURRIR", correct: true },
    ]);
    expect(snap.foodChoice).toBe("sardines");
  });

  it("1/2 et 0/2 restent distincts dans les données", () => {
    const base = { choices: [choice(1, "NOURRIR", "JOUER", "2026-01-01T10:00:00Z")], currentDay: 1, animalType: "PANDA" };
    const one = buildAnimationSnapshot({ ...base, guesses: [guess(1, "NOURRIR", "LAVER", "2026-01-01T11:00:00Z")] });
    const zero = buildAnimationSnapshot({ ...base, guesses: [guess(1, "CARESSER", "LAVER", "2026-01-01T11:00:00Z")] });
    expect(one.matches).toBe(1);
    expect(one.reactions).toEqual([{ action: "NOURRIR", correct: true }, { action: "LAVER", correct: false }]);
    expect(zero.matches).toBe(0);
    expect(zero.reactions.every((r) => !r.correct)).toBe(true);
  });

  it("aliment : seulement si Nourrir fait partie des réponses ; défaut compatible sinon", () => {
    const base = { choices: [choice(1, "NOURRIR", "JOUER", "2026-01-01T10:00:00Z")], currentDay: 1 };
    const noFeed = buildAnimationSnapshot({ ...base, animalType: "CHAT", guesses: [guess(1, "JOUER", "LAVER", "2026-01-01T11:00:00Z")] });
    expect(noFeed.foodChoice).toBeNull();
    const legacy = buildAnimationSnapshot({ ...base, animalType: "CHAT", guesses: [guess(1, "NOURRIR", "LAVER", "2026-01-01T11:00:00Z", null)] });
    expect(legacy.foodChoice).toBe("food");
    const invalidStored = buildAnimationSnapshot({ ...base, animalType: "CHAT", guesses: [guess(1, "NOURRIR", "LAVER", "2026-01-01T11:00:00Z", "meat")] });
    expect(invalidStored.foodChoice).toBe("food");
  });

  it("changement de jour sans nouveau choix : le dernier jour résolu est prolongé", () => {
    const snap = buildAnimationSnapshot({
      choices: [choice(1, "NOURRIR", "JOUER", "2026-01-01T10:00:00Z"), choice(2, "LAVER", "JOUER", "2026-01-02T10:00:00Z")],
      guesses: [guess(1, "NOURRIR", "JOUER", "2026-01-01T12:00:00Z"), guess(2, "LAVER", "CARESSER", "2026-01-02T12:00:00Z")],
      currentDay: 3, animalType: "CHAT",
    });
    expect(snap.choiceAt).toBeNull();
    expect(snap.resolvedAt).toBe("2026-01-02T12:00:00.000Z");
    expect(snap.matches).toBe(1);
  });

  it("un nouveau choix du jour courant l'emporte sur le résultat de la veille", () => {
    const snap = buildAnimationSnapshot({
      choices: [choice(1, "NOURRIR", "JOUER", "2026-01-01T10:00:00Z"), choice(2, "LAVER", "JOUER", "2026-01-02T10:00:00Z")],
      guesses: [guess(1, "NOURRIR", "JOUER", "2026-01-01T12:00:00Z")],
      currentDay: 2, animalType: "CHAT",
    });
    expect(snap).toMatchObject({ choiceAt: "2026-01-02T10:00:00.000Z", resolvedAt: null, matches: null, reactions: [] });
  });

  it("horodatage absent ou invalide : aucune exception, champs nuls", () => {
    const snap = buildAnimationSnapshot({
      choices: [{ dayNumber: 1, action1: "NOURRIR", action2: "JOUER" } as any],
      guesses: [{ dayNumber: 1, guessedAction1: "NOURRIR", guessedAction2: "JOUER", submittedAt: new Date("invalid") } as any],
      currentDay: 1, animalType: "CHAT",
    });
    expect(snap.choiceAt).toBeNull();
    expect(snap.resolvedAt).toBeNull();
    expect(snap.matches).toBe(2);
  });
});
