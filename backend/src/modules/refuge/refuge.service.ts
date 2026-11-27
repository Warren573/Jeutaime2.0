import { prisma } from "../../config/prisma";
import { emitRefugeRevealed } from "../../events";
import { purgeRelationNotifications } from "../notifications/notifications.purge";
import * as refugeNotifications from "./refuge.notifications";
import { buildPhotoUrl } from "../photos/photos.urls";
import { sendReaction } from "../reactions/reactions.service";
import { logger } from "../../config/logger";
import { isAccountDeactivated } from "../auth/accountLifecycle.service";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RefugeDailyChoiceAlreadySubmittedError,
  RefugeGuessAlreadySubmittedError,
} from "../../core/errors";
import {
  RefugeSessionStatus,
  RefugeAction,
  RefugeDayStatus,
  CoinTxnType,
  RefugeAttentionKind,
  Gender,
  RefugeBackground,
  Prisma,
  type RefugeDailyChoice,
} from "@prisma/client";
import type { RefugeSessionDTO, RefugeSessionWithMetadata, RefugeProposalInput, DailyResultEntry, RevealMatchState } from "./refuge.types";
import {
  calculateRefugeEndsAt,
  getCurrentDay,
  getTimeRemaining,
  isRefugeExpired,
  canSubmitDailyChoice,
  validateActionsAreDifferent,
  isValidDay,
  REFUGE_DURATION_DAYS,
  calculateDayResult,
  computeDayClosure,
  dayWindow,
  DAY_STATUS_SYMBOLS,
  DAY_STATUS_MESSAGES,
  type RefugeDayStatusName,
  isDayCompleted,
  canAttemptTodayForDay,
  todaySubmittedForDay,
  calculateStartedAtForDay,
  generateRandomSexe,
  generateAnimalCategory,
  generateRandomAge,
} from "./refuge.utils";
import { buildAnimationSnapshot, type RefugeAnimationSnapshot } from "./refuge.animation";
import { resolveGuessFood } from "./refuge.foods";
import {
  RULES_VERSION_V2,
  DAILY_ASSIDUITY_COINS,
  ABSENCE_SCORE_PENALTY,
  dayBit,
  hasConsulted,
  evaluateDayV2,
  computeFinalSettlement,
  buildFinalReport,
} from "./refuge.rules";

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

    // Vérifier que l'Adoptant n'a pas non plus de refuge ouvert en tant qu'Adopté.
    // Un utilisateur ne joue qu'un Refuge à la fois : sans ce garde, il se retrouve
    // avec deux sessions ouvertes et GET /active devient ambigu.
    const openAsAdopte = await prisma.refugeSession.findFirst({
      where: {
        adopteId: adoptantId,
        status: { in: ADOPTE_OPEN_STATUSES },
      },
    });

    if (openAsAdopte) {
      throw new ConflictError(
        "Tu as déjà un refuge en cours ou en attente en tant qu'Adopté — abandonne-le avant d'adopter"
      );
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
          // Règles v2 fixées à l'adoption : jamais appliquées à une session déjà commencée.
          rulesVersion: RULES_VERSION_V2,
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

    // Refuge adopté : seul le compagnon est prévenu que l'aventure commence (jamais l'adoptant). L'incarnation ne notifie personne.
    void refugeNotifications.notifyAdopted({
      refugeSessionId,
      companionId: refugeSession.adopteId,
      sponsorId: adoptantId,
    });
    // Confirmation dans l'HISTORIQUE du parrain / de la marraine, sans push (la fenêtre locale suffit).
    void refugeNotifications.recordAdoptionConfirmed({ refugeSessionId, sponsorId: adoptantId });

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
  // Récupération — Obtenir une session avec métadonnées
  // ============================================================

  static async getRefugeSession(refugeSessionId: string, userId: string): Promise<RefugeSessionWithMetadata> {
    const refugeSession = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
      include: {
        adoptant: { select: { profile: { select: { gender: true } } } },
        dailyChoices: {
          orderBy: { dayNumber: "asc" },
        },
        guesses: {
          orderBy: { dayNumber: "asc" },
        },
        dayResults: {
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

    // Session expirée restée ACTIVE : clôture unique à la lecture, à partir des données déjà chargées
    // (aucune requête supplémentaire si la session est en cours). Aucune pièce, aucune suppression.
    const closure = await this.closeExpiredSession(refugeSession);
    // La clôture vient de modifier la session (jours soldés, bonus, statut) : relecture UNIQUE pour répondre avec l'état final
    // (bilan compris). Le second passage ne trouve plus de clôture à faire.
    if (closure) return this.getRefugeSession(refugeSessionId, userId);

    // Présence du parrain / de la marraine.
    //   - v2 : consultation du Refuge enregistrée PAR JOUR (un bit), en une seule écriture atomique par jour ; la
    //     condition SQL rend l'écriture idempotente, et rien n'est écrit si le bit est déjà posé dans les données chargées.
    //     Les lectures du parrain / de la marraine pendant que l'application est en arrière-plan ne sont pas émises (voir
    //     useRefugeSession : le polling s'arrête).
    //   - v1 : trace d'activité throttlée (comportement historique, inchangé).
    // Aucune récompense n'est appliquée dans un GET.
    if (userId === refugeSession.adoptantId && refugeSession.status === RefugeSessionStatus.ACTIVE) {
      if (refugeSession.rulesVersion >= RULES_VERSION_V2) {
        const today = getCurrentDay(refugeSession.createdAt, refugeSession.startedAt, new Date());
        const bit = dayBit(today);
        if (bit !== 0 && !hasConsulted(refugeSession.adoptantConsultMask, today)) {
          await prisma.$executeRaw`UPDATE "RefugeSession" SET "adoptantConsultMask" = "adoptantConsultMask" | ${bit} WHERE "id" = ${refugeSessionId} AND ("adoptantConsultMask" & ${bit}) = 0`;
          refugeSession.adoptantConsultMask |= bit;
        }
      } else if (
        !refugeSession.lastAdoptantActivityAt ||
        Date.now() - refugeSession.lastAdoptantActivityAt.getTime() > 10 * 60 * 1000
      ) {
        await prisma.refugeSession.update({
          where: { id: refugeSessionId },
          data: { lastAdoptantActivityAt: new Date() },
        });
      }
    }

    const now = new Date();
    const currentDay = getCurrentDay(refugeSession.createdAt, refugeSession.startedAt, now);
    const timeRemaining = getTimeRemaining(refugeSession.endsAt || new Date(), now);
    const isActive = refugeSession.status === RefugeSessionStatus.ACTIVE && !isRefugeExpired(refugeSession.endsAt);
    const isCompleted =
      refugeSession.status === RefugeSessionStatus.COMPLETED ||
      refugeSession.status === RefugeSessionStatus.REVEALED ||
      refugeSession.status === RefugeSessionStatus.ABANDONED;

    // Lecture pure : le flag "l'Adopté a soumis aujourd'hui" est visible des deux
    // participants (l'Adoptant en a besoin pour savoir s'il peut tenter) ; en
    // revanche les actions elles-mêmes ne sont révélées qu'à l'Adopté.
    const todayDailyChoice = refugeSession.dailyChoices.find((dc) => dc.dayNumber === currentDay);
    const adopteSubmittedToday = isActive && currentDay >= 1 && !!todayDailyChoice;

    let todayActions: { action1: RefugeAction; action2: RefugeAction } | null = null;
    if (adopteSubmittedToday && todayDailyChoice && userId === refugeSession.adopteId) {
      todayActions = {
        action1: todayDailyChoice.action1,
        action2: todayDailyChoice.action2,
      };
    }

    // État structuré des 7 jours — source de vérité unique du frontend.
    // Priorité : résultat FINAL persisté (clôture) > dérivation en lecture pure
    // d'un jour complet pas encore persisté (sessions antérieures) > OPEN.
    const dailyResults: DailyResultEntry[] = [];
    for (let day = 1; day <= REFUGE_DURATION_DAYS; day++) {
      const persisted = refugeSession.dayResults.find((r) => r.dayNumber === day);
      if (persisted) {
        const statusName = persisted.status as RefugeDayStatusName;
        dailyResults.push({
          dayNumber: day,
          status: statusName,
          matchCount: persisted.matchCount,
          symbol: DAY_STATUS_SYMBOLS[statusName],
          adopteCoinsDelta: persisted.adopteCoinsDelta,
          adoptantCoinsDelta: persisted.adoptantCoinsDelta,
          message: DAY_STATUS_MESSAGES[statusName],
        });
        continue;
      }

      const choice = refugeSession.dailyChoices.find((dc) => dc.dayNumber === day);
      const guess = refugeSession.guesses.find((g) => g.dayNumber === day);
      if (choice && guess) {
        // Jour complet sans résultat persisté (données d'avant la clôture) :
        // dérivation en LECTURE PURE — aucune écriture, aucune récompense ici.
        const derived = computeDayClosure(true, true, calculateDayResult(choice, guess).matches, true);
        dailyResults.push({
          dayNumber: day,
          status: derived.status,
          matchCount: derived.matchCount,
          symbol: DAY_STATUS_SYMBOLS[derived.status],
          adopteCoinsDelta: derived.adopteCoinsDelta,
          adoptantCoinsDelta: derived.adoptantCoinsDelta,
          message: DAY_STATUS_MESSAGES[derived.status],
        });
        continue;
      }

      // Jour non clôturé sans résultat : encore ouvert (jour courant, futur,
      // ou échu en attente de clôture par le job) → blanc, rien d'inventé.
      dailyResults.push({
        dayNumber: day,
        status: "OPEN",
        matchCount: null,
        symbol: DAY_STATUS_SYMBOLS.OPEN,
        adopteCoinsDelta: 0,
        adoptantCoinsDelta: 0,
        message: DAY_STATUS_MESSAGES.OPEN,
      });
    }

    const hearts = dailyResults.map((r) => r.symbol);

    const canAttemptToday = isActive && currentDay >= 1 && canAttemptTodayForDay(currentDay, refugeSession.guesses);
    const todaySubmitted = todaySubmittedForDay(currentDay, refugeSession.guesses);

    // Progression commune et déterministe — mêmes valeurs pour les deux comptes.
    // dayCompleted        = choix de l'Adopté + réponse de l'Adoptant pour le jour courant
    // canAdvanceDay       = jour courant terminé et il reste des jours (outil DEV "jour suivant")
    // finalConsentAvailable = jour 7 ET jour 7 terminé — être au jour 7 ne suffit pas
    const adoptantSubmittedToday = todaySubmitted;
    const dayCompleted = currentDay >= 1 && isDayCompleted(refugeSession.dailyChoices, refugeSession.guesses, currentDay);
    const canAdvanceDay = dayCompleted && currentDay < REFUGE_DURATION_DAYS && refugeSession.status === RefugeSessionStatus.ACTIVE;
    // Dévoilement : JAMAIS avant l'expiration des sept jours complets (168 h), même si le jour 7 est terminé.
    const finalConsentAvailable = this.isRevealPhaseReached(refugeSession, refugeSession.dailyChoices, refugeSession.guesses, now) && refugeSession.status === RefugeSessionStatus.AWAITING_REVEAL_CONSENT;

    // Calculer le résultat du jour si une tentative a été soumise
    let todayResult = null;
    if (todaySubmitted && todayDailyChoice) {
      const todayGuess = refugeSession.guesses.find((g) => g.dayNumber === currentDay);
      if (todayGuess) {
        const result = calculateDayResult(todayDailyChoice, todayGuess);
        todayResult = {
          matches: result.matches,
          message: result.message,
          // v2 : 10 pièces d'assiduité, quel que soit le score.
          reward: refugeSession.rulesVersion >= RULES_VERSION_V2 ? DAILY_ASSIDUITY_COINS : result.reward,
          emoji: result.emoji,
        };
      }
    }

    // Phase finale — état du consentement vu par CE participant.
    // Confidentialité : la décision de l'autre n'est exposée que comme booléen
    // ("a répondu"), jamais en détail tant que la session n'est pas terminée.
    const isAdopte = userId === refugeSession.adopteId;
    const myDecision = isAdopte
      ? refugeSession.adopteRevealDecision
      : refugeSession.adoptantRevealDecision;
    const otherDecision = isAdopte
      ? refugeSession.adoptantRevealDecision
      : refugeSession.adopteRevealDecision;

    const revealAvailable =
      (refugeSession.status === RefugeSessionStatus.AWAITING_REVEAL_CONSENT ||
        refugeSession.status === RefugeSessionStatus.REVEALED ||
        refugeSession.status === RefugeSessionStatus.COMPLETED) &&
      this.isRevealPhaseReached(refugeSession, refugeSession.dailyChoices, refugeSession.guesses, now);

    const reveal = {
      available: revealAvailable,
      myDecision,
      otherDecided: otherDecision !== null,
      revealedAt: refugeSession.revealedAt,
    };

    // Profil de l'autre : UNIQUEMENT après accord mutuel (status REVEALED),
    // champs publics seulement — jamais avant, pour aucun des deux.
    // La photo utilise la variante PUBLIQUE du système Photos existant : les
    // règles de déverrouillage restent celles du vrai profil, pas du Refuge.
    let otherProfile = null;
    let revealMatch: RevealMatchState | null = null;
    if (refugeSession.status === RefugeSessionStatus.REVEALED && refugeSession.adoptantId) {
      const otherUserId = isAdopte ? refugeSession.adoptantId : refugeSession.adopteId;
      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: {
          id: true,
          profile: { select: { pseudo: true, bio: true, city: true, birthDate: true, interests: true, avatarConfig: true, gender: true } },
          photos: {
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            take: 1,
            select: { id: true },
          },
        },
      });
      if (otherUser) {
        const birthDate = otherUser.profile?.birthDate ?? null;
        const age = birthDate
          ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null;
        otherProfile = {
          userId: otherUser.id,
          pseudo: otherUser.profile?.pseudo || "Anonyme",
          bio: otherUser.profile?.bio ?? null,
          city: otherUser.profile?.city ?? null,
          age,
          interests: otherUser.profile?.interests ?? [],
          photoUrl: otherUser.photos[0] ? buildPhotoUrl(otherUser.photos[0].id, "blur") : null,
          avatarConfig: otherUser.profile?.avatarConfig ?? null,
          gender: otherUser.profile?.gender ?? null,
        };
        // Match créé par le dévoilement mutuel (ou antérieur) : une seule lecture, uniquement dans cet état.
        const [x, y] = [refugeSession.adopteId, refugeSession.adoptantId].sort();
        const m = await prisma.match.findUnique({
          where: { userAId_userBId: { userAId: x as string, userBId: y as string } },
          select: { id: true, status: true, questionsValidated: true, letterCountA: true, letterCountB: true },
        });
        revealMatch = m ? { matchId: m.id, status: String(m.status), questionsValidated: m.questionsValidated, discussionOpen: m.letterCountA + m.letterCountB > 0 } : null;
      }
    }

    const sponsorGender = userId === refugeSession.adopteId ? refugeSession.adoptant?.profile?.gender : undefined;
    const sponsorRole = sponsorGender === Gender.HOMME ? "parrain" : sponsorGender === Gender.FEMME ? "marraine" : undefined;

    return {
      ...this.mapToDTO(refugeSession),
      ...(sponsorRole && { sponsorRole }),
      currentDay,
      timeRemaining,
      isActive,
      isCompleted,
      hearts,
      canAttemptToday,
      todaySubmitted,
      animation: buildAnimationSnapshot({
        choices: refugeSession.dailyChoices,
        guesses: refugeSession.guesses,
        currentDay,
        animalType: refugeSession.animalType,
      }),
      serverTime: new Date().toISOString(),
      adopteSubmittedToday,
      adoptantSubmittedToday,
      dayCompleted,
      canAdvanceDay,
      finalConsentAvailable,
      // Petite attention du jour : lue sur la session déjà chargée (aucune requête de plus).
      attention:
        isActive && refugeSession.attentionDay === currentDay && refugeSession.attentionKind && refugeSession.attentionAt
          ? { kind: refugeSession.attentionKind, sentAt: refugeSession.attentionAt }
          : null,
      canSendAttention:
        isActive &&
        userId === refugeSession.adoptantId &&
        currentDay >= 1 &&
        !adopteSubmittedToday &&
        refugeSession.attentionDay !== currentDay,
      dailyResults,
      reveal,
      finalReport:
        refugeSession.rulesVersion >= RULES_VERSION_V2 && refugeSession.finalizedAt
          ? buildFinalReport(
              refugeSession.dayResults,
              isAdopte ? "adopte" : "adoptant",
              isAdopte ? refugeSession.adopteFinalBonus : refugeSession.adoptantFinalBonus,
              DAY_STATUS_SYMBOLS
            )
          : null,
      ...(todayActions && { todayActions }),
      ...(todayResult && { todayResult }),
      ...(otherProfile && { otherProfile }),
      ...(refugeSession.status === RefugeSessionStatus.REVEALED && { revealMatch }),
    };
  }

  // ============================================================
  // Récupération — Session active de l'utilisateur courant
  // ============================================================

  static async getActiveRefugeSession(userId: string): Promise<(RefugeSessionDTO & { currentDay: number; todaySubmitted: boolean; adopteSubmittedToday?: boolean; animation?: RefugeAnimationSnapshot; serverTime?: string; isActive: boolean }) | null> {
    // Priorité 1 : une session en cours (jeu actif ou phase finale de
    // consentement) prime toujours sur une proposition en attente — les deux
    // participants doivent résoudre vers la même session, même si d'anciennes
    // propositions traînent. AWAITING_REVEAL_CONSENT reste "en cours" : la
    // décision de dévoilement peut prendre plusieurs jours.
    const activeSession = await prisma.refugeSession.findFirst({
      where: {
        OR: [
          { status: RefugeSessionStatus.ACTIVE, OR: [{ adopteId: userId }, { adoptantId: userId }] },
          // Ancien flux (consentement) : reste « en cours » jusqu'à ce que CE participant quitte l'écran de fin.
          { status: RefugeSessionStatus.AWAITING_REVEAL_CONSENT, ...this.unarchivedFor(userId) },
        ],
      },
      include: {
        guesses: {
          orderBy: { dayNumber: "asc" },
        },
        dailyChoices: true,
      },
      orderBy: { startedAt: "desc" },
    });

    if (activeSession) {
      // Session expirée restée ACTIVE : clôturée ici, une seule fois. Fermée (non jouée jusqu'au jour 7), elle ne
      // compte plus comme « en cours » : on relit pour retrouver une proposition, un dévoilement ou rien (adoption normale).
      const closure = await this.closeExpiredSession(activeSession);
      if (closure) {
        activeSession.status = closure.status;
        if (closure.status === RefugeSessionStatus.ABANDONED) return this.getActiveRefugeSession(userId);
      }
      const now = new Date();
      const currentDay = getCurrentDay(activeSession.createdAt, activeSession.startedAt, now);
      const todaySubmitted = todaySubmittedForDay(currentDay, activeSession.guesses);
      const isActive = activeSession.status === RefugeSessionStatus.ACTIVE && !isRefugeExpired(activeSession.endsAt);

      return {
        ...this.mapToDTO(activeSession),
        animation: buildAnimationSnapshot({
          choices: activeSession.dailyChoices,
          guesses: activeSession.guesses,
          currentDay,
          animalType: activeSession.animalType,
        }),
        serverTime: now.toISOString(),
        currentDay,
        todaySubmitted,
        adopteSubmittedToday: isActive && activeSession.dailyChoices.some((choice) => choice.dayNumber === currentDay),
        isActive,
      };
    }

    // Priorité 2 : sinon, la proposition ouverte la plus récente en tant qu'Adopté
    const openProposal = await prisma.refugeSession.findFirst({
      where: {
        adopteId: userId,
        status: { in: [RefugeSessionStatus.CREATION, RefugeSessionStatus.WAITING_FOR_ADOPTANT] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (openProposal) {
      return {
        ...this.mapToDTO(openProposal),
        currentDay: 0,
        todaySubmitted: false,
        isActive: false,
      };
    }

    // Priorité 3 : une session RÉVÉLÉE reste consultable (les profils dévoilés)
    // tant que l'utilisateur n'a pas relancé de refuge — sinon un rechargement
    // juste après la révélation la ferait disparaître définitivement.
    // Fin automatique : REVEALED (profils dévoilés) ou COMPLETED (fin sans dévoilement : blocage, compte indisponible),
    // tant que CE participant n'a pas quitté l'écran de fin. Les anciennes COMPLETED/ABANDONED sont archivées par migration.
    const revealedSession = await prisma.refugeSession.findFirst({
      where: {
        status: { in: [RefugeSessionStatus.REVEALED, RefugeSessionStatus.COMPLETED] },
        ...this.unarchivedFor(userId),
      },
      orderBy: [{ revealedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    });

    if (revealedSession) {
      return {
        ...this.mapToDTO(revealedSession),
        currentDay: 7,
        todaySubmitted: false,
        isActive: false,
      };
    }

    return null;
  }

  /** Filtre « cette personne n'a pas encore quitté l'écran de fin » (archivage indépendant pour chaque participant). */
  private static unarchivedFor(userId: string) {
    return {
      OR: [
        { adopteId: userId, adopteArchivedAt: null },
        { adoptantId: userId, adoptantArchivedAt: null },
      ],
    };
  }

  /**
   * Archive l'aventure POUR CE PARTICIPANT (il quitte l'écran de fin) : son Refuge est libéré, l'autre participant n'est pas
   * touché. La session reste intacte (bilan, récompenses, match). Idempotent ; refusé tant que l'aventure n'est pas terminée.
   */
  static async archiveSession(refugeSessionId: string, userId: string): Promise<{ archived: boolean }> {
    const session = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
      select: { id: true, status: true, adopteId: true, adoptantId: true },
    });
    if (!session) throw new NotFoundError("Refuge non trouvé");
    const isAdopte = userId === session.adopteId;
    const isAdoptant = userId === session.adoptantId;
    if (!isAdopte && !isAdoptant) throw new ForbiddenError("Tu n'as accès à ce refuge");
    const ended: RefugeSessionStatus[] = [
      RefugeSessionStatus.REVEALED,
      RefugeSessionStatus.COMPLETED,
      RefugeSessionStatus.ABANDONED,
      RefugeSessionStatus.AWAITING_REVEAL_CONSENT,
    ];
    if (!ended.includes(session.status)) throw new ConflictError("Ce refuge n'est pas terminé");
    const field = isAdopte ? "adopteArchivedAt" : "adoptantArchivedAt";
    // Garde conditionnelle : la date n'est posée qu'une fois (rejeux et doubles appuis sans effet).
    await prisma.refugeSession.updateMany({ where: { id: refugeSessionId, [field]: null }, data: { [field]: new Date() } });
    return { archived: true };
  }

  // ============================================================
  // Choix quotidien — L'Adopté choisit ses 2 actions du jour
  // ============================================================

  static async submitDailyChoice(
    refugeSessionId: string,
    adopteId: string,
    dayNumber: number,
    input: { action1: RefugeAction; action2: RefugeAction }
  ): Promise<RefugeDailyChoice> {
    // Récupérer la session
    const refugeSession = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
    });

    if (!refugeSession) {
      throw new NotFoundError("Refuge non trouvé");
    }

    // Vérifier que l'utilisateur est l'Adopté
    if (adopteId !== refugeSession.adopteId) {
      throw new ForbiddenError("Seul l'Adopté peut soumettre un choix");
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
      // Même refus qu'avant ; la session est en plus clôturée (une seule fois) pour ne plus jamais rester ACTIVE.
      await this.closeExpiredSessionById(refugeSessionId);
      throw new ConflictError("Ce refuge a expiré");
    }

    // Vérifier que le jour soumis correspond bien au jour courant de la session
    const currentDay = getCurrentDay(refugeSession.createdAt, refugeSession.startedAt, new Date());
    if (dayNumber !== currentDay) {
      throw new BadRequestError(
        `Le jour soumis (${dayNumber}) ne correspond pas au jour courant de la session (${currentDay})`
      );
    }

    // Vérifier que les 2 actions sont différentes
    if (!validateActionsAreDifferent(input.action1, input.action2)) {
      throw new BadRequestError("Les 2 actions doivent être différentes");
    }

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
      throw new RefugeDailyChoiceAlreadySubmittedError(dayNumber);
    }

    // Créer le choix en transaction
    let created: RefugeDailyChoice;
    try {
      created = await prisma.$transaction(async (tx) => {
        const dailyChoice = await tx.refugeDailyChoice.create({
          data: {
            refugeSessionId,
            dayNumber,
            action1: input.action1,
            action2: input.action2,
          },
        });

        // Mettre à jour lastAdopteActivityAt
        await tx.refugeSession.update({
          where: { id: refugeSessionId },
          data: { lastAdopteActivityAt: new Date() },
        });

        // Règles v2 : 10 pièces versées immédiatement à la validation, indépendamment du score. Dans la même
        // transaction que le choix (unique par session et jour) : un rejeu ne peut jamais payer deux fois.
        if (refugeSession.rulesVersion >= RULES_VERSION_V2) {
          await this.applyRefugeCoinsTx(tx, adopteId, DAILY_ASSIDUITY_COINS, CoinTxnType.REFUGE_DAILY_ASSIDUITY, {
            refugeSessionId,
            dayNumber,
            role: "adopte",
          });
        }

        return dailyChoice;
      });
    } catch (err: any) {
      // Conflit d'unicité : une requête concurrente a créé le choix avant nous
      if (err.code === "P2002") {
        throw new RefugeDailyChoiceAlreadySubmittedError(dayNumber);
      }
      throw err;
    }

    // Le parrain / la marraine est prévenu que son compagnon attend ses deux actions (jamais lesquelles).
    if (refugeSession.adoptantId) {
      void refugeNotifications.notifyChoiceReady({
        refugeSessionId,
        dayNumber,
        companionId: adopteId,
        sponsorId: refugeSession.adoptantId,
      });
    }

    // Solder les jours passés arrivés à échéance (écriture POST — jamais en GET)
    await this.closePastDays(refugeSessionId);

    return created;
  }

  // ============================================================
  // Petites attentions — le parrain / la marraine passe dire un mot, avant la validation du compagnon
  // ============================================================

  /**
   * Une seule attention par jour de jeu (fenêtre de 24 h depuis l'adoption), facultative, uniquement tant que le compagnon
   * n'a pas validé ses deux actions. Aucun gain de pièces ni de points. L'unicité du jour est revendiquée par une écriture
   * conditionnelle (un seul gagnant, même sous requêtes simultanées) ; la notification porte une clé unique par session et
   * par jour : jamais de doublon.
   */
  static async sendAttention(
    refugeSessionId: string,
    userId: string,
    kind: RefugeAttentionKind
  ): Promise<{ kind: RefugeAttentionKind; dayNumber: number; sentAt: Date }> {
    const session = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
      select: { id: true, adopteId: true, adoptantId: true, status: true, createdAt: true, startedAt: true, endsAt: true, attentionDay: true },
    });
    if (!session) throw new NotFoundError("Refuge non trouvé");
    if (userId !== session.adoptantId) throw new ForbiddenError("Seul le parrain ou la marraine peut envoyer une attention");
    if (session.status !== RefugeSessionStatus.ACTIVE || isRefugeExpired(session.endsAt)) throw new ConflictError("Ce refuge n'est pas actif");

    const dayNumber = getCurrentDay(session.createdAt, session.startedAt, new Date());
    if (session.attentionDay === dayNumber) throw new ConflictError("Tu as déjà passé une attention aujourd'hui");

    const choice = await prisma.refugeDailyChoice.findUnique({
      where: { refugeSessionId_dayNumber: { refugeSessionId, dayNumber } },
      select: { id: true },
    });
    if (choice) throw new ConflictError("Ton compagnon a déjà validé ses actions du jour");

    const sentAt = new Date();
    const claimed = await prisma.refugeSession.updateMany({
      where: {
        id: refugeSessionId,
        status: RefugeSessionStatus.ACTIVE,
        OR: [{ attentionDay: null }, { attentionDay: { not: dayNumber } }],
      },
      data: { attentionDay: dayNumber, attentionKind: kind, attentionAt: sentAt },
    });
    if (claimed.count !== 1) throw new ConflictError("Tu as déjà passé une attention aujourd'hui");

    // Notification au compagnon (jamais d'identité : seulement « parrain » / « marraine » selon le genre). Sans attendre.
    void (async () => {
      try {
        let sponsorGender: string | null = null;
        try {
          const profile = await prisma.profile.findUnique({ where: { userId }, select: { gender: true } });
          sponsorGender = profile?.gender ?? null;
        } catch {
          // Genre indisponible : formulation double, la notification part quand même.
        }
        await refugeNotifications.notifyAttention({ refugeSessionId, dayNumber, companionId: session.adopteId, sponsorId: userId, sponsorGender, kind });
      } catch {
        // Une notification ne fait jamais échouer l'action métier.
      }
    })();

    return { kind, dayNumber, sentAt };
  }

  // ============================================================
  // Tentative — L'Adoptant tente de retrouver les 2 actions du jour
  // ============================================================

  static async submitGuess(
    refugeSessionId: string,
    adoptantId: string,
    dayNumber: number,
    input: { guessedAction1: RefugeAction; guessedAction2: RefugeAction; foodChoice?: string | null }
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
      // Même refus qu'avant ; la session est en plus clôturée (une seule fois) pour ne plus jamais rester ACTIVE.
      await this.closeExpiredSessionById(refugeSessionId);
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
      throw new RefugeGuessAlreadySubmittedError(dayNumber);
    }

    // La tentative n'a de sens que si l'Adopté a réellement soumis ses actions du jour.
    // On ne génère JAMAIS de choix à sa place : pas de choix → 409, l'Adoptant attend.
    const dailyChoice = await prisma.refugeDailyChoice.findUnique({
      where: {
        refugeSessionId_dayNumber: {
          refugeSessionId,
          dayNumber,
        },
      },
    });

    if (!dailyChoice) {
      throw new ConflictError(
        `L'Adopté n'a pas encore choisi ses actions pour le jour ${dayNumber}`
      );
    }

    // Aliment : compatible avec l'animal, uniquement si Nourrir fait partie des réponses
    // (aliment unique sélectionné automatiquement). Validation côté serveur obligatoire.
    const foodChoice = resolveGuessFood(
      refugeSession.animalType,
      [input.guessedAction1, input.guessedAction2],
      input.foodChoice
    );

    // Calculer le résultat du jour avant la transaction
    const dayResult = calculateDayResult(dailyChoice, {
      guessedAction1: input.guessedAction1,
      guessedAction2: input.guessedAction2,
    });

    // Écriture atomique : tentative, activité de l'Adoptant, résultat FINAL
    // persisté du jour et pièces (via le ledger Wallet) vont ensemble.
    // Un double-clic ou deux requêtes simultanées déclenchent P2002 → 409.
    const v2 = refugeSession.rulesVersion >= RULES_VERSION_V2;
    // v2 : 10 pièces d'assiduité pour chacun, quel que soit le score ; le compagnon a déjà été payé à sa validation.
    const closure = v2
      ? (() => {
          const e = evaluateDayV2({ choiceAt: dailyChoice.submittedAt, guessAt: new Date(), matches: dayResult.matches, consulted: true, windowEnd: new Date() });
          return { status: e.status, matchCount: e.matchCount, adopteCoinsDelta: e.companion.coins, adoptantCoinsDelta: e.sponsor.coins };
        })()
      : computeDayClosure(true, true, dayResult.matches, true);
    const reward = v2 ? DAILY_ASSIDUITY_COINS : dayResult.reward;
    let guess;
    try {
      guess = await prisma.$transaction(async (tx) => {
        const created = await tx.refugeGuess.create({
          data: {
            refugeSessionId,
            dayNumber,
            guessedAction1: input.guessedAction1,
            guessedAction2: input.guessedAction2,
            foodChoice,
          },
        });

        await tx.refugeSession.update({
          where: { id: refugeSessionId },
          data: { lastAdoptantActivityAt: new Date() },
        });

        // Résultat final du jour, persisté une seule fois (unique session+jour)
        await tx.refugeDayResult.create({
          data: {
            refugeSessionId,
            dayNumber,
            status: closure.status as RefugeDayStatus,
            matchCount: closure.matchCount,
            adopteCoinsDelta: closure.adopteCoinsDelta,
            adoptantCoinsDelta: closure.adoptantCoinsDelta,
            ...(v2 ? { adopteAssiduous: true, adoptantAssiduous: true } : {}),
          },
        });

        // Récompenses via le Wallet officiel — écritures CoinTransaction traçables
        if (v2) {
          // Seule la réponse du parrain / de la marraine est payée ici (unique par session et jour).
          await this.applyRefugeCoinsTx(tx, adoptantId, DAILY_ASSIDUITY_COINS, CoinTxnType.REFUGE_DAILY_ASSIDUITY, {
            refugeSessionId,
            dayNumber,
            role: "adoptant",
          });
        } else if (dayResult.reward > 0) {
          const meta = { refugeSessionId, dayNumber, status: closure.status };
          const txnType = this.closureTxnType(closure.status as RefugeDayStatus, true);
          await this.applyRefugeCoinsTx(tx, refugeSession.adopteId, dayResult.reward, txnType, {
            ...meta,
            role: "adopte",
            theoreticalDelta: dayResult.reward,
          });
          await this.applyRefugeCoinsTx(tx, adoptantId, dayResult.reward, txnType, {
            ...meta,
            role: "adoptant",
            theoreticalDelta: dayResult.reward,
          });
        }

        return created;
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new RefugeGuessAlreadySubmittedError(dayNumber);
      }
      throw err;
    }

    // Notifications du jour (jamais d'action nommée) : score au parrain / à la marraine, « résultat prêt » au compagnon
    // (jours 1 à 6), fin des sept jours aux deux participants (jour 7). Lancées sans attendre : elles ne ralentissent
    // ni ne font échouer la réponse.
    void this.notifyGuessSubmitted({
      refugeSessionId,
      dayNumber,
      companionId: refugeSession.adopteId,
      sponsorId: adoptantId,
      score: dayResult.matches,
      sponsorCoins: reward,
    });

    // Solder les jours passés arrivés à échéance (écriture POST — jamais en GET)
    await this.closePastDays(refugeSessionId);

    return {
      id: guess.id,
      refugeSessionId: guess.refugeSessionId,
      dayNumber: guess.dayNumber,
      guessedAction1: guess.guessedAction1,
      guessedAction2: guess.guessedAction2,
      submittedAt: guess.submittedAt,
      dayResult: {
        matches: dayResult.matches,
        message: dayResult.message,
        reward,
        emoji: dayResult.emoji,
      },
    };
  }

  /**
   * Notifications émises après la validation d'une réponse. Le genre du parrain / de la marraine (un seul accès, une seule
   * fois par jour de jeu, uniquement pour le texte du compagnon) sert à écrire « parrain » ou « marraine ».
   */
  private static async notifyGuessSubmitted(a: {
    refugeSessionId: string;
    dayNumber: number;
    companionId: string;
    sponsorId: string;
    score: number;
    sponsorCoins: number;
  }): Promise<void> {
    try {
      let sponsorGender: string | null = null;
      try {
        const profile = await prisma.profile.findUnique({ where: { userId: a.sponsorId }, select: { gender: true } });
        sponsorGender = profile?.gender ?? null;
      } catch {
        // Genre indisponible : formulation neutre (« ton parrain ou ta marraine »), la notification part quand même.
      }
      await refugeNotifications.notifyGuessSubmitted({ ...a, sponsorGender });
    } catch {
      // Une notification ne fait jamais échouer l'action métier.
    }
  }

  // ============================================================
  // Économie — mouvements de pièces via le Wallet officiel (ledger)
  // ============================================================

  // Applique un delta de pièces DANS une transaction Prisma, avec écriture
  // CoinTransaction traçable. Règle officielle du Wallet : jamais de solde
  // négatif — une pénalité est plafonnée au solde disponible (le delta
  // théorique reste enregistré dans RefugeDayResult, le mouvement réel
  // dans la CoinTransaction).
  private static async applyRefugeCoinsTx(
    tx: Prisma.TransactionClient,
    userId: string,
    delta: number,
    txnType: CoinTxnType,
    meta: Prisma.InputJsonValue
  ): Promise<number> {
    if (delta === 0) return 0;

    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, coins: 0 },
    });
    // Verrou de ligne : deux transactions simultanées sur le même portefeuille (deux refuges, un achat…)
    // sont sérialisées, le solde lu ci-dessous est donc celui sur lequel on écrit — jamais de perte de mise à jour
    // ni de solde négatif.
    const locked = await tx.$queryRaw<{ coins: number }[]>`SELECT "coins" FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
    wallet.coins = locked?.[0]?.coins ?? wallet.coins;

    const applied = delta > 0 ? delta : -Math.min(-delta, wallet.coins);
    if (applied === 0) return 0; // pénalité sur solde nul : aucun mouvement, pas de négatif

    const newBalance = wallet.coins + applied;
    await tx.wallet.update({ where: { userId }, data: { coins: newBalance } });
    await tx.coinTransaction.create({
      data: {
        walletId: userId,
        type: txnType,
        amount: applied,
        balance: newBalance,
        meta,
      },
    });
    return applied; // montant EFFECTIVEMENT appliqué (signé, plafonné au solde pour une pénalité)
  }

  private static closureTxnType(status: RefugeDayStatus, isCredit: boolean): CoinTxnType {
    if (status === RefugeDayStatus.PERFECT) return CoinTxnType.REFUGE_PERFECT_REWARD;
    if (status === RefugeDayStatus.PARTIAL) return CoinTxnType.REFUGE_PARTIAL_REWARD;
    return isCredit ? CoinTxnType.REFUGE_PARTICIPATION_REWARD : CoinTxnType.REFUGE_INACTIVITY_PENALTY;
  }

  // ============================================================
  // Clôture des jours échus — persistée, transactionnelle, idempotente
  // ============================================================

  // Clôture un jour donné : crée le RefugeDayResult (unique par session+jour)
  // et applique les deltas de pièces dans LA MÊME transaction. La contrainte
  // unique garantit qu'une relance (job, requête concurrente) ne double jamais
  // les récompenses ni les pénalités : P2002 → jour déjà clôturé, no-op.
  private static async closeDay(
    session: { id: string; adopteId: string; adoptantId: string | null },
    dayNumber: number,
    closure: { status: RefugeDayStatusName; matchCount: number | null; adopteCoinsDelta: number; adoptantCoinsDelta: number },
    applyWalletMovements: boolean
  ): Promise<{ created: boolean; adopteApplied: number; adoptantApplied: number }> {
    let adopteApplied = 0;
    let adoptantApplied = 0;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.refugeDayResult.create({
          data: {
            refugeSessionId: session.id,
            dayNumber,
            status: closure.status as RefugeDayStatus,
            matchCount: closure.matchCount,
            adopteCoinsDelta: closure.adopteCoinsDelta,
            adoptantCoinsDelta: closure.adoptantCoinsDelta,
          },
        });

        if (applyWalletMovements) {
          const meta = { refugeSessionId: session.id, dayNumber, status: closure.status };
          adopteApplied = await this.applyRefugeCoinsTx(
            tx,
            session.adopteId,
            closure.adopteCoinsDelta,
            this.closureTxnType(closure.status as RefugeDayStatus, closure.adopteCoinsDelta > 0),
            { ...meta, role: "adopte", theoreticalDelta: closure.adopteCoinsDelta }
          );
          if (session.adoptantId) {
            adoptantApplied = await this.applyRefugeCoinsTx(
              tx,
              session.adoptantId,
              closure.adoptantCoinsDelta,
              this.closureTxnType(closure.status as RefugeDayStatus, closure.adoptantCoinsDelta > 0),
              { ...meta, role: "adoptant", theoreticalDelta: closure.adoptantCoinsDelta }
            );
          }
        }
      });
      return { created: true, adopteApplied, adoptantApplied };
    } catch (err: any) {
      if (err.code === "P2002") return { created: false, adopteApplied: 0, adoptantApplied: 0 }; // déjà clôturé — idempotence
      throw err;
    }
  }

  // Clôture d'un jour (règles v2) : résultat persisté, pièces éventuelles (consultation du parrain / de la marraine) et
  // points de classement DANS LA MÊME transaction. L'unicité (session, jour) garantit une seule clôture : jamais de
  // double récompense ni de double pénalité, même si le job et une requête arrivent ensemble.
  private static async closeDayV2(
    session: { id: string; adopteId: string; adoptantId: string },
    dayNumber: number,
    e: ReturnType<typeof evaluateDayV2>
  ): Promise<{ created: boolean; sponsorApplied: number }> {
    let sponsorApplied = 0;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.refugeDayResult.create({
          data: {
            refugeSessionId: session.id,
            dayNumber,
            status: e.status as RefugeDayStatus,
            matchCount: e.matchCount,
            adopteCoinsDelta: e.companion.coins,
            adoptantCoinsDelta: e.sponsor.coins,
            adopteAssiduous: e.companion.assiduous,
            adoptantAssiduous: e.sponsor.assiduous,
            adopteScoreDelta: e.companion.points,
            adoptantScoreDelta: e.sponsor.points,
          },
        });
        if (e.payAtClosure.sponsor > 0) {
          sponsorApplied = await this.applyRefugeCoinsTx(tx, session.adoptantId, e.payAtClosure.sponsor, CoinTxnType.REFUGE_DAILY_ASSIDUITY, {
            refugeSessionId: session.id,
            dayNumber,
            role: "adoptant",
            reason: "consultation",
          });
        }
        // Points du classement de sélection des profils : −5 par jour d'absence, jamais de pénalité en pièces.
        for (const [userId, points] of [[session.adopteId, e.companion.points], [session.adoptantId, e.sponsor.points]] as const) {
          if (points < 0) {
            await tx.profile.updateMany({ where: { userId }, data: { discoveryActivityScore: { decrement: ABSENCE_SCORE_PENALTY } } });
          }
        }
      });
      return { created: true, sponsorApplied };
    } catch (err: any) {
      if (err.code === "P2002") return { created: false, sponsorApplied: 0 };
      throw err;
    }
  }

  // ============================================================
  // Clôture d'une session expirée — unique, sans pièces, sans suppression
  // ============================================================

  /**
   * Une session dont la fin est dépassée reste ACTIVE en base (aucun job ne tourne : ENABLE_SCHEDULER=false) :
   * elle bloquait l'Adopté (« Tu as déjà un refuge en cours ») et refusait toute action.
   *
   *   - jour 7 joué (choix + réponse)  → AWAITING_REVEAL_CONSENT (phase de dévoilement) ;
   *   - sinon                          → ABANDONED (clôture propre).
   *
   * Garde conditionnelle (status=ACTIVE ET endsAt échue) : de N requêtes simultanées, une seule applique la
   * transition ; les autres constatent le même résultat (déterministe). Les choix, tentatives et résultats sont
   * conservés. Les jours incomplets sont d'abord soldés (closePastDays, règles de refuge.utils.ts), puis la session
   * est clôturée : closePastDays ne solde que les sessions ACTIVE, le règlement doit donc précéder la transition.
   * Les sessions DÉJÀ clôturées avant ce correctif ne sont pas réglées rétroactivement.
   *
   * Travaille sur les données déjà chargées par l'appelant : zéro requête si la session est en cours.
   */
  static async closeExpiredSession(
    session: {
      id: string;
      status: RefugeSessionStatus;
      endsAt: Date | null;
      adopteId?: string;
      adoptantId: string | null;
      rulesVersion?: number;
      dailyChoices?: { dayNumber: number }[];
      guesses?: { dayNumber: number }[];
    },
    now: Date = new Date()
  ): Promise<{ status: RefugeSessionStatus; closedByThisCall: boolean } | null> {
    if (session.status !== RefugeSessionStatus.ACTIVE || !isRefugeExpired(session.endsAt, now)) return null;

    // Règlement AVANT la clôture définitive : les jours sans résultat sont soldés selon les règles existantes
    // (computeDayClosure). Idempotent (un résultat par session et par jour : P2002 → ignoré), donc sans double
    // paiement même si plusieurs requêtes arrivent ensemble. En cas d'échec, la session reste ACTIVE et le
    // règlement sera retenté à la prochaine lecture : on ne clôture jamais une session non soldée.
    try {
      await this.closePastDays(session.id);
    } catch (err) {
      console.error("Refuge: règlement des jours avant clôture impossible", session.id, err);
      return null;
    }

    const v2 = (session.rulesVersion ?? 1) >= RULES_VERSION_V2;
    const lastDayPlayed =
      !!session.adoptantId && isDayCompleted(session.dailyChoices ?? [], session.guesses ?? [], REFUGE_DURATION_DAYS);
    // v1 : fin menée seulement si le jour 7 a été joué. v2 : toujours à l'expiration des 168 h, indépendamment des scores et
    // de l'assiduité (aucun seuil de participation). Une aventure non menée à terme (v1) est abandonnée, sans dévoilement.
    const completed = v2 || lastDayPlayed;
    // DÉVOILEMENT AUTOMATIQUE : à l'issue des 168 h les profils sont dévoilés, sans consentement. Sécurité : aucun dévoilement
    // si un blocage existe entre les deux ou si l'un des comptes est indisponible (aventure alors simplement terminée).
    const mayReveal = completed && !!session.adopteId && !!session.adoptantId && (await this.pairMayReveal(session.adopteId, session.adoptantId));
    const status = !completed
      ? RefugeSessionStatus.ABANDONED
      : mayReveal
        ? RefugeSessionStatus.REVEALED
        : RefugeSessionStatus.COMPLETED;

    let closedByThisCall = false;
    if (v2 && session.adopteId && session.adoptantId) {
      closedByThisCall = await this.finalizeV2(session.id, session.adopteId, session.adoptantId, now, status);
    } else {
      const claimed = await prisma.refugeSession.updateMany({
        where: { id: session.id, status: RefugeSessionStatus.ACTIVE, endsAt: { lte: now } },
        data: { status, ...(status === RefugeSessionStatus.REVEALED && { revealedAt: now }) },
      });
      closedByThisCall = (claimed?.count ?? 0) === 1;
    }
    // Session close : les DEUX participants sont prévenus, par la seule requête qui a effectué la transition (les autres,
    // simultanées, ne notifient pas). Les sessions fermées AVANT ce correctif ne sont pas notifiées.
    if (closedByThisCall && session.adopteId && session.adoptantId) {
      const ids = { refugeSessionId: session.id, companionId: session.adopteId, sponsorId: session.adoptantId };
      if (status === RefugeSessionStatus.ABANDONED) {
        void refugeNotifications.notifyExpired(ids);
      } else {
        // UNE seule notification de fin (bilan puis nouvelle histoire), v1 comme v2 : plus de notification de « choix ».
        void refugeNotifications.notifyFinalReport(ids);
        if (status === RefugeSessionStatus.REVEALED) {
          emitRefugeRevealed({ refugeSessionId: session.id, adopteId: session.adopteId, adoptantId: session.adoptantId, revealedAt: now });
          // Sourires réciproques + match, UNE SEULE FOIS : seule la requête qui a gagné la transition conditionnelle arrive ici.
          await this.createMutualRevealMatch(session.adopteId, session.adoptantId);
        }
      }
    }
    return { status, closedByThisCall };
  }

  /** Dévoilement automatique autorisé ? Non si un blocage existe (dans un sens ou dans l'autre) ou si un compte est banni / désactivé. */
  private static async pairMayReveal(userA: string, userB: string): Promise<boolean> {
    const [block, users, deactivatedA, deactivatedB] = await Promise.all([
      prisma.block.findFirst({ where: { OR: [{ fromId: userA, toId: userB }, { fromId: userB, toId: userA }] }, select: { id: true } }),
      prisma.user.findMany({ where: { id: { in: [userA, userB] } }, select: { id: true, isBanned: true } }),
      isAccountDeactivated(userA),
      isAccountDeactivated(userB),
    ]);
    return !block && users.length === 2 && users.every((u) => !u.isBanned) && !deactivatedA && !deactivatedB;
  }

  /**
   * Règlement final d'une session v2 (168 h écoulées, tous les jours déjà clôturés) : transition vers le dévoilement,
   * bonus finaux et totaux, en UNE transaction. La transition conditionnelle (status=ACTIVE, endsAt échue) est
   * revendiquée en premier : si une autre requête l'a déjà faite, rien n'est versé (count = 0). Retourne vrai si CET
   * appel a réalisé la transition.
   */
  private static async finalizeV2(
    sessionId: string,
    adopteId: string,
    adoptantId: string,
    now: Date,
    status: RefugeSessionStatus
  ): Promise<boolean> {
    const rows = await prisma.refugeDayResult.findMany({ where: { refugeSessionId: sessionId } });
    const f = computeFinalSettlement(rows);
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.refugeSession.updateMany({
        where: { id: sessionId, status: RefugeSessionStatus.ACTIVE, endsAt: { lte: now }, finalizedAt: null },
        data: {
          status,
          ...(status === RefugeSessionStatus.REVEALED && { revealedAt: now }),
          finalizedAt: now,
          adopteFinalBonus: f.companionBonus,
          adoptantFinalBonus: f.sponsorBonus,
        },
      });
      if (claimed.count !== 1) return false;
      const tier = f.perfectCourse ? "perfect-14" : "assiduity-7";
      if (f.companionBonus > 0) {
        await this.applyRefugeCoinsTx(tx, adopteId, f.companionBonus, CoinTxnType.REFUGE_FINAL_BONUS, { refugeSessionId: sessionId, role: "adopte", tier });
      }
      if (f.sponsorBonus > 0) {
        await this.applyRefugeCoinsTx(tx, adoptantId, f.sponsorBonus, CoinTxnType.REFUGE_FINAL_BONUS, { refugeSessionId: sessionId, role: "adoptant", tier });
      }
      return true;
    });
  }

  /** Variante pour les écritures, qui n'ont pas chargé les jours : ne lit que le jour 7 (chemin de refus uniquement). */
  static async closeExpiredSessionById(refugeSessionId: string) {
    const session = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
      select: {
        id: true,
        status: true,
        endsAt: true,
        adopteId: true,
        adoptantId: true,
        rulesVersion: true,
        dailyChoices: { where: { dayNumber: REFUGE_DURATION_DAYS }, select: { dayNumber: true } },
        guesses: { where: { dayNumber: REFUGE_DURATION_DAYS }, select: { dayNumber: true } },
      },
    });
    return session ? this.closeExpiredSession(session) : null;
  }

  // Clôture tous les jours arrivés à échéance (jour strictement passé, ou tous
  // les jours si la session est expirée) qui n'ont pas encore de résultat final.
  // Appelée par les écritures Refuge (POST) et par le job planifié — jamais
  // pour appliquer des récompenses dans un GET.
  static async closePastDays(refugeSessionId: string): Promise<void> {
    const session = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
      include: { dailyChoices: true, guesses: true, dayResults: true },
    });

    if (!session || session.status !== RefugeSessionStatus.ACTIVE) return;
    if (!session.startedAt || !session.adoptantId) return;

    const now = new Date();
    const currentDay = getCurrentDay(session.createdAt, session.startedAt, now);
    const expired = isRefugeExpired(session.endsAt, now);
    const lastDueDay = expired ? REFUGE_DURATION_DAYS : Math.min(currentDay - 1, REFUGE_DURATION_DAYS);

    // Jours réellement réglés PAR CET APPEL et pièces effectivement appliquées : une seule notification par participant.
    const settledDays: number[] = [];
    let adopteApplied = 0;
    let adoptantApplied = 0;

    for (let day = 1; day <= lastDueDay; day++) {
      if (session.dayResults.some((r) => r.dayNumber === day)) continue;

      const choice = session.dailyChoices.find((dc) => dc.dayNumber === day);
      const guess = session.guesses.find((g) => g.dayNumber === day);

      if (session.rulesVersion >= RULES_VERSION_V2) {
        const e = evaluateDayV2({
          choiceAt: choice?.submittedAt ?? null,
          guessAt: guess?.submittedAt ?? null,
          matches: choice && guess ? calculateDayResult(choice, guess).matches : null,
          consulted: hasConsulted(session.adoptantConsultMask, day),
          windowEnd: dayWindow(session.startedAt, day).end,
        });
        const r = await this.closeDayV2({ id: session.id, adopteId: session.adopteId, adoptantId: session.adoptantId }, day, e);
        if (r.created && r.sponsorApplied !== 0) {
          settledDays.push(day);
          adoptantApplied += r.sponsorApplied;
        }
        continue;
      }

      // L'Adoptant est réputé présent pour ce jour si sa dernière activité
      // tombe dans la fenêtre du jour (règle métier retenue : on ne le
      // pénalise jamais s'il n'a montré aucune présence ce jour-là, et on ne
      // pénalise pas non plus l'Adopté si personne n'est venu → NOT_PLAYED).
      const window = dayWindow(session.startedAt, day);
      const adoptantWasPresent =
        !!session.lastAdoptantActivityAt &&
        session.lastAdoptantActivityAt >= window.start &&
        session.lastAdoptantActivityAt < window.end;

      const matches = choice && guess ? calculateDayResult(choice, guess).matches : null;
      const closure = computeDayClosure(!!choice, !!guess, matches, adoptantWasPresent);

      // Jour complet (choix+réponse) : les récompenses ont déjà été versées à
      // la soumission de la réponse — on ne persiste ici que le résultat.
      const applyWallet = !(choice && guess);
      const result = await this.closeDay(session, day, closure, applyWallet);
      if (result.created && applyWallet) {
        settledDays.push(day);
        adopteApplied += result.adopteApplied;
        adoptantApplied += result.adoptantApplied;
      }
    }

    // Gains / pertes réellement appliqués (jamais le montant théorique) : rien si aucun mouvement.
    if (settledDays.length > 0 && (adopteApplied !== 0 || adoptantApplied !== 0)) {
      void refugeNotifications.notifyCoinsSettled({
        refugeSessionId: session.id,
        days: settledDays,
        companionId: session.adopteId,
        sponsorId: session.adoptantId,
        companionApplied: adopteApplied,
        sponsorApplied: adoptantApplied,
      });
    }
  }

  // ============================================================
  // Phase finale — consentement mutuel au dévoilement des profils
  // ============================================================

  // Règle impérative : le dévoilement n'est JAMAIS proposé avant l'expiration des sept jours complets (168 h depuis
  // l'adoption), même si les actions du jour 7 sont terminées. Version 1 : le jour 7 doit en plus avoir été joué ;
  // version 2 : proposé dans tous les cas, indépendamment des scores et de l'assiduité.
  private static isRevealPhaseReached(
    refugeSession: { endsAt: Date | null; adoptantId: string | null; rulesVersion?: number },
    dailyChoices: { dayNumber: number }[],
    guesses: { dayNumber: number }[],
    now: Date = new Date()
  ): boolean {
    if (!refugeSession.adoptantId || !isRefugeExpired(refugeSession.endsAt, now)) return false;
    if ((refugeSession.rulesVersion ?? 1) >= RULES_VERSION_V2) return true;
    return isDayCompleted(dailyChoices, guesses, REFUGE_DURATION_DAYS);
  }

  static async submitRevealConsent(
    refugeSessionId: string,
    userId: string,
    decision: "ACCEPT" | "REFUSE"
  ): Promise<RefugeSessionWithMetadata> {
    const refugeSession = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
      include: { guesses: true, dailyChoices: true },
    });

    if (!refugeSession) {
      throw new NotFoundError("Refuge non trouvé");
    }

    const isAdopte = userId === refugeSession.adopteId;
    const isAdoptant = userId === refugeSession.adoptantId;
    if (!isAdopte && !isAdoptant) {
      throw new ForbiddenError("Tu n'as accès à ce refuge");
    }

    // Une session expirée est d'abord clôturée (sans mouvement de pièces) : closePastDays ne solde que les
    // sessions ACTIVE. Jour 7 non joué : la session est terminée, aucun dévoilement possible.
    const closure = await this.closeExpiredSession(refugeSession);
    if (closure) {
      if (closure.status === RefugeSessionStatus.ABANDONED) throw new ConflictError("Cette session est terminée");
      refugeSession.status = closure.status;
    }

    // Solder les jours passés avant de figer la fin de session (écriture POST)
    await this.closePastDays(refugeSessionId);

    const myDecision = isAdopte
      ? refugeSession.adopteRevealDecision
      : refugeSession.adoptantRevealDecision;

    // Idempotence : re-soumettre la même décision (double clic, retry réseau)
    // renvoie simplement l'état courant. Changer d'avis est refusé.
    if (myDecision) {
      if (myDecision === decision) {
        return this.getRefugeSession(refugeSessionId, userId);
      }
      throw new ConflictError("Ta décision est déjà enregistrée");
    }

    // Dévoilement désormais automatique : une ancienne application qui répond encore reçoit simplement l'état courant.
    if (refugeSession.status === RefugeSessionStatus.REVEALED) return this.getRefugeSession(refugeSessionId, userId);

    if (
      refugeSession.status !== RefugeSessionStatus.ACTIVE &&
      refugeSession.status !== RefugeSessionStatus.AWAITING_REVEAL_CONSENT
    ) {
      throw new ConflictError("Cette session est terminée");
    }

    if (!this.isRevealPhaseReached(refugeSession, refugeSession.dailyChoices, refugeSession.guesses)) {
      throw new ConflictError("Le dévoilement n'est possible qu'à la fin des sept jours");
    }

    const myField = isAdopte ? "adopteRevealDecision" : "adoptantRevealDecision";

    if (decision === "REFUSE") {
      // Refus → fin propre, aucune donnée révélée. Garde conditionnelle : ne
      // s'applique que si la session est encore ouverte et ma décision absente.
      const refused = await prisma.refugeSession.updateMany({
        where: {
          id: refugeSessionId,
          status: { in: [RefugeSessionStatus.ACTIVE, RefugeSessionStatus.AWAITING_REVEAL_CONSENT] },
          [myField]: null,
        },
        data: { [myField]: "REFUSE", status: RefugeSessionStatus.COMPLETED },
      });
      // L'autre participant est prévenu une seule fois, et seulement si le refus vient d'être enregistré.
      const otherId = isAdopte ? refugeSession.adoptantId : refugeSession.adopteId;
      if (refused?.count === 1 && otherId) {
        void refugeNotifications.notifyRevealRefused({ refugeSessionId, refusedBy: userId, otherId });
      }
    } else {
      // ACCEPT : enregistrer ma décision (garde conditionnelle contre les courses)
      await prisma.refugeSession.updateMany({
        where: {
          id: refugeSessionId,
          status: { in: [RefugeSessionStatus.ACTIVE, RefugeSessionStatus.AWAITING_REVEAL_CONSENT] },
          [myField]: null,
        },
        data: { [myField]: "ACCEPT", status: RefugeSessionStatus.AWAITING_REVEAL_CONSENT },
      });

      // Promotion atomique : REVEALED si et seulement si les deux ont accepté.
      // Le WHERE status=AWAITING_REVEAL_CONSENT garantit qu'une seule des deux
      // requêtes concurrentes effectue la transition (count=1) : revealedAt est
      // posé une seule fois et l'événement métier émis une seule fois.
      const promoted = await prisma.refugeSession.updateMany({
        where: {
          id: refugeSessionId,
          status: RefugeSessionStatus.AWAITING_REVEAL_CONSENT,
          adopteRevealDecision: "ACCEPT",
          adoptantRevealDecision: "ACCEPT",
          revealedAt: null,
        },
        data: { status: RefugeSessionStatus.REVEALED, revealedAt: new Date() },
      });

      if (promoted.count === 1 && refugeSession.adoptantId) {
        const revealed = await prisma.refugeSession.findUnique({
          where: { id: refugeSessionId },
          select: { revealedAt: true },
        });
        emitRefugeRevealed({
          refugeSessionId,
          adopteId: refugeSession.adopteId,
          adoptantId: refugeSession.adoptantId,
          revealedAt: revealed?.revealedAt ?? new Date(),
        });
        // Règle : le dévoilement mutuel envoie automatiquement les deux sourires et crée le match, UNE SEULE FOIS : seule la
        // requête qui gagne la promotion atomique ci-dessus arrive ici. Système de match existant (blocages, limites, match déjà
        // existant respectés) ; un échec n'invalide jamais le dévoilement.
        await this.createMutualRevealMatch(refugeSession.adopteId, refugeSession.adoptantId);
        // Dévoilement mutuel : les DEUX participants sont prévenus, une seule fois (promotion atomique ci-dessus).
        void refugeNotifications.notifyRevealed({
          refugeSessionId,
          acceptedLastBy: userId,
          otherId: userId === refugeSession.adopteId ? refugeSession.adoptantId : refugeSession.adopteId,
        });
      }
    }

    return this.getRefugeSession(refugeSessionId, userId);
  }

  /**
   * Sourires réciproques automatiques puis match, via le système existant (sendReaction : blocages, comptes indisponibles,
   * limite de matchs, match déjà existant — jamais de doublon : réaction unique par couple, match unique par couple).
   * Annonce du match et notifications : événement `matchCreated` habituel, émis une seule fois par le système de match.
   */
  private static async createMutualRevealMatch(companionId: string, sponsorId: string): Promise<void> {
    try {
      await sendReaction(companionId, { toId: sponsorId, type: "SMILE" } as never);
      await sendReaction(sponsorId, { toId: companionId, type: "SMILE" } as never);
    } catch (err) {
      // Blocage, limite de matchs, compte indisponible, ou match créé en parallèle : pas de match de plus, jamais d'erreur.
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Refuge : sourires automatiques non appliqués");
    }
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

  // ============================================================
  // Historique des adoptions — sessions terminées de l'utilisateur
  // ============================================================

  static async getRefugeHistory(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ entries: import("./refuge.types").RefugeHistoryEntry[]; page: number; limit: number; total: number }> {
    const where = {
      OR: [{ adopteId: userId }, { adoptantId: userId }],
      status: {
        in: [RefugeSessionStatus.COMPLETED, RefugeSessionStatus.ABANDONED, RefugeSessionStatus.REVEALED],
      },
    };

    const [total, sessions] = await Promise.all([
      prisma.refugeSession.count({ where }),
      prisma.refugeSession.findMany({
        where,
        include: {
          dayResults: { orderBy: { dayNumber: "asc" } },
          dailyChoices: true,
          guesses: true,
          adopte: { select: { id: true, profile: { select: { pseudo: true } } } },
          adoptant: { select: { id: true, profile: { select: { pseudo: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const entries = await Promise.all(
      sessions.map(async (s) => {
        const role: "adopte" | "adoptant" = s.adopteId === userId ? "adopte" : "adoptant";
        const otherUserId = role === "adopte" ? s.adoptantId : s.adopteId;
        const revealed = s.status === RefugeSessionStatus.REVEALED;

        // Résultats des 7 jours : persistés d'abord, dérivation lecture pure
        // pour les jours complets legacy, OPEN sinon (session finie → figé).
        const dailyResults: DailyResultEntry[] = [];
        for (let day = 1; day <= REFUGE_DURATION_DAYS; day++) {
          const persisted = s.dayResults.find((r) => r.dayNumber === day);
          if (persisted) {
            const statusName = persisted.status as RefugeDayStatusName;
            dailyResults.push({
              dayNumber: day,
              status: statusName,
              matchCount: persisted.matchCount,
              symbol: DAY_STATUS_SYMBOLS[statusName],
              adopteCoinsDelta: persisted.adopteCoinsDelta,
              adoptantCoinsDelta: persisted.adoptantCoinsDelta,
              message: DAY_STATUS_MESSAGES[statusName],
            });
            continue;
          }
          const choice = s.dailyChoices.find((dc) => dc.dayNumber === day);
          const guess = s.guesses.find((g) => g.dayNumber === day);
          if (choice && guess) {
            const derived = computeDayClosure(true, true, calculateDayResult(choice, guess).matches, true);
            dailyResults.push({
              dayNumber: day,
              status: derived.status,
              matchCount: derived.matchCount,
              symbol: DAY_STATUS_SYMBOLS[derived.status],
              adopteCoinsDelta: derived.adopteCoinsDelta,
              adoptantCoinsDelta: derived.adoptantCoinsDelta,
              message: DAY_STATUS_MESSAGES[derived.status],
            });
            continue;
          }
          dailyResults.push({
            dayNumber: day,
            status: "OPEN",
            matchCount: null,
            symbol: DAY_STATUS_SYMBOLS.OPEN,
            adopteCoinsDelta: 0,
            adoptantCoinsDelta: 0,
            message: DAY_STATUS_MESSAGES.OPEN,
          });
        }

        const heartsCount = dailyResults.filter((r) => r.status === "PARTIAL" || r.status === "PERFECT").length;
        const failuresCount = dailyResults.filter((r) => r.status === "FAILED").length;
        const incompleteCount = dailyResults.filter(
          (r) => r.status === "INCOMPLETE_ADOPTE_MISSING" || r.status === "INCOMPLETE_ADOPTANT_MISSING"
        ).length;
        const notPlayedCount = dailyResults.filter((r) => r.status === "NOT_PLAYED").length;
        const finalBonus = role === "adopte" ? s.adopteFinalBonus : s.adoptantFinalBonus;
        const totalCoinsDelta =
          dailyResults.reduce((sum, r) => sum + (role === "adopte" ? r.adopteCoinsDelta : r.adoptantCoinsDelta), 0) + finalBonus;

        // État relationnel — flux Sourire / match existants, lecture seule
        let smileState: "NONE" | "SENT" | "RECEIVED" | "MUTUAL" = "NONE";
        let nextStepState: "NONE" | "QUESTIONS_STARTED" | "DISCUSSION_OPEN" = "NONE";
        if (otherUserId) {
          const [sent, received, match] = await Promise.all([
            prisma.reaction.findUnique({
              where: { fromId_toId: { fromId: userId, toId: otherUserId } },
            }),
            prisma.reaction.findUnique({
              where: { fromId_toId: { fromId: otherUserId, toId: userId } },
            }),
            prisma.match.findFirst({
              where: {
                OR: [
                  { userAId: userId, userBId: otherUserId },
                  { userAId: otherUserId, userBId: userId },
                ],
              },
              include: { _count: { select: { questionAttempts: true, letters: true } } },
            }),
          ]);

          const sentSmile = sent?.type === "SMILE";
          const receivedSmile = received?.type === "SMILE";
          if (sentSmile && receivedSmile) smileState = "MUTUAL";
          else if (sentSmile) smileState = "SENT";
          else if (receivedSmile) smileState = "RECEIVED";

          if (match) {
            if ((match._count?.letters ?? 0) > 0) nextStepState = "DISCUSSION_OPEN";
            else if ((match._count?.questionAttempts ?? 0) > 0) nextStepState = "QUESTIONS_STARTED";
          }
        }

        // Confidentialité : l'identité de l'autre n'est exposée que si révélé
        const otherUser = role === "adopte" ? s.adoptant : s.adopte;
        const otherUserSummary =
          revealed && otherUser
            ? { userId: otherUser.id, pseudo: otherUser.profile?.pseudo || "Anonyme" }
            : null;

        return {
          sessionId: s.id,
          status: s.status,
          role,
          animalType: s.animalType,
          startedAt: s.startedAt,
          endedAt: s.revealedAt ?? s.endsAt,
          dailyResults,
          heartsCount,
          failuresCount,
          incompleteCount,
          notPlayedCount,
          totalCoinsDelta,
          revealed,
          otherUserSummary,
          smileState,
          nextStepState,
        };
      })
    );

    return { entries, page, limit, total };
  }

  // ============================================================
  // DEV MODE - "Jour suivant" : avance d'exactement un jour, autorisé
  // UNIQUEMENT si le jour courant est terminé (choix + réponse soumis).
  // Le jour est persisté sur la session : les deux comptes basculent ensemble.
  // ============================================================

  static async devAdvanceDay(refugeSessionId: string): Promise<RefugeSessionWithMetadata> {
    const refugeSession = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
      include: { dailyChoices: true, guesses: true },
    });

    if (!refugeSession) {
      throw new NotFoundError("Refuge not found");
    }

    if (refugeSession.status !== RefugeSessionStatus.ACTIVE) {
      throw new ConflictError("Refuge must be ACTIVE to use dev time-travel");
    }

    const currentDay = getCurrentDay(refugeSession.createdAt, refugeSession.startedAt, new Date());

    if (!isDayCompleted(refugeSession.dailyChoices, refugeSession.guesses, currentDay)) {
      throw new ConflictError(
        `Le jour ${currentDay} n'est pas terminé : choix de l'Adopté et réponse de l'Adoptant requis avant d'avancer`
      );
    }

    if (currentDay >= REFUGE_DURATION_DAYS) {
      throw new ConflictError("Jour 7 atteint : plus de jour suivant, place à la phase finale");
    }

    return this.devSetDay(refugeSessionId, currentDay + 1);
  }

  // ============================================================
  // DEV MODE - Remise à zéro contrôlée d'une session de test
  // Nettoie les données incohérentes laissées par d'anciennes versions.
  // ============================================================

  static async devResetSession(
    refugeSessionId: string,
    userId: string,
    mode: "reset" | "abandon" | "consent"
  ): Promise<RefugeSessionDTO> {
    const refugeSession = await prisma.refugeSession.findUnique({
      where: { id: refugeSessionId },
    });

    if (!refugeSession) {
      throw new NotFoundError("Refuge non trouvé");
    }

    // Seul un participant de la session peut la réinitialiser
    if (userId !== refugeSession.adopteId && userId !== refugeSession.adoptantId) {
      throw new ForbiddenError("Tu n'as accès à ce refuge");
    }

    // Mode "consent" : efface uniquement les décisions de dévoilement pour
    // rejouer les scénarios de la phase finale (les jours joués sont conservés).
    if (mode === "consent") {
      const updated = await prisma.$transaction(async (tx) => {
        // Les décisions sont effacées : les notifications de la phase finale (et leur clé d'idempotence) aussi.
        await purgeRelationNotifications(tx, { refugeSessionIds: [refugeSessionId] }, {
          types: ["REFUGE_REVEAL_PHASE", "REFUGE_REVEALED"],
        });
        return tx.refugeSession.update({
          where: { id: refugeSessionId },
          data: {
            adopteRevealDecision: null,
            adoptantRevealDecision: null,
            revealedAt: null,
            status: RefugeSessionStatus.ACTIVE,
          },
        });
      });
      return this.mapToDTO(updated);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Session remise à zéro ou close : plus d'adoption ni de phase finale à signaler. Purger libère aussi la clé
      // d'idempotence `refuge-adopted:<id>`, sans quoi une nouvelle adoption ne préviendrait personne.
      await purgeRelationNotifications(tx, { refugeSessionIds: [refugeSessionId] });
      // Purger tous les choix et tentatives de la session
      await tx.refugeDailyChoice.deleteMany({ where: { refugeSessionId } });
      await tx.refugeGuess.deleteMany({ where: { refugeSessionId } });

      if (mode === "abandon") {
        // Clore définitivement la session de test.
        // adoptantId est libéré pour que la contrainte unique (adopteId, adoptantId)
        // n'empêche pas ce duo de test de rejouer ensemble.
        return tx.refugeSession.update({
          where: { id: refugeSessionId },
          data: {
            status: RefugeSessionStatus.ABANDONED,
            adoptantId: null,
            startedAt: null,
            lastAdopteActivityAt: new Date(),
            lastAdoptantActivityAt: null,
            adopteRevealDecision: null,
            adoptantRevealDecision: null,
            revealedAt: null,
          },
        });
      }

      // Remettre la session à l'état "proposée, en attente d'un adoptant"
      return tx.refugeSession.update({
        where: { id: refugeSessionId },
        data: {
          status: RefugeSessionStatus.WAITING_FOR_ADOPTANT,
          adoptantId: null,
          startedAt: null,
          endsAt: calculateRefugeEndsAt(new Date()),
          lastAdopteActivityAt: new Date(),
          lastAdoptantActivityAt: null,
          adopteRevealDecision: null,
          adoptantRevealDecision: null,
          revealedAt: null,
        },
      });
    });

    return this.mapToDTO(updated);
  }
}
