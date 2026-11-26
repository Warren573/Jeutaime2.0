/**
 * Job : notifyRefugeNewDay
 *
 * Prévient le COMPAGNON qu'une nouvelle journée du Refuge a commencé (jours 2 à 7) et qu'il peut choisir ses deux
 * actions — seulement s'il ne l'a pas déjà fait.
 *
 * Coût Neon : UNE requête de lecture par exécution (sessions ACTIVE démarrées depuis plus de 24 h, avec les numéros de
 * jours déjà choisis) et cadence HORAIRE (comme closeRefugeDays) : jamais de requête par session ni par minute. Les
 * notifications déjà traitées par ce processus sont mémorisées (`handled`) : une journée n'est tentée qu'une fois ;
 * après un redémarrage, la clé d'idempotence en base (une seule notification par destinataire et journée) évite tout doublon.
 *
 * Précision : la notification part à la prochaine exécution après le changement de jour (au plus ~1 h plus tard, et
 * seulement tant que le service tourne).
 */
import { RefugeSessionStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { getCurrentDay, isRefugeExpired } from "../modules/refuge/refuge.utils";
import { notifyNewDay } from "../modules/refuge/refuge.notifications";
import type { Job, JobResult } from "./types";

const JOB_NAME = "notifyRefugeNewDay";
const DAY_MS = 24 * 60 * 60 * 1000;

export interface NewDayCandidateSession {
  id: string;
  adopteId: string;
  adoptantId: string | null;
  createdAt: Date;
  startedAt: Date | null;
  endsAt: Date | null;
  dailyChoices: { dayNumber: number }[];
}

export interface NewDayTarget {
  refugeSessionId: string;
  dayNumber: number;
  companionId: string;
  sponsorId: string;
  key: string;
}

/** Fonction PURE : quelles sessions doivent recevoir « nouvelle journée » à l'instant `now` (jours 2 à 7, aucun choix du jour). */
export function findNewDayTargets(sessions: readonly NewDayCandidateSession[], now: Date): NewDayTarget[] {
  const targets: NewDayTarget[] = [];
  for (const s of sessions) {
    if (!s.startedAt || !s.adoptantId || isRefugeExpired(s.endsAt, now)) continue;
    const dayNumber = getCurrentDay(s.createdAt, s.startedAt, now);
    if (dayNumber < 2) continue; // le jour 1 commence avec l'adoption (déjà notifiée)
    if (s.dailyChoices.some((c) => c.dayNumber === dayNumber)) continue; // déjà choisi : rien à annoncer
    targets.push({
      refugeSessionId: s.id,
      dayNumber,
      companionId: s.adopteId,
      sponsorId: s.adoptantId,
      key: `${s.id}:${dayNumber}`,
    });
  }
  return targets;
}

/** Journées déjà traitées par ce processus (évite toute requête répétée pour une journée déjà annoncée). */
const handled = new Set<string>();
export function resetHandledNewDays(): void {
  handled.clear();
}

export const notifyRefugeNewDayJob: Job = {
  name: JOB_NAME,
  cadence: "hourly",
  description: "Prévient le compagnon qu'une nouvelle journée du Refuge a commencé (une requête de lecture par heure).",

  async run(now: Date = new Date()): Promise<JobResult> {
    const sessions = await prisma.refugeSession.findMany({
      where: {
        status: RefugeSessionStatus.ACTIVE,
        adoptantId: { not: null },
        startedAt: { lte: new Date(now.getTime() - DAY_MS) },
      },
      select: {
        id: true,
        adopteId: true,
        adoptantId: true,
        createdAt: true,
        startedAt: true,
        endsAt: true,
        dailyChoices: { select: { dayNumber: true } },
      },
    });

    let affected = 0;
    for (const target of findNewDayTargets(sessions, now)) {
      if (handled.has(target.key)) continue;
      handled.add(target.key);
      const outcome = await notifyNewDay(target);
      if (outcome.created) affected++;
      else if (outcome.reason === "error") handled.delete(target.key); // réessayé à la prochaine exécution
    }

    return { jobName: JOB_NAME, scanned: sessions.length, affected, durationMs: 0 };
  },
};
