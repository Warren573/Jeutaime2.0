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
  acceptedSexe: RefugeAcceptedSexe;
  status: RefugeSessionStatus;
  createdAt: Date;
  startedAt: Date | null;
  endsAt: Date | null;
  preexistingLinkType: RefugePreexistingLinkType | null;
  background: RefugeBackground;
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
}

export interface RefugeDailyChoiceDTO {
  id: string;
  refugeSessionId: string;
  dayNumber: number;
  action1: RefugeAction;
  action2: RefugeAction;
  submittedAt: Date;
}

export interface RefugeProposalInput {
  animalType: RefugeAnimalType;
  acceptedSexe: RefugeAcceptedSexe;
}

export interface RefugeDailyChoiceInput {
  action1: RefugeAction;
  action2: RefugeAction;
}

export interface RefugeTimeRemaining {
  days: number;
  hours: number;
  milliseconds: number;
}
