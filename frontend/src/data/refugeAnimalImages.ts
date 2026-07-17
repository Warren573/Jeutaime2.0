/**
 * Illustrations locales du Refuge (assets Metro, chargés via require).
 *
 * Fichier séparé de refugeAnimals.ts : les require() d'images ne sont
 * résolubles que par Metro/Expo — les données pures (labels, emojis, guards)
 * restent importables par les tests Node.
 *
 * Seuls assets réellement présents dans le dépôt :
 * frontend/assets/images/pets/pet_*.png (7 animaux sur 10).
 * HAMSTER, LAPIN et CHIEN n'ont pas de PNG fourni : `null` → fallback emoji.
 * Dépose pet_hamster.png / pet_rabbit.png / pet_dog.png dans ce dossier puis
 * remplace le `null` par un require() pour activer l'image.
 */
import { type RefugeAnimal, isRefugeAnimal } from "./refugeAnimals";

export const ANIMAL_IMAGES: Record<RefugeAnimal, number | null> = {
  HAMSTER: null,
  LAPIN: null,
  CHAT: require("../../assets/images/pets/pet_cat.png"),
  CHIEN: null,
  RENARD: require("../../assets/images/pets/pet_fox.png"),
  PINGOUIN: require("../../assets/images/pets/pet_penguin.png"),
  IGUANE: require("../../assets/images/pets/pet_iguana.png"),
  PANDA: require("../../assets/images/pets/pet_panda.png"),
  LICORNE: require("../../assets/images/pets/pet_unicorn.png"),
  DRAGON: require("../../assets/images/pets/pet_dragon.png"),
};

/** Source d'image locale pour une valeur serveur, ou null si aucun asset fourni. */
export function getAnimalImage(animalType: string | null | undefined): number | null {
  return isRefugeAnimal(animalType) ? ANIMAL_IMAGES[animalType] : null;
}
