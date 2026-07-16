/**
 * Job : closeRefugeDays
 *
 * Clôture les journées de Refuge arrivées à échéance (jour strictement passé,
 * ou tous les jours restants si la session est expirée) : statut final
 * persisté (RefugeDayResult) + pièces via le Wallet officiel.
 *
 * Idempotent : la contrainte unique (refugeSessionId, dayNumber) garantit
 * qu'une relance ne recrée jamais un résultat ni ne double les mouvements
 * de pièces — RefugeService.closePastDays ignore les jours déjà clôturés.
 */
import { RefugeSessionStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { RefugeService } from "../modules/refuge/refuge.service";
import type { Job, JobResult } from "./types";

const JOB_NAME = "closeRefugeDays";

export const closeRefugeDaysJob: Job = {
  name: JOB_NAME,
  description:
    "Clôture les journées de Refuge échues : résultat final persisté + pièces (idempotent).",

  async run(now: Date = new Date()): Promise<JobResult> {
    // Sessions ACTIVE démarrées depuis plus de 24h : au moins un jour est échu.
    const dayMs = 24 * 60 * 60 * 1000;
    const sessions = await prisma.refugeSession.findMany({
      where: {
        status: RefugeSessionStatus.ACTIVE,
        startedAt: { lte: new Date(now.getTime() - dayMs) },
      },
      select: { id: true },
    });

    let affected = 0;
    for (const s of sessions) {
      const before = await prisma.refugeDayResult.count({ where: { refugeSessionId: s.id } });
      await RefugeService.closePastDays(s.id);
      const after = await prisma.refugeDayResult.count({ where: { refugeSessionId: s.id } });
      affected += after - before;
    }

    return {
      jobName: JOB_NAME,
      scanned: sessions.length,
      affected,
      durationMs: 0,
    };
  },
};
