/**
 * Source unique pour les animaux du Refuge : clés métier, libellés, emoji de
 * secours, fichier PNG attendu.
 *
 * Les CLÉS sont les valeurs EXACTES de l'enum Prisma `RefugeAnimalType`
 * (backend/prisma/schema.prisma, section "LE REFUGE — Jeu anonyme 7 jours") :
 * c'est ce que l'API envoie et attend. Les libellés français ne servent qu'à
 * l'affichage. Ne rien ajouter, retirer ou renommer sans vérifier l'enum
 * backend en premier.
 */
export const REFUGE_ANIMALS = [
  "HAMSTER",
  "LAPIN",
  "CHAT",
  "CHIEN",
  "RENARD",
  "PINGOUIN",
  "IGUANE",
  "PANDA",
  "LICORNE",
  "DRAGON",
] as const;

export type RefugeAnimal = (typeof REFUGE_ANIMALS)[number];

/** Garde de type : valide une valeur venue du serveur contre l'enum. */
export function isRefugeAnimal(value: string | null | undefined): value is RefugeAnimal {
  return typeof value === "string" && (REFUGE_ANIMALS as readonly string[]).includes(value);
}

export const ANIMAL_LABELS: Record<RefugeAnimal, string> = {
  HAMSTER: "Hamster",
  LAPIN: "Lapin",
  CHAT: "Chat",
  CHIEN: "Chien",
  RENARD: "Renard",
  PINGOUIN: "Pingouin",
  IGUANE: "Iguane",
  PANDA: "Panda",
  LICORNE: "Licorne",
  DRAGON: "Dragon",
};

export const ANIMAL_EMOJIS: Record<RefugeAnimal, string> = {
  HAMSTER: "🐹",
  LAPIN: "🐰",
  CHAT: "🐱",
  CHIEN: "🐕",
  RENARD: "🦊",
  PINGOUIN: "🐧",
  IGUANE: "🦎",
  PANDA: "🐼",
  LICORNE: "🦄",
  DRAGON: "🐉",
};

/** Emoji de secours pour une valeur serveur, avec fallback neutre. */
export function getAnimalEmoji(animalType: string | null | undefined): string {
  return isRefugeAnimal(animalType) ? ANIMAL_EMOJIS[animalType] : "🐾";
}

/** Libellé affichable pour une valeur serveur, avec fallback sur la valeur brute. */
export function getAnimalLabel(animalType: string | null | undefined): string {
  return isRefugeAnimal(animalType) ? ANIMAL_LABELS[animalType] : (animalType ?? "");
}

/**
 * Sexe de l'animal — clés = valeurs EXACTES de l'enum Prisma `RefugeAnimalSexe`.
 * Une valeur inconnue retourne un fallback vide explicite, jamais ♀️ par défaut.
 */
export const ANIMAL_SEXE_SYMBOLS: Record<string, string> = {
  MALE: "♂️",
  FEMELLE: "♀️",
  NEUTRE: "⚧️",
};

export function getAnimalSexeSymbol(animalSexe: string | null | undefined): string {
  return (animalSexe && ANIMAL_SEXE_SYMBOLS[animalSexe]) || "";
}
