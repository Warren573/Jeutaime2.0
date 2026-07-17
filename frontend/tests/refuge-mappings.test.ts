/**
 * Mappings Refuge — les clés frontend doivent être EXACTEMENT les valeurs
 * des enums Prisma backend (RefugeAnimalType, RefugeAnimalSexe,
 * RefugeBackground) : ni valeur manquante, ni valeur supplémentaire,
 * ni variante localisée ("Chat", "forêt", "Mâle").
 */
import { describe, it, expect } from "vitest";
import {
  REFUGE_ANIMALS,
  ANIMAL_LABELS,
  ANIMAL_EMOJIS,
  ANIMAL_SEXE_SYMBOLS,
  isRefugeAnimal,
  getAnimalEmoji,
  getAnimalLabel,
  getAnimalSexeSymbol,
} from "../src/data/refugeAnimals";
import {
  REFUGE_BACKGROUND_IDS,
  REFUGE_BACKGROUNDS,
  DEFAULT_REFUGE_BACKGROUND,
  isRefugeBackground,
  getBackgroundGradientStyle,
  getBackgroundLabel,
} from "../src/data/refugeBackgrounds";

// Valeurs canoniques — copie de l'enum Prisma RefugeAnimalType (schema.prisma)
const PRISMA_ANIMAL_TYPES = [
  "HAMSTER", "LAPIN", "CHAT", "CHIEN", "RENARD",
  "PINGOUIN", "IGUANE", "PANDA", "LICORNE", "DRAGON",
] as const;

// Copie de l'enum Prisma RefugeBackground
const PRISMA_BACKGROUNDS = [
  "FORET", "PLAGE", "NEIGE", "AUTOMNE", "MONTAGNE", "NUIT_ETOILEE",
] as const;

// Copie de l'enum Prisma RefugeAnimalSexe
const PRISMA_ANIMAL_SEXES = ["MALE", "FEMELLE", "NEUTRE"] as const;

describe("Mapping des 10 animaux", () => {
  it("REFUGE_ANIMALS couvre exactement les valeurs de l'enum backend", () => {
    expect([...REFUGE_ANIMALS].sort()).toEqual([...PRISMA_ANIMAL_TYPES].sort());
  });

  it("ANIMAL_LABELS couvre exactement les 10 valeurs, sans extra ni manque", () => {
    expect(Object.keys(ANIMAL_LABELS).sort()).toEqual([...PRISMA_ANIMAL_TYPES].sort());
  });

  it("ANIMAL_EMOJIS couvre exactement les 10 valeurs, sans extra ni manque", () => {
    expect(Object.keys(ANIMAL_EMOJIS).sort()).toEqual([...PRISMA_ANIMAL_TYPES].sort());
  });

  it("chaque animal a un label et un emoji non vides", () => {
    for (const animal of REFUGE_ANIMALS) {
      expect(ANIMAL_LABELS[animal].length).toBeGreaterThan(0);
      expect(ANIMAL_EMOJIS[animal].length).toBeGreaterThan(0);
    }
  });

  it("isRefugeAnimal accepte les valeurs backend et rejette les variantes localisées", () => {
    expect(isRefugeAnimal("CHAT")).toBe(true);
    expect(isRefugeAnimal("Chat")).toBe(false);
    expect(isRefugeAnimal("OISEAU")).toBe(false);
    expect(isRefugeAnimal("Perroquet")).toBe(false);
    expect(isRefugeAnimal(null)).toBe(false);
    expect(isRefugeAnimal(undefined)).toBe(false);
  });
});

describe("Fallback emoji / label", () => {
  it("getAnimalEmoji retourne l'emoji pour une valeur backend", () => {
    expect(getAnimalEmoji("DRAGON")).toBe("🐉");
  });

  it("getAnimalEmoji retombe sur 🐾 pour une valeur inconnue", () => {
    expect(getAnimalEmoji("OISEAU")).toBe("🐾");
    expect(getAnimalEmoji(null)).toBe("🐾");
  });

  it("getAnimalLabel retourne le libellé français pour une valeur backend", () => {
    expect(getAnimalLabel("CHAT")).toBe("Chat");
  });
});

describe("Mapping des 6 backgrounds", () => {
  it("REFUGE_BACKGROUND_IDS couvre exactement les valeurs de l'enum backend", () => {
    expect([...REFUGE_BACKGROUND_IDS].sort()).toEqual([...PRISMA_BACKGROUNDS].sort());
  });

  it("REFUGE_BACKGROUNDS couvre exactement les 6 valeurs, sans extra ni manque", () => {
    expect(Object.keys(REFUGE_BACKGROUNDS).sort()).toEqual([...PRISMA_BACKGROUNDS].sort());
  });

  it("chaque entrée a un id métier égal à sa clé (valeur envoyée à l'API)", () => {
    for (const id of REFUGE_BACKGROUND_IDS) {
      expect(REFUGE_BACKGROUNDS[id].id).toBe(id);
    }
  });

  it("le défaut frontend est aligné sur le défaut Prisma (FORET)", () => {
    expect(DEFAULT_REFUGE_BACKGROUND).toBe("FORET");
  });

  it("isRefugeBackground rejette les variantes localisées et 'default'", () => {
    expect(isRefugeBackground("FORET")).toBe(true);
    expect(isRefugeBackground("forêt")).toBe(false);
    expect(isRefugeBackground("nuit_étoilée")).toBe(false);
    expect(isRefugeBackground("default")).toBe(false);
  });

  it("getBackgroundGradientStyle retombe sur FORET pour une valeur inconnue", () => {
    expect(getBackgroundGradientStyle("inconnu")).toEqual(
      getBackgroundGradientStyle("FORET")
    );
    expect(getBackgroundGradientStyle(null)).toEqual(getBackgroundGradientStyle("FORET"));
  });

  it("getBackgroundLabel retourne le libellé français", () => {
    expect(getBackgroundLabel("NUIT_ETOILEE")).toBe("Nuit Étoilée");
  });
});

describe("Mapping des sexes", () => {
  it("couvre exactement les valeurs de l'enum backend RefugeAnimalSexe", () => {
    expect(Object.keys(ANIMAL_SEXE_SYMBOLS).sort()).toEqual([...PRISMA_ANIMAL_SEXES].sort());
  });

  it("MALE → ♂️, FEMELLE → ♀️, NEUTRE → symbole neutre explicite", () => {
    expect(getAnimalSexeSymbol("MALE")).toBe("♂️");
    expect(getAnimalSexeSymbol("FEMELLE")).toBe("♀️");
    expect(getAnimalSexeSymbol("NEUTRE")).toBe("⚧️");
  });

  it("une valeur inconnue ou localisée retourne un fallback vide — jamais ♀️ par défaut", () => {
    expect(getAnimalSexeSymbol("Mâle")).toBe("");
    expect(getAnimalSexeSymbol("Femelle")).toBe("");
    expect(getAnimalSexeSymbol(null)).toBe("");
    expect(getAnimalSexeSymbol(undefined)).toBe("");
  });
});
