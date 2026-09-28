/**
 * Illustrations locales du Refuge (assets Metro, chargés via require).
 *
 * Chaque animal possède exactement 5 états visuels :
 * assis, content, boude, dort, joue.
 */
import { type RefugeAnimal, isRefugeAnimal } from "./refugeAnimals";

export const REFUGE_ANIMAL_VISUAL_STATES = [
  "assis",
  "content",
  "boude",
  "dort",
  "joue",
] as const;

export type RefugeAnimalVisualState = (typeof REFUGE_ANIMAL_VISUAL_STATES)[number];

type AnimalStateImages = Record<RefugeAnimalVisualState, number>;

export const ANIMAL_IMAGES: Record<RefugeAnimal, AnimalStateImages> = {
  HAMSTER: {
    assis: require("../../assets/images/pets/hamster_assis_256.png"),
    content: require("../../assets/images/pets/hamster_content_256.png"),
    boude: require("../../assets/images/pets/hamster_boude_256.png"),
    dort: require("../../assets/images/pets/hamster_dort_256.png"),
    joue: require("../../assets/images/pets/hamster_joue_256.png"),
  },
  LAPIN: {
    assis: require("../../assets/images/pets/lapin_assis_256.png"),
    content: require("../../assets/images/pets/lapin_content_256.png"),
    boude: require("../../assets/images/pets/lapin_boude_256.png"),
    dort: require("../../assets/images/pets/lapin_dort_256.png"),
    joue: require("../../assets/images/pets/lapin_joue_256.png"),
  },
  CHAT: {
    assis: require("../../assets/images/pets/chat_assis_256.png"),
    content: require("../../assets/images/pets/chat_content_256.png"),
    boude: require("../../assets/images/pets/chat_boude_256.png"),
    dort: require("../../assets/images/pets/chat_dort_256.png"),
    joue: require("../../assets/images/pets/chat_joue_256.png"),
  },
  CHIEN: {
    assis: require("../../assets/images/pets/chien_assis_256.png"),
    content: require("../../assets/images/pets/chien_content_256.png"),
    boude: require("../../assets/images/pets/chien_boude_256.png"),
    dort: require("../../assets/images/pets/chien_dort_256.png"),
    joue: require("../../assets/images/pets/chien_joue_256.png"),
  },
  RENARD: {
    assis: require("../../assets/images/pets/renard_assis_256.png"),
    content: require("../../assets/images/pets/renard_content_256.png"),
    boude: require("../../assets/images/pets/renard_boude_256.png"),
    dort: require("../../assets/images/pets/renard_dort_256.png"),
    joue: require("../../assets/images/pets/renard_joue_256.png"),
  },
  MANCHOT: {
    assis: require("../../assets/images/pets/manchot_assis_256.png"),
    content: require("../../assets/images/pets/manchot_content_256.png"),
    boude: require("../../assets/images/pets/manchot_boude_256.png"),
    dort: require("../../assets/images/pets/manchot_dort_256.png"),
    joue: require("../../assets/images/pets/manchot_joue_256.png"),
  },
  IGUANE: {
    assis: require("../../assets/images/pets/iguane_assis_256.png"),
    content: require("../../assets/images/pets/iguane_content_256.png"),
    boude: require("../../assets/images/pets/iguane_boude_256.png"),
    dort: require("../../assets/images/pets/iguane_dort_256.png"),
    joue: require("../../assets/images/pets/iguane_joue_256.png"),
  },
  PANDA: {
    assis: require("../../assets/images/pets/panda_assis_256.png"),
    content: require("../../assets/images/pets/panda_content_256.png"),
    boude: require("../../assets/images/pets/panda_boude_256.png"),
    dort: require("../../assets/images/pets/panda_dort_256.png"),
    joue: require("../../assets/images/pets/panda_joue_256.png"),
  },
  LICORNE: {
    assis: require("../../assets/images/pets/licorne_assis_256.png"),
    content: require("../../assets/images/pets/licorne_content_256.png"),
    boude: require("../../assets/images/pets/licorne_boude_256.png"),
    dort: require("../../assets/images/pets/licorne_dort_256.png"),
    joue: require("../../assets/images/pets/licorne_joue_256.png"),
  },
  DRAGON: {
    assis: require("../../assets/images/pets/dragon_assis_256.png"),
    content: require("../../assets/images/pets/dragon_content_256.png"),
    boude: require("../../assets/images/pets/dragon_boude_256.png"),
    dort: require("../../assets/images/pets/dragon_dort_256.png"),
    joue: require("../../assets/images/pets/dragon_joue_assis_256.png"),
  },
  TOUCAN: {
    assis: require("../../assets/images/pets/toucan_assis_256.png"),
    content: require("../../assets/images/pets/toucan_content_256.png"),
    boude: require("../../assets/images/pets/toucan_boude_256.png"),
    dort: require("../../assets/images/pets/toucan_dort_256.png"),
    joue: require("../../assets/images/pets/toucan_joue_256.png"),
  },
  PERROQUET: {
    assis: require("../../assets/images/pets/perroquet_assis_256.png"),
    content: require("../../assets/images/pets/perroquet_content_256.png"),
    boude: require("../../assets/images/pets/perroquet_boude_256.png"),
    dort: require("../../assets/images/pets/perroquet_dort_256.png"),
    joue: require("../../assets/images/pets/perroquet_joue_256.png"),
  },
};

export function getAnimalImage(
  animalType: string | null | undefined,
  state: RefugeAnimalVisualState = "assis"
): number | null {
  return isRefugeAnimal(animalType) ? ANIMAL_IMAGES[animalType][state] : null;
}
