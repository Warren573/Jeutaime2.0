/**
 * Illustrations locales du Refuge (assets Metro, chargés via require).
 *
 * Fichier séparé de refugeAnimals.ts : les require() d'images ne sont
 * résolubles que par Metro/Expo — les données pures (labels, emojis, guards)
 * restent importables par les tests Node.
 *
 * Tous les 10 animaux ont maintenant un PNG fourni dans
 * frontend/assets/images/pets/pet_*.png
 */
import { type RefugeAnimal, isRefugeAnimal } from "./refugeAnimals";

export const ANIMAL_IMAGES: Record<RefugeAnimal, number | null> = {
  HAMSTER: (() => {
    try { return require("../../assets/images/pets/pet_hamster.png"); } catch { return null; }
  })(),
  LAPIN: (() => {
    try { return require("../../assets/images/pets/pet_rabbit.png"); } catch { return null; }
  })(),
  CHAT: (() => {
    try { return require("../../assets/images/pets/pet_cat.png"); } catch { return null; }
  })(),
  CHIEN: (() => {
    try { return require("../../assets/images/pets/pet_dog.png"); } catch { return null; }
  })(),
  RENARD: null,
  PINGOUIN: null,
  IGUANE: (() => {
    try { return require("../../assets/images/pets/pet_iguana.png"); } catch { return null; }
  })(),
  PANDA: (() => {
    try { return require("../../assets/images/pets/pet_panda.png"); } catch { return null; }
  })(),
  LICORNE: null,
  DRAGON: null,
};

/** Source d'image locale pour une valeur serveur, ou null si aucun asset fourni. */
export function getAnimalImage(animalType: string | null | undefined): number | null {
  return isRefugeAnimal(animalType) ? ANIMAL_IMAGES[animalType] : null;
}
