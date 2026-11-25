import type { RefugeAction } from "@prisma/client";
import { calculateDayResult } from "./refuge.utils";
import { displayFood } from "./refuge.foods";

/**
 * Données temporelles de l'animation du compagnon, identiques pour les deux
 * participants et pour tous les écrans (Refuge, case de l'accueil).
 *
 * Le client calcule l'image à afficher LOCALEMENT à partir de ces horodatages :
 * aucune requête n'est nécessaire à chaque changement de PNG.
 *
 * Confidentialité : tant que le parrain / la marraine n'a pas validé, seul
 * `choiceAt` (heure du choix du compagnon) est renseigné — jamais les actions.
 * `matches`, `reactions` et `foodChoice` n'existent qu'une fois le jour résolu.
 */
export interface RefugeAnimationSnapshot {
  /** Heure à laquelle le compagnon a validé ses deux actions du jour courant. */
  choiceAt: string | null;
  /** Heure de validation du parrain / de la marraine (= résultat du jour). */
  resolvedAt: string | null;
  /** 0, 1 ou 2 — conservé distinct dans les données. */
  matches: number | null;
  /** Une entrée par action choisie par le parrain / la marraine, dans l'ordre de saisie. */
  reactions: { action: RefugeAction; correct: boolean }[];
  /** Aliment à afficher dans la gamelle, si Nourrir fait partie des réponses. */
  foodChoice: string | null;
}

interface ChoiceLike {
  dayNumber: number;
  action1: RefugeAction;
  action2: RefugeAction;
  submittedAt: Date;
}
interface GuessLike {
  dayNumber: number;
  guessedAction1: RefugeAction;
  guessedAction2: RefugeAction;
  foodChoice?: string | null;
  submittedAt: Date;
}

/** Horodatage ISO, ou null si la valeur est absente ou invalide (jamais d'exception). */
function iso(value: unknown): string | null {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : null;
}

const EMPTY: RefugeAnimationSnapshot = {
  choiceAt: null,
  resolvedAt: null,
  matches: null,
  reactions: [],
  foodChoice: null,
};

function resolvedSnapshot(
  choice: ChoiceLike,
  guess: GuessLike,
  animalType: string,
  withChoiceAt: boolean
): RefugeAnimationSnapshot {
  const guessed = [guess.guessedAction1, guess.guessedAction2];
  const feeds = guessed.includes("NOURRIR" as RefugeAction);
  return {
    choiceAt: withChoiceAt ? iso(choice.submittedAt) : null,
    resolvedAt: iso(guess.submittedAt),
    matches: calculateDayResult(choice, guess).matches,
    reactions: guessed.map((action) => ({
      action,
      correct: action === choice.action1 || action === choice.action2,
    })),
    foodChoice: feeds ? displayFood(animalType, guess.foodChoice) : null,
  };
}

/**
 * Jour courant avec choix + réponse : cycle « résultat ».
 * Jour courant avec choix seul : attente du parrain / de la marraine.
 * Jour courant sans choix : on prolonge le dernier jour résolu (le cycle d'une
 * heure peut franchir le changement de jour, puis le compagnon reste endormi
 * jusqu'au prochain cycle quotidien).
 */
export function buildAnimationSnapshot(args: {
  choices: readonly ChoiceLike[];
  guesses: readonly GuessLike[];
  currentDay: number;
  animalType: string;
}): RefugeAnimationSnapshot {
  const { choices, guesses, currentDay, animalType } = args;
  const todayChoice = choices.find((c) => c.dayNumber === currentDay);
  const todayGuess = guesses.find((g) => g.dayNumber === currentDay);

  if (todayChoice && todayGuess) return resolvedSnapshot(todayChoice, todayGuess, animalType, true);
  if (todayChoice) return { ...EMPTY, choiceAt: iso(todayChoice.submittedAt) };

  let latest: { choice: ChoiceLike; guess: GuessLike } | null = null;
  for (const guess of guesses) {
    if (guess.dayNumber >= currentDay) continue;
    const choice = choices.find((c) => c.dayNumber === guess.dayNumber);
    if (choice && (!latest || guess.dayNumber > latest.guess.dayNumber)) latest = { choice, guess };
  }
  return latest ? resolvedSnapshot(latest.choice, latest.guess, animalType, false) : { ...EMPTY };
}
