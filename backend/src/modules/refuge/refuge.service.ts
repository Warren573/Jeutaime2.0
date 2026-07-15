import { prisma } from "../../config/prisma";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../core/errors";
import { RefugeSessionStatus, RefugeAction, Gender, RefugeBackground, type RefugeDailyChoice } from "@prisma/client";
import type { RefugeSessionDTO, RefugeSessionWithMetadata, RefugeProposalInput } from "./refuge.types";
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
  generateRandomDailyActions,
} from "./refuge.utils";

// Statuts pour lesquels un Adopté est considéré comme ayant déjà un refuge en cours
const ADOPTE_OPEN_STATUSES = [
  RefugeSessionStatus.CREATION,
  RefugeSessionStatus.WAITING_FOR_ADOPTANT,
  RefugeSessionStatus.ACTIVE,
];

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
        status: { in: ADOPTE_OPEN_STATUSES },
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

    // Garde anti-concurrence : si un double-clic / deux requêtes simultanées ont créé
    // plusieurs refuges ouverts, on annule la création courante.
    const concurrentCount = await prisma.refugeSession.count({
      where: {
        adopteId,
        status: { in: ADOPTE_OPEN_STATUSES },
        id: { not: refugeSession.id },
      },
    });
    if (concurrentCount > 0) {
      await prisma.refugeSession.delete({ where: { id: refugeSession.id } });
      throw new ConflictError("Tu as déjà un refuge en cours ou en attente");
    }

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

    // Vérifier que l'Adoptant n'est pas l'Adopté
    if (adoptantId === refugeSession.adopteId) {
      throw new ForbiddenError("Tu ne peux pas adopter ton propre refuge");
    }

    // Vérifier que le refuge est disponible
    if (refugeSession.status !== RefugeSessionStatus.WAITING_FOR_ADOPTANT) {
      throw new ConflictError("Ce refuge n'est plus disponible");
    }

    // Vérifier que le refuge n'est pas expiré
    if (isRefugeExpired(refugeSession.endsAt)) {
      throw new ConflictError("Ce refuge a expiré");
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
        status: RefugeSessionStatus.ACTIVE,
      },
    });

    if (activeRefuge) {
      throw new ConflictError("Tu as déjà un refuge actif en cours");
    }

    // Adoption atomique : le refuge n'est attribué que s'il est toujours
    // en attente et sans adoptant (protège contre deux adoptions simultanées).
    // Le jeu dure 7 jours à partir de l'adoption : endsAt est réaligné sur startedAt.
    const now = new Date();
    let claimed: { count: number };
    try {
      claimed = await prisma.refugeSession.updateMany({
        where: {
          id: refugeSessionId,
          status: RefugeSessionStatus.WAITING_FOR_ADOPTANT,
          adoptantId: null,
          endsAt: { gt: now },
        },
        data: {
          adoptantId,
          status: RefugeSessionStatus.ACTIVE,
          startedAt: now,
          endsAt: calculateRefugeEndsAt(now),
          lastAdoptantActivityAt: now,
        },
      });
    } catch (err: any) {
      // Contrainte unique (adopteId, adoptantId) : ce duo a déjà eu un refuge ensemble
      if (err.code === "P2002") {
        throw new ConflictError("Vous avez déjà partagé un refuge ensemble");
      }
      throw err;
    }

    if (claimed.count === 0) {
      throw new ConflictError("Ce refuge n'est plus disponible");
    }

    // Garde anti-concurrence : si deux adoptions simultanées de refuges différents
    // sont passées pour le même Adoptant, on libère celle-ci.
    const activeCount = await prisma.refugeSession.count({
      where: { adoptantId, status: RefugeSessionStatus.ACTIVE },
    });
    if (activeCount > 1) {
      await prisma.refugeSession.update({
        where: { id: refugeSessionId },
        data: {
          adoptantId: null,
          status: RefugeSessionStatus.WAITING_FOR_ADOPTANT,
          startedAt: null,
          endsAt: refugeSession.endsAt,
          lastAdoptantActivityAt: null,
        },
      });
      throw new ConflictError("Tu as déjà un refuge actif en cours");
    }

    const updatedRefuge = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
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
  // Actions du jour — producteur unique
  // Les 2 actions quotidiennes de l'Adopté sont générées par le serveur,
  // une seule fois par (session, jour), à la première lecture de la session
  // ou à la première tentative de l'Adoptant.
  // ============================================================

  private static async getOrCreateDailyChoice(
    refugeSessionId: string,
    dayNumber: number
  ): Promise<RefugeDailyChoice> {
    const existing = await prisma.refugeDailyChoice.findUnique({
      where: {
        refugeSessionId_dayNumber: { refugeSessionId, dayNumber },
      },
    });
    if (existing) return existing;

    const [action1, action2] = generateRandomDailyActions();
    try {
      return await prisma.refugeDailyChoice.create({
        data: { refugeSessionId, dayNumber, action1, action2 },
      });
    } catch (err: any) {
      // Conflit d'unicité : une requête concurrente a créé le choix avant nous.
      // On relit l'enregistrement gagnant — le jour reste unique et stable.
      if (err.code === "P2002") {
        const winner = await prisma.refugeDailyChoice.findUnique({
          where: {
            refugeSessionId_dayNumber: { refugeSessionId, dayNumber },
          },
        });
        if (winner) return winner;
      }
      throw err;
    }
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

    // Génération lazy des 2 actions du jour (sessions actives uniquement)
    let todayActions: { action1: RefugeAction; action2: RefugeAction } | null = null;
    let dailyChoices = refugeSession.dailyChoices;
    if (isActive && currentDay >= 1) {
      const dailyChoice = await this.getOrCreateDailyChoice(refugeSessionId, currentDay);

      if (!dailyChoices.some((dc) => dc.dayNumber === currentDay)) {
        dailyChoices = [...dailyChoices, dailyChoice];
      }

      // Les actions du jour ne sont visibles que par l'Adopté
      if (userId === refugeSession.adopteId) {
        todayActions = {
          action1: dailyChoice.action1,
          action2: dailyChoice.action2,
        };
      }
    }

    const hearts = calculateHearts(dailyChoices, refugeSession.guesses, currentDay);
    const canAttemptToday = isActive && currentDay >= 1 && canAttemptTodayForDay(currentDay, refugeSession.guesses);
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
      ...(todayActions && { todayActions }),
    };
  }

  // ============================================================
  // Récupération — Session active de l'utilisateur courant
  // ============================================================

  static async getActiveRefugeSession(userId: string): Promise<RefugeSessionDTO | null> {
    const activeSession = await prisma.refugeSession.findFirst({
      where: {
        OR: [
          // Adopté : peut avoir une session en CREATION, WAITING_FOR_ADOPTANT, ou ACTIVE
          {
            adopteId: userId,
            status: { in: ADOPTE_OPEN_STATUSES },
          },
          // Adoptant : peut avoir une session en ACTIVE uniquement
          {
            adoptantId: userId,
            status: RefugeSessionStatus.ACTIVE,
          },
        ],
      },
    });

    return activeSession ? this.mapToDTO(activeSession) : null;
  }

  // ============================================================
  // Tentative — L'Adoptant tente de retrouver les 2 actions du jour
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
      throw new ForbiddenError("Seul l'Adoptant peut soumettre une tentative");
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

    // Vérifier que le jour soumis correspond bien au jour courant de la session
    const currentDay = getCurrentDay(refugeSession.createdAt, refugeSession.startedAt, new Date());
    if (dayNumber !== currentDay) {
      throw new BadRequestError(
        `Le jour soumis (${dayNumber}) ne correspond pas au jour courant de la session (${currentDay})`
      );
    }

    // Vérifier que les 2 tentatives sont différentes
    if (!validateActionsAreDifferent(input.guessedAction1, input.guessedAction2)) {
      throw new BadRequestError("Les 2 actions devinées doivent être différentes");
    }

    // Vérifier qu'il n'y a pas déjà une tentative pour ce jour
    const existingGuess = await prisma.refugeGuess.findUnique({
      where: {
        refugeSessionId_dayNumber: {
          refugeSessionId,
          dayNumber,
        },
      },
    });

    if (existingGuess) {
      throw new ConflictError(`La tentative pour le jour ${dayNumber} a déjà été soumise`);
    }

    // Garantir que les actions du jour existent pour que la comparaison soit possible
    await this.getOrCreateDailyChoice(refugeSessionId, dayNumber);

    // Écriture atomique : la tentative et l'activité de l'Adoptant vont ensemble.
    // Un double-clic ou deux requêtes simultanées déclenchent P2002 → 409.
    let guess;
    try {
      [guess] = await prisma.$transaction([
        prisma.refugeGuess.create({
          data: {
            refugeSessionId,
            dayNumber,
            guessedAction1: input.guessedAction1,
            guessedAction2: input.guessedAction2,
          },
        }),
        prisma.refugeSession.update({
          where: { id: refugeSessionId },
          data: { lastAdoptantActivityAt: new Date() },
        }),
      ]);
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new ConflictError(`La tentative pour le jour ${dayNumber} a déjà été soumise`);
      }
      throw err;
    }

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
    });

    if (!refugeSession) {
      throw new NotFoundError("Refuge not found");
    }

    // Vérifier que la session est active
    if (refugeSession.status !== RefugeSessionStatus.ACTIVE) {
      throw new ConflictError("Refuge must be ACTIVE to use dev time-travel");
    }

    // Recaler startedAt pour que le jour courant observé par le backend soit targetDay,
    // et garder l'invariant endsAt = startedAt + 7 jours.
    const now = new Date();
    const newStartedAt = calculateStartedAtForDay(targetDay, now);

    await prisma.refugeSession.update({
      where: { id: refugeSessionId },
      data: {
        startedAt: newStartedAt,
        endsAt: calculateRefugeEndsAt(newStartedAt),
      },
    });

    // Retourner la session avec métadonnées recalculées (et actions du jour générées)
    const requesterId = refugeSession.adopteId;
    return this.getRefugeSession(refugeSessionId, requesterId);
  }
}
