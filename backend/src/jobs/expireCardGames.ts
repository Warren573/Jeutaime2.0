/**
 * Job : expireCardGames
 *
 * Passe en EXPIRED les sessions ACTIVE dont expiresAt <= now.
 * Idempotent : un second run ne fait rien.
 * La source de vérité reste la logique on-the-fly dans le service,
 * ce job garantit juste que la colonne status converge.
 */
import { CardGameStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { Job, JobResult } from "./types";

const JOB_NAME = "expireCardGames";

export const expireCardGamesJob: Job = {
  name: JOB_NAME,
  description:
    "Passe en EXPIRED les sessions CardGame ACTIVE dont expiresAt <= now.",

  async run(now: Date = new Date()): Promise<JobResult> {
    const where = {
      status: CardGameStatus.ACTIVE,
      expiresAt: { lte: now },
    } as const;

    const scanned = await prisma.cardGameSession.count({ where });
    const result = await prisma.cardGameSession.updateMany({
      where,
      data: { status: CardGameStatus.EXPIRED },
    });

    return {
      jobName: JOB_NAME,
      scanned,
      affected: result.count,
      durationMs: 0,
    };
  },
};
