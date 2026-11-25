import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RefugeAction } from "@prisma/client";
import { BadRequestError } from "../../src/core/errors";
import {
  ANIMAL_FOODS,
  REFUGE_FOODS,
  allowedFoods,
  displayFood,
  resolveGuessFood,
} from "../../src/modules/refuge/refuge.foods";

// Liste validée par le produit — ne rien ajouter sans décision explicite.
const SPEC: Record<string, string[]> = {
  CHIEN: ["food", "meat"],
  CHAT: ["food", "fish", "sardines"],
  LAPIN: ["salad", "carrot"],
  HAMSTER: ["seeds", "carrot"],
  TOUCAN: ["seeds"],
  RENARD: ["meat", "fish"],
  MANCHOT: ["fish", "sardines"],
  IGUANE: ["salad", "carrot"],
  LICORNE: ["salad", "carrot"],
  PERROQUET: ["seeds"],
  PANDA: ["bamboo"],
  DRAGON: ["meat", "fish"],
};

const root = resolve(__dirname, "../../..");
const NOURRIR = RefugeAction.NOURRIR;
const JOUER = RefugeAction.JOUER;

describe("aliments par animal", () => {
  it("correspond exactement à la liste validée, pour les 12 animaux", () => {
    expect(Object.keys(ANIMAL_FOODS).sort()).toEqual(Object.keys(SPEC).sort());
    for (const [animal, foods] of Object.entries(SPEC)) {
      expect([...allowedFoods(animal)], animal).toEqual(foods);
    }
  });

  it("interdits explicites : pas de poisson pour le chien, pas de viande pour le chat", () => {
    expect(allowedFoods("CHIEN")).not.toContain("fish");
    expect(allowedFoods("CHAT")).not.toContain("meat");
  });

  it("chaque aliment possède son PNG de gamelle, ainsi que la gamelle vide", () => {
    for (const food of REFUGE_FOODS) {
      expect(existsSync(resolve(root, `frontend/assets/images/refuge/bowls/bowl-${food}.png`)), food).toBe(true);
    }
    expect(existsSync(resolve(root, "frontend/assets/images/refuge/bowls/bowl-empty.png"))).toBe(true);
  });

  it("est identique à la table du frontend (refugeBowls.ts)", () => {
    const source = readFileSync(resolve(root, "frontend/src/data/refugeBowls.ts"), "utf8");
    const block = source.slice(source.indexOf("ANIMAL_FOODS"));
    for (const [animal, foods] of Object.entries(SPEC)) {
      const match = block.match(new RegExp(`${animal}:\\s*\\[([^\\]]*)\\]`));
      expect(match, animal).not.toBeNull();
      const parsed = (match![1] ?? "").split(",").map((s) => s.replace(/['"\s]/g, "")).filter(Boolean);
      expect(parsed, animal).toEqual(foods);
    }
  });
});

describe("resolveGuessFood", () => {
  it("aliment unique : sélectionné automatiquement quand Nourrir est choisi", () => {
    expect(resolveGuessFood("PANDA", [NOURRIR, JOUER], undefined)).toBe("bamboo");
    expect(resolveGuessFood("TOUCAN", [JOUER, NOURRIR], null)).toBe("seeds");
    expect(resolveGuessFood("PERROQUET", [NOURRIR, JOUER], undefined)).toBe("seeds");
  });

  it("plusieurs aliments : le choix envoyé est conservé", () => {
    expect(resolveGuessFood("CHAT", [NOURRIR, JOUER], "sardines")).toBe("sardines");
    expect(resolveGuessFood("DRAGON", [NOURRIR, JOUER], "meat")).toBe("meat");
  });

  it("plusieurs aliments sans choix (ancien client) : null, jamais bloquant", () => {
    expect(resolveGuessFood("CHAT", [NOURRIR, JOUER], undefined)).toBeNull();
    expect(resolveGuessFood("LAPIN", [JOUER, NOURRIR], null)).toBeNull();
  });

  it("refuse un aliment incompatible avec l'animal", () => {
    expect(() => resolveGuessFood("CHIEN", [NOURRIR, JOUER], "fish")).toThrow(BadRequestError);
    expect(() => resolveGuessFood("CHAT", [NOURRIR, JOUER], "meat")).toThrow(BadRequestError);
    expect(() => resolveGuessFood("PANDA", [NOURRIR, JOUER], "carrot")).toThrow(BadRequestError);
    expect(() => resolveGuessFood("CHAT", [NOURRIR, JOUER], "pizza")).toThrow(BadRequestError);
  });

  it("refuse tout aliment sans l'action Nourrir, et n'en persiste aucun", () => {
    expect(() => resolveGuessFood("CHAT", [JOUER, RefugeAction.LAVER], "fish")).toThrow(BadRequestError);
    expect(resolveGuessFood("PANDA", [JOUER, RefugeAction.LAVER], undefined)).toBeNull();
  });
});

describe("displayFood (anciennes données)", () => {
  it("rend l'aliment enregistré s'il est valide, sinon le premier compatible", () => {
    expect(displayFood("CHAT", "sardines")).toBe("sardines");
    expect(displayFood("CHAT", null)).toBe("food");
    expect(displayFood("CHAT", "meat")).toBe("food");
    expect(displayFood("PANDA", undefined)).toBe("bamboo");
    expect(displayFood("INCONNU", "fish")).toBeNull();
  });
});
