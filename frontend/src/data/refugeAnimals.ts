/**
 * Source unique pour les animaux du Refuge : ordre, emoji de secours, fichier PNG attendu.
 *
 * Liste officielle — reprise telle quelle de l'enum Prisma `RefugeAnimalType`
 * (backend/prisma/schema.prisma, section "LE REFUGE — Jeu anonyme 7 jours").
 * Ne rien ajouter, ne rien retirer, ne rien renommer sans mettre à jour ce
 * commentaire et vérifier l'enum backend en premier.
 */
export const REFUGE_ANIMALS = [
  "Hamster",
  "Lapin",
  "Chat",
  "Chien",
  "Renard",
  "Pingouin",
  "Iguane",
  "Panda",
  "Licorne",
  "Dragon",
] as const;

export type RefugeAnimal = (typeof REFUGE_ANIMALS)[number];

export const ANIMAL_EMOJIS: Record<RefugeAnimal, string> = {
  Hamster: "🐹",
  Lapin: "🐰",
  Chat: "🐱",
  Chien: "🐕",
  Renard: "🦊",
  Pingouin: "🐧",
  Iguane: "🦎",
  Panda: "🐼",
  Licorne: "🦄",
  Dragon: "🐉",
};

/** Nom de fichier attendu dans frontend/public/refuge/. Dépose le PNG sous ce nom exact pour qu'il s'affiche. */
export const ANIMAL_PNG_FILENAME: Record<RefugeAnimal, string> = {
  Hamster: "hamster_A.png",
  Lapin: "rabbit_A.png",
  Chat: "cat_A.png",
  Chien: "dog_A.png",
  Renard: "fox_A.png",
  Pingouin: "penguin_A.png",
  Iguane: "iguana_A.png",
  Panda: "panda_A.png",
  Licorne: "unicorn_A.png",
  Dragon: "dragon_A.png",
};
