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
  HAMSTER: require("../../assets/images/pets/pet_hamster.png"),
  LAPIN: require("../../assets/images/pets/pet_rabbit.png"),
  CHAT: require("../../assets/images/pets/pet_cat.png"),
  CHIEN: require("../../assets/images/pets/pet_dog.png"),
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
