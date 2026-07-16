import { RefugeAnimalType, RefugeAnimalCategory, RefugeAnimalSexe, RefugeAcceptedSexe, RefugeAction, RefugeSessionStatus, RefugePreexistingLinkType, RefugeBackground } from "@prisma/client";

// ============================================================
// Résultats métier pour Refuge
// ============================================================

export interface RefugeSessionDTO {
  id: string;
  adopteId: string;
  adoptantId: string | null;
  animalType: RefugeAnimalType;
  animalCategory: RefugeAnimalCategory;
  animalSexe: RefugeAnimalSexe;
  animalAgeMonths: number;
  acceptedSexe: RefugeAcceptedSexe;
  status: RefugeSessionStatus;
  createdAt: Date;
  startedAt: Date | null;
  endsAt: Date | null;
  preexistingLinkType: RefugePreexistingLinkType | null;
  background: RefugeBackground;
}

export interface DayResultData {
  matches: number; // 0, 1, or 2
  message: string;
  reward: number;
  emoji: string; // ❌, ❤️, or 🤍
}

// Phase finale — état du consentement au dévoilement, vu par UN participant.
// otherDecided est volontairement un booléen : on n'expose jamais la décision
// détaillée de l'autre tant que la session n'a pas atteint un état final.
export interface RevealState {
  available: boolean; // jour 7 terminé → le consentement peut être donné
  myDecision: "ACCEPT" | "REFUSE" | null;
  otherDecided: boolean;
  revealedAt: Date | null;
}

// Profil dévoilé après accord mutuel — champs publics uniquement
export interface RevealedProfile {
  userId: string;
  pseudo: string;
  bio: string | null;
  city: string | null;
}

export interface RefugeSessionWithMetadata extends RefugeSessionDTO {
  currentDay: number; // 1-7 ou 0 si pas commencé
  timeRemaining: {
    days: number;
    hours: number;
  };
  isActive: boolean;
  isCompleted: boolean;
  hearts: string[]; // 7 emoji: ❤️, ❌, or 🤍
  canAttemptToday: boolean;
  todaySubmitted: boolean;
  adopteSubmittedToday: boolean; // True si l'Adopté a vraiment soumis un choix aujourd'hui
  adoptantSubmittedToday: boolean; // True si l'Adoptant a soumis sa réponse du jour
  dayCompleted: boolean; // adopteSubmittedToday && adoptantSubmittedToday (jour courant)
  canAdvanceDay: boolean; // dayCompleted && currentDay < 7 (outil DEV "jour suivant")
  finalConsentAvailable: boolean; // dayCompleted && currentDay === 7
  todayActions?: {
    action1: RefugeAction;
    action2: RefugeAction;
  } | null; // Inclus uniquement pour l'adopté si adopteSubmittedToday=true
  todayResult?: DayResultData | null; // Résultat du jour courant si une tentative a été soumise
  reveal?: RevealState; // Phase finale (présent dès que la session a un adoptant)
  otherProfile?: RevealedProfile | null; // Uniquement si status === REVEALED
}

export interface RefugeProposalInput {
  animalType: RefugeAnimalType;
  acceptedSexe: RefugeAcceptedSexe;
}

export interface RefugeTimeRemaining {
  days: number;
  hours: number;
  milliseconds: number;
}
