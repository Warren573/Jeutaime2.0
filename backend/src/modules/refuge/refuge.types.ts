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
  todayActions?: {
    action1: RefugeAction;
    action2: RefugeAction;
  } | null; // Inclus uniquement pour l'adopté
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
