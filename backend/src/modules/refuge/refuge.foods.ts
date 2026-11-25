import { RefugeAction, RefugeAnimalType } from "@prisma/client";
import { BadRequestError } from "../../core/errors";

/**
 * Aliments du Refuge : un PNG de gamelle existe pour chacun
 * (frontend/assets/images/refuge/bowls/bowl-<aliment>.png).
 *
 * Cette table est la source de vérité côté serveur ; elle est comparée à
 * frontend/src/data/refugeBowls.ts par un test pour éviter toute divergence.
 */
export const REFUGE_FOODS = [
  "food",
  "meat",
  "fish",
  "salad",
  "carrot",
  "bamboo",
  "seeds",
  "sardines",
] as const;

export type RefugeFood = (typeof REFUGE_FOODS)[number];

export const ANIMAL_FOODS: Record<RefugeAnimalType, readonly RefugeFood[]> = {
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

export function allowedFoods(animalType: string): readonly RefugeFood[] {
  return (ANIMAL_FOODS as Record<string, readonly RefugeFood[]>)[animalType] ?? [];
}

/**
 * Valide et normalise l'aliment envoyé avec la tentative du jour.
 *
 *  - aucun aliment sans l'action Nourrir : une valeur reçue sans Nourrir est refusée ;
 *  - aliment incompatible avec l'animal : refusé ;
 *  - animal à aliment unique : sélectionné automatiquement ;
 *  - animal à plusieurs aliments et aucun choix reçu (ancien client) : null, la
 *    restitution applique alors `displayFood` — la tentative n'est jamais bloquée.
 */
export function resolveGuessFood(
  animalType: string,
  guessedActions: readonly RefugeAction[],
  requested: string | null | undefined
): RefugeFood | null {
  const feeds = guessedActions.includes(RefugeAction.NOURRIR);
  const foods = allowedFoods(animalType);
  if (requested !== undefined && requested !== null) {
    if (!feeds) throw new BadRequestError("Un aliment ne peut être choisi qu’avec l’action Nourrir");
    if (!(foods as readonly string[]).includes(requested)) {
      throw new BadRequestError("Aliment incompatible avec cet animal");
    }
    return requested as RefugeFood;
  }
  if (!feeds) return null;
  return foods.length === 1 ? (foods[0] ?? null) : null;
}

/** Aliment à afficher : celui enregistré s'il est valide, sinon le premier compatible. */
export function displayFood(animalType: string, stored: string | null | undefined): RefugeFood | null {
  const foods = allowedFoods(animalType);
  if (stored && (foods as readonly string[]).includes(stored)) return stored as RefugeFood;
  return foods[0] ?? null;
}
