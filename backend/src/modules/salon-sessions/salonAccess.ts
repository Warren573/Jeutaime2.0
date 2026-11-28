import type { SalonKind } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ForbiddenError } from "../../core/errors";

/**
 * Contrôles d'accès partagés par les salons, les offrandes et les magies.
 *
 * Règle commune : toute lecture ou action sociale liée à un salon exige d'être
 * participant ACTIF d'une session OUVERTE (status ACTIVE et expiresAt > maintenant).
 * Les groupes d'un même salon sont étanches : une session = un groupe.
 *
 * Ce module ne modifie aucune règle de constitution des groupes, de changement de
 * salon ni de durée : il ne fait que lire l'état existant.
 */

export const NOT_IN_SESSION_MESSAGE = "Tu dois être membre actif d'une session de ce salon";
export const BLOCKED_INTERACTION_MESSAGE = "Impossible d'interagir avec cet utilisateur";

/** Une session est ouverte tant qu'elle est ACTIVE et que son échéance n'est pas passée. */
export function isSessionOpen(
  session: { status: string; expiresAt: Date },
  now: Date = new Date(),
): boolean {
  return session.status === "ACTIVE" && session.expiresAt.getTime() > now.getTime();
}

/**
 * Session ouverte du salon `salonKind` dont `userId` est participant actif.
 * Si `sessionId` est fourni, seule cette session est acceptée.
 * Plusieurs sessions possibles (publique + privée) : la plus récemment rejointe.
 * Retourne null si l'utilisateur n'est pas membre.
 */
export async function findOpenMembership(
  userId: string,
  salonKind: SalonKind,
  sessionId?: string,
  now: Date = new Date(),
): Promise<{ sessionId: string; startedAt: Date } | null> {
  const row = await prisma.salonSessionParticipant.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      session: {
        ...(sessionId ? { id: sessionId } : {}),
        salonKind,
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
    },
    orderBy: { joinedAt: "desc" },
    select: { sessionId: true, session: { select: { startedAt: true } } },
  });
  return row ? { sessionId: row.sessionId, startedAt: row.session.startedAt } : null;
}

/** Idem, mais lève 403 si l'utilisateur n'est pas membre actif d'une session ouverte. */
export async function requireOpenMembership(
  userId: string,
  salonKind: SalonKind,
  sessionId?: string,
  now: Date = new Date(),
): Promise<{ sessionId: string; startedAt: Date }> {
  const membership = await findOpenMembership(userId, salonKind, sessionId, now);
  if (!membership) throw new ForbiddenError(NOT_IN_SESSION_MESSAGE);
  return membership;
}

/**
 * Session ouverte (du salon `salonKind` si fourni) dans laquelle TOUS les `userIds` sont
 * participants actifs. Si `sessionId` est fourni, seule cette session est acceptée.
 * Retourne null si aucune session commune n'existe (autre groupe, session expirée…).
 */
export async function findSharedOpenSession(
  userIds: string[],
  salonKind: SalonKind | undefined,
  sessionId?: string,
  now: Date = new Date(),
): Promise<{ id: string; startedAt: Date } | null> {
  const unique = [...new Set(userIds)];
  const session = await prisma.salonSession.findFirst({
    where: {
      ...(sessionId ? { id: sessionId } : {}),
      ...(salonKind ? { salonKind } : {}),
      status: "ACTIVE",
      expiresAt: { gt: now },
      AND: unique.map((userId) => ({
        participants: { some: { userId, status: "ACTIVE" as const } },
      })),
    },
    orderBy: { startedAt: "asc" },
    select: { id: true, startedAt: true },
  });
  return session;
}

/** Vrai si un blocage existe entre les deux utilisateurs, dans un sens ou dans l'autre. */
export async function areBlocked(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { fromId: a, toId: b },
        { fromId: b, toId: a },
      ],
    },
    select: { id: true },
  });
  return block !== null;
}

/** Lève 403 si un blocage existe entre les deux utilisateurs. */
export async function assertNotBlocked(a: string, b: string): Promise<void> {
  if (await areBlocked(a, b)) throw new ForbiddenError(BLOCKED_INTERACTION_MESSAGE);
}

/** Identifiants des utilisateurs (parmi `candidateIds`) bloqués avec `userId`, dans un sens ou dans l'autre. */
export async function findBlockedAmong(userId: string, candidateIds: string[]): Promise<Set<string>> {
  const others = [...new Set(candidateIds)].filter((id) => id !== userId);
  if (others.length === 0) return new Set();
  const blocks = await prisma.block.findMany({
    where: {
      OR: [
        { fromId: userId, toId: { in: others } },
        { toId: userId, fromId: { in: others } },
      ],
    },
    select: { fromId: true, toId: true },
  });
  return new Set(blocks.map((b) => (b.fromId === userId ? b.toId : b.fromId)));
}

/**
 * Identifiants de tous les participants (quel que soit leur statut) des sessions
 * OUVERTES dont `userId` est participant actif dans le salon `salonKind`.
 * Sert à restreindre les listes (offrandes, sorts) au seul groupe de l'utilisateur.
 */
export async function listGroupUserIds(
  userId: string,
  salonKind: SalonKind,
  now: Date = new Date(),
): Promise<string[]> {
  const sessions = await prisma.salonSession.findMany({
    where: {
      salonKind,
      status: "ACTIVE",
      expiresAt: { gt: now },
      participants: { some: { userId, status: "ACTIVE" } },
    },
    select: { participants: { select: { userId: true } } },
  });
  return [...new Set(sessions.flatMap((s) => s.participants.map((p) => p.userId)))];
}
