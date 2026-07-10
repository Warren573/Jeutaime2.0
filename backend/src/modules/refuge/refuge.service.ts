import { prisma } from "../../config/prisma";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../core/errors";
import { RefugeSessionStatus, RefugeAction, Gender, RefugeBackground } from "@prisma/client";
import type { RefugeSessionDTO, RefugeSessionWithMetadata, RefugeDailyChoiceDTO, RefugeProposalInput, RefugeDailyChoiceInput } from "./refuge.types";
import {
  calculateRefugeEndsAt,
  getCurrentDay,
  getTimeRemaining,
  isRefugeExpired,
  canSubmitDailyChoice,
  validateActionsAreDifferent,
  isValidDay,
  REFUGE_DURATION_DAYS,
  calculateHearts,
  canAttemptTodayForDay,
  todaySubmittedForDay,
  calculateStartedAtForDay,
  generateRandomSexe,
  generateAnimalCategory,
  generateRandomAge,
} from "./refuge.utils";

// ============================================================
// RefugeService — Logique métier du Refuge
// ============================================================

export class RefugeService {
  // ============================================================
  // Proposition — L'Adopté propose un refuge
  // ============================================================

  static async proposeAsAdopte(
    adopteId: string,
    input: RefugeProposalInput
  ): Promise<RefugeSessionDTO> {
    // Valider que l'Adopté existe
    const adopte = await prisma.user.findUnique({
      where: { id: adopteId },
    });
    if (!adopte) {
      throw new NotFoundError("Utilisateur non trouvé");
    }

    // Vérifier que l'Adopté n'a pas déjà un refuge en cours/attente
    const existingRefuge = await prisma.refugeSession.findFirst({
      where: {
        adopteId,
        status: {
          in: [RefugeSessionStatus.CREATION, RefugeSessionStatus.WAITING_FOR_ADOPTANT, RefugeSessionStatus.ACTIVE],
        },
      },
    });

    if (existingRefuge) {
      throw new ConflictError("Tu as déjà un refuge en cours ou en attente");
    }

    // Générer automatiquement les propriétés de l'animal côté backend
    const animalSexe = generateRandomSexe();
    const animalCategory = generateAnimalCategory(input.animalType);
    const animalAgeMonths = generateRandomAge(input.animalType);

    // Créer la session Refuge
    const refugeSession = await prisma.refugeSession.create({
      data: {
        adopteId,
        animalType: input.animalType,
        animalCategory,
        animalSexe,
        animalAgeMonths,
        acceptedSexe: input.acceptedSexe,
        status: RefugeSessionStatus.WAITING_FOR_ADOPTANT,
        endsAt: calculateRefugeEndsAt(new Date()),
      },
    });

    return this.mapToDTO(refugeSession);
  }

  // ============================================================
  // Découverte — L'Adoptant trouve des refuges disponibles
  // ============================================================

  static async getAvailableRefuges(currentUserId: string, adoptantGender?: string): Promise<RefugeSessionDTO[]> {
    const query: any = {
      where: {
        status: RefugeSessionStatus.WAITING_FOR_ADOPTANT,
        endsAt: {
          gt: new Date(),
        },
        adopteId: {
          not: currentUserId,
        },
      },
    };

    if (adoptantGender) {
      query.where.acceptedSexe = {
        in: this.getAcceptedSexeFilters(adoptantGender),
      };
    }

    const refuges = await prisma.refugeSession.findMany(query);
    return refuges.map((r) => this.mapToDTO(r));
  }

  // ============================================================
  // Adoption — L'Adoptant rejoint un refuge
  // ============================================================

  static async adoptRefuge(adoptantId: string, refugeSessionId: string): Promise<RefugeSessionDTO> {
    // Vérifier que l'Adoptant existe
    const adoptant = await prisma.user.findUnique({
      where: { id: adoptantId },
      select: { id: true, profile: { select: { gender: true } } },
    });

    if (!adoptant) {
      throw new NotFoundError("Utilisateur non trouvé");
    }

    // Récupérer la session Refuge
    const refugeSession = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
    });

    if (!refugeSession) {
      throw new NotFoundError("Refuge non trouvé");
    }

    // Vérifier que le refuge est disponible
    if (refugeSession.status !== RefugeSessionStatus.WAITING_FOR_ADOPTANT) {
      throw new ConflictError("Ce refuge n'est plus disponible");
    }

    // Vérifier que le refuge n'est pas expiré
    if (isRefugeExpired(refugeSession.endsAt)) {
      throw new ConflictError("Ce refuge a expiré");
    }

    // Vérifier que l'Adoptant n'est pas l'Adopté
    if (adoptantId === refugeSession.adopteId) {
      throw new ForbiddenError("Tu ne peux pas adopter ton propre refuge");
    }

    // Vérifier le sexe de l'Adoptant matches l'acceptedSexe du refuge
    const adoptantGender = adoptant.profile?.gender;
    if (adoptantGender && !this.matchesAcceptedSexe(adoptantGender, refugeSession.acceptedSexe)) {
      throw new ForbiddenError("Tu ne peux pas adopter ce refuge (critère de sexe)");
    }

    // Vérifier que l'Adoptant n'a pas déjà un refuge actif
    const activeRefuge = await prisma.refugeSession.findFirst({
      where: {
        adoptantId,
        status: {
          in: [RefugeSessionStatus.ACTIVE],
        },
      },
    });

    if (activeRefuge) {
      throw new ConflictError("Tu as déjà un refuge actif en cours");
    }

    // Adopter le refuge
    const now = new Date();
    const updatedRefuge = await prisma.refugeSession.update({
      where: { id: refugeSessionId },
      data: {
        adoptantId,
        status: RefugeSessionStatus.ACTIVE,
        startedAt: now,
        lastAdoptantActivityAt: now,
      },
    });

    return this.mapToDTO(updatedRefuge);
  }

  // ============================================================
  // Esthétique — Mettre à jour le fond d'ambiance
  // ============================================================

  static async updateBackground(
    refugeSessionId: string,
    adopteId: string,
    background: RefugeBackground
  ): Promise<RefugeSessionDTO> {
    // Récupérer la session
    const refugeSession = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
    });

    if (!refugeSession) {
      throw new NotFoundError("Refuge non trouvé");
    }

    // Vérifier que l'utilisateur est l'Adopté
    if (adopteId !== refugeSession.adopteId) {
      throw new ForbiddenError("Seul l'Adopté peut modifier le fond d'ambiance");
    }

    // Mettre à jour le fond
    const updatedRefuge = await prisma.refugeSession.update({
      where: { id: refugeSessionId },
      data: {
        background,
      },
    });

    return this.mapToDTO(updatedRefuge);
  }

  // ============================================================
  // Jeu quotidien — L'Adopté choisit ses 2 actions
  // ============================================================

  static async submitDailyChoice(
    refugeSessionId: string,
    adopteId: string,
    dayNumber: number,
    input: RefugeDailyChoiceInput
  ): Promise<RefugeDailyChoiceDTO> {
    // Récupérer la session
    const refugeSession = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
    });

    if (!refugeSession) {
      throw new NotFoundError("Refuge non trouvé");
    }

    // Vérifier que l'utilisateur est l'Adopté
    if (adopteId !== refugeSession.adopteId) {
      throw new ForbiddenError("Seul l'Adopté peut soumettre les actions");
    }

    // Vérifier que le refuge est actif
    if (!canSubmitDailyChoice(refugeSession.status)) {
      throw new ConflictError("Ce refuge n'est pas actif");
    }

    // Vérifier que le jour est valide
    if (!isValidDay(dayNumber)) {
      throw new BadRequestError(`Le jour doit être entre 1 et ${REFUGE_DURATION_DAYS}`);
    }

    // Vérifier que le refuge n'est pas expiré
    if (isRefugeExpired(refugeSession.endsAt)) {
      throw new ConflictError("Ce refuge a expiré");
    }

    // Vérifier que les 2 actions sont différentes
    if (!validateActionsAreDifferent(input.action1, input.action2)) {
      throw new BadRequestError("Les 2 actions doivent être différentes");
    }

    // Vérifier que les actions sont valides (enum check is automatic in Prisma)

    // Vérifier qu'il n'y a pas déjà un choix pour ce jour
    const existingChoice = await prisma.refugeDailyChoice.findUnique({
      where: {
        refugeSessionId_dayNumber: {
          refugeSessionId,
          dayNumber,
        },
      },
    });

    if (existingChoice) {
      throw new ConflictError(`Les actions pour le jour ${dayNumber} ont déjà été soumises`);
    }

    // Créer le choix quotidien
    const dailyChoice = await prisma.refugeDailyChoice.create({
      data: {
        refugeSessionId,
        dayNumber,
        action1: input.action1,
        action2: input.action2,
      },
    });

    // Mettre à jour lastAdopteActivityAt
    await prisma.refugeSession.update({
      where: { id: refugeSessionId },
      data: {
        lastAdopteActivityAt: new Date(),
      },
    });

    return this.mapDailyChoiceToDTO(dailyChoice);
  }

  // ============================================================
  // Récupération — Obtenir une session avec métadonnées
  // ============================================================

  static async getRefugeSession(refugeSessionId: string, userId: string): Promise<RefugeSessionWithMetadata> {
    const refugeSession = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
      include: {
        dailyChoices: {
          orderBy: { dayNumber: "asc" },
        },
        guesses: {
          orderBy: { dayNumber: "asc" },
        },
      },
    });

    if (!refugeSession) {
      throw new NotFoundError("Refuge non trouvé");
    }

    // Vérifier que l'utilisateur fait partie du refuge
    if (userId !== refugeSession.adopteId && userId !== refugeSession.adoptantId) {
      throw new ForbiddenError("Tu n'as accès à ce refuge");
    }

    const now = new Date();
    const currentDay = getCurrentDay(refugeSession.createdAt, refugeSession.startedAt, now);
    const timeRemaining = getTimeRemaining(refugeSession.endsAt || new Date(), now);
    const isActive = refugeSession.status === RefugeSessionStatus.ACTIVE && !isRefugeExpired(refugeSession.endsAt);
    const isCompleted = refugeSession.status === RefugeSessionStatus.COMPLETED || refugeSession.status === RefugeSessionStatus.ABANDONED;

    const hearts = calculateHearts(refugeSession.dailyChoices, refugeSession.guesses, currentDay);
    const canAttemptToday = canAttemptTodayForDay(currentDay, refugeSession.dailyChoices);
    const todaySubmitted = todaySubmittedForDay(currentDay, refugeSession.guesses);

    return {
      ...this.mapToDTO(refugeSession),
      currentDay,
      timeRemaining,
      isActive,
      isCompleted,
      hearts,
      canAttemptToday,
      todaySubmitted,
    };
  }

  // ============================================================
  // Récupération — Session active de l'utilisateur courant
  // ============================================================

  static async getActiveRefugeSession(userId: string): Promise<RefugeSessionDTO | null> {
    console.log("🔍 SERVICE: getActiveRefugeSession() for userId:", userId);
    const activeSession = await prisma.refugeSession.findFirst({
      where: {
        OR: [
          { adopteId: userId, status: RefugeSessionStatus.ACTIVE },
          { adoptantId: userId, status: RefugeSessionStatus.ACTIVE },
        ],
      },
    });

    console.log("📊 Query result - activeSession:", activeSession ? "FOUND" : "NOT FOUND");
    if (activeSession) {
      console.log("  - Session ID:", activeSession.id);
      console.log("  - Status:", activeSession.status);
      console.log("  - AdopteId:", activeSession.adopteId);
      console.log("  - AdoptantId:", activeSession.adoptantId);
    }

    const result = activeSession ? this.mapToDTO(activeSession) : null;
    console.log("✅ SERVICE returning:", result);
    return result;
  }

  // ============================================================
  // Devinettes — L'Adoptant devine les 2 actions de l'Adopté
  // ============================================================

  static async submitGuess(
    refugeSessionId: string,
    adoptantId: string,
    dayNumber: number,
    input: { guessedAction1: RefugeAction; guessedAction2: RefugeAction }
  ): Promise<any> {
    // Récupérer la session
    const refugeSession = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
    });

    if (!refugeSession) {
      throw new NotFoundError("Refuge non trouvé");
    }

    // Vérifier que l'utilisateur est l'Adoptant
    if (adoptantId !== refugeSession.adoptantId) {
      throw new ForbiddenError("Seul l'Adoptant peut soumettre des devinettes");
    }

    // Vérifier que le refuge est actif
    if (!canSubmitDailyChoice(refugeSession.status)) {
      throw new ConflictError("Ce refuge n'est pas actif");
    }

    // Vérifier que le jour est valide
    if (!isValidDay(dayNumber)) {
      throw new BadRequestError(`Le jour doit être entre 1 et ${REFUGE_DURATION_DAYS}`);
    }

    // Vérifier que le refuge n'est pas expiré
    if (isRefugeExpired(refugeSession.endsAt)) {
      throw new ConflictError("Ce refuge a expiré");
    }

    // Vérifier que les 2 devinettes sont différentes
    if (!validateActionsAreDifferent(input.guessedAction1, input.guessedAction2)) {
      throw new BadRequestError("Les 2 devinettes doivent être différentes");
    }

    // Vérifier qu'il n'y a pas déjà une devinette pour ce jour
    const existingGuess = await prisma.refugeGuess.findUnique({
      where: {
        refugeSessionId_dayNumber: {
          refugeSessionId,
          dayNumber,
        },
      },
    });

    if (existingGuess) {
      throw new ConflictError(`Les devinettes pour le jour ${dayNumber} ont déjà été soumises`);
    }

    // Créer la devinette
    const guess = await prisma.refugeGuess.create({
      data: {
        refugeSessionId,
        dayNumber,
        guessedAction1: input.guessedAction1,
        guessedAction2: input.guessedAction2,
      },
    });

    // Mettre à jour lastAdoptantActivityAt
    await prisma.refugeSession.update({
      where: { id: refugeSessionId },
      data: {
        lastAdoptantActivityAt: new Date(),
      },
    });

    return {
      id: guess.id,
      refugeSessionId: guess.refugeSessionId,
      dayNumber: guess.dayNumber,
      guessedAction1: guess.guessedAction1,
      guessedAction2: guess.guessedAction2,
      submittedAt: guess.submittedAt,
    };
  }

  // ============================================================
  // Révélation préparatoire (sans cron)
  // ============================================================

  static async prepareRevelationData(refugeSessionId: string): Promise<any> {
    const refugeSession = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
      include: {
        adopte: {
          select: { id: true, profile: { select: { pseudo: true } } },
        },
        adoptant: {
          select: { id: true, profile: { select: { pseudo: true } } },
        },
        dailyChoices: {
          orderBy: { dayNumber: "asc" },
        },
      },
    });

    if (!refugeSession) {
      throw new NotFoundError("Refuge non trouvé");
    }

    return {
      sessionId: refugeSession.id,
      status: refugeSession.status,
      animalType: refugeSession.animalType,
      animalCategory: refugeSession.animalCategory,
      animalSexe: refugeSession.animalSexe,
      adopte: {
        id: refugeSession.adopte.id,
        pseudo: refugeSession.adopte.profile?.pseudo || "Anonyme",
      },
      adoptant: refugeSession.adoptant
        ? {
            id: refugeSession.adoptant.id,
            pseudo: refugeSession.adoptant.profile?.pseudo || "Anonyme",
          }
        : null,
      dailyChoices: refugeSession.dailyChoices.map((choice) => ({
        dayNumber: choice.dayNumber,
        action1: choice.action1,
        action2: choice.action2,
      })),
      createdAt: refugeSession.createdAt,
      startedAt: refugeSession.startedAt,
      endsAt: refugeSession.endsAt,
      preexistingLinkType: refugeSession.preexistingLinkType,
    };
  }

  // ============================================================
  // Helpers internes
  // ============================================================

  private static mapToDTO(refugeSession: any): RefugeSessionDTO {
    return {
      id: refugeSession.id,
      adopteId: refugeSession.adopteId,
      adoptantId: refugeSession.adoptantId,
      animalType: refugeSession.animalType,
      animalCategory: refugeSession.animalCategory,
      animalSexe: refugeSession.animalSexe,
      animalAgeMonths: refugeSession.animalAgeMonths,
      acceptedSexe: refugeSession.acceptedSexe,
      status: refugeSession.status,
      createdAt: refugeSession.createdAt,
      startedAt: refugeSession.startedAt,
      endsAt: refugeSession.endsAt,
      preexistingLinkType: refugeSession.preexistingLinkType,
      background: refugeSession.background,
    };
  }

  private static mapDailyChoiceToDTO(dailyChoice: any): RefugeDailyChoiceDTO {
    return {
      id: dailyChoice.id,
      refugeSessionId: dailyChoice.refugeSessionId,
      dayNumber: dailyChoice.dayNumber,
      action1: dailyChoice.action1,
      action2: dailyChoice.action2,
      submittedAt: dailyChoice.submittedAt,
    };
  }

  private static matchesAcceptedSexe(userGender: Gender, acceptedSexe: string): boolean {
    if (acceptedSexe === "HOMME_FEMME") return true;
    if (acceptedSexe === "HOMME" && userGender === Gender.HOMME) return true;
    if (acceptedSexe === "FEMME" && userGender === Gender.FEMME) return true;
    return false;
  }

  private static getAcceptedSexeFilters(adoptantGender?: string): string[] {
    if (!adoptantGender) return ["HOMME", "FEMME", "HOMME_FEMME"];
    if (adoptantGender === Gender.HOMME) return ["HOMME", "HOMME_FEMME"];
    if (adoptantGender === Gender.FEMME) return ["FEMME", "HOMME_FEMME"];
    return ["HOMME", "FEMME", "HOMME_FEMME"];
  }

  // ============================================================
  // DEV MODE - Time Travel pour tester les 7 jours
  // ============================================================

  static async devSetDay(refugeSessionId: string, targetDay: number): Promise<RefugeSessionWithMetadata> {
    // Validation
    if (targetDay < 1 || targetDay > REFUGE_DURATION_DAYS) {
      throw new BadRequestError(`Day must be between 1 and ${REFUGE_DURATION_DAYS}`);
    }

    // Récupérer la session
    const refugeSession = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
      include: {
        dailyChoices: { orderBy: { dayNumber: "asc" } },
        guesses: { orderBy: { dayNumber: "asc" } },
      },
    });

    if (!refugeSession) {
      throw new NotFoundError("Refuge not found");
    }

    // Vérifier que la session est active
    if (refugeSession.status !== RefugeSessionStatus.ACTIVE) {
      throw new ConflictError("Refuge must be ACTIVE to use dev time-travel");
    }

    // Calculer le nouveau startedAt pour le jour cible
    const newStartedAt = calculateStartedAtForDay(refugeSession.createdAt, targetDay);

    // Mettre à jour
    const updatedRefuge = await prisma.refugeSession.update({
      where: { id: refugeSessionId },
      data: {
        startedAt: newStartedAt,
      },
      include: {
        dailyChoices: { orderBy: { dayNumber: "asc" } },
        guesses: { orderBy: { dayNumber: "asc" } },
      },
    });

    // Recalculer les métadonnées avec le nouveau jour
    const now = new Date();
    const currentDay = getCurrentDay(updatedRefuge.createdAt, updatedRefuge.startedAt, now);
    const timeRemaining = getTimeRemaining(updatedRefuge.endsAt || new Date(), now);
    const isActive = updatedRefuge.status === RefugeSessionStatus.ACTIVE && !isRefugeExpired(updatedRefuge.endsAt);
    const isCompleted = updatedRefuge.status === RefugeSessionStatus.COMPLETED || updatedRefuge.status === RefugeSessionStatus.ABANDONED;

    const hearts = calculateHearts(updatedRefuge.dailyChoices, updatedRefuge.guesses, currentDay);
    const canAttemptToday = canAttemptTodayForDay(currentDay, updatedRefuge.dailyChoices);
    const todaySubmitted = todaySubmittedForDay(currentDay, updatedRefuge.guesses);

    return {
      ...this.mapToDTO(updatedRefuge),
      currentDay,
      timeRemaining,
      isActive,
      isCompleted,
      hearts,
      canAttemptToday,
      todaySubmitted,
    };
  }
}
