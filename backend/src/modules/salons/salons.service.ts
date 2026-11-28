import { Prisma, Salon, SalonKind } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ForbiddenError, NotFoundError } from "../../core/errors";
import { NOT_IN_SESSION_MESSAGE, requireOpenMembership } from "../salon-sessions/salonAccess";

// ============================================================
// Helpers internes
// ============================================================

function computeAge(birthDate: Date | null | undefined): number | null {
  if (!birthDate) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  if (
    now.getMonth() < birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() &&
      now.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age >= 13 ? age : null;
}

// ============================================================
// DTO public — renvoyé au frontend
//
// On expose volontairement toutes les données visuelles dont le
// frontend a besoin pour rendre le salon, tout en gardant des noms
// stables. Le champ `gradient` historique est conservé pour les
// clients legacy.
// ============================================================
export interface SalonPublicDto {
  id: string;
  kind: SalonKind;
  name: string;
  description: string | null;
  magicAction: string | null;

  // Visuel
  backgroundImage: string | null;
  backgroundType: string;
  backgroundConfig: Prisma.JsonValue | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  textColor: string | null;

  // Legacy — conservé pour rétro-compat frontend
  gradient: Prisma.JsonValue | null;

  // Ordre d'affichage
  order: number;
}

function toPublicDto(s: Salon): SalonPublicDto {
  return {
    id: s.id,
    kind: s.kind,
    name: s.name,
    description: s.description,
    magicAction: s.magicAction,
    backgroundImage: s.backgroundImage,
    backgroundType: s.backgroundType,
    backgroundConfig: s.backgroundConfig,
    primaryColor: s.primaryColor,
    secondaryColor: s.secondaryColor,
    textColor: s.textColor,
    gradient: s.gradient,
    order: s.order,
  };
}

// ============================================================
// listActive — salons actifs uniquement, triés par ordre
// ============================================================
export async function listActive(): Promise<SalonPublicDto[]> {
  const rows = await prisma.salon.findMany({
    where: { isActive: true },
    orderBy: [
      { order: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });
  return rows.map(toPublicDto);
}

// ============================================================
// getActiveById — retourne un salon actif. 404 si inactif ou inconnu.
// ============================================================
export async function getActiveById(id: string): Promise<SalonPublicDto> {
  const salon = await prisma.salon.findUnique({ where: { id } });
  if (!salon || !salon.isActive) throw new NotFoundError("Salon");
  return toPublicDto(salon);
}

// ============================================================
// SalonMessagePublicDto — DTO des messages avec infos auteur
// ============================================================
export interface SalonMessagePublicDto {
  id: string;
  salonId: string;
  userId: string;
  pseudo: string;
  gender: string;
  age: number | null;
  kind: string;
  content: string;
  meta: Prisma.JsonValue | null;
  createdAt: string;
}

// ============================================================
// Appartenance (lecture) — participant ACTIF de la session demandée, même expirée ;
// sans sessionId : session ouverte la plus récemment rejointe.
// ============================================================
async function findAnyMembership(
  userId: string,
  salonKind: SalonKind,
  sessionId?: string,
): Promise<{ sessionId: string }> {
  if (!sessionId) return requireOpenMembership(userId, salonKind);
  const row = await prisma.salonSessionParticipant.findFirst({
    where: { userId, sessionId, status: "ACTIVE", session: { salonKind } },
    select: { sessionId: true },
  });
  if (!row) throw new ForbiddenError(NOT_IN_SESSION_MESSAGE);
  return row;
}

// ============================================================
// listMessages — derniers N messages, ordre chronologique
// Filtre par sessionId si fourni, sinon tous les messages du salon
// ============================================================
export async function listMessages(
  salonId: string,
  viewerId: string,
  limit = 50,
  sessionId?: string,
): Promise<SalonMessagePublicDto[]> {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, isActive: true, kind: true },
  });
  if (!salon || !salon.isActive) throw new NotFoundError("Salon");

  // Isolation des groupes : seuls les participants ACTIFS d'une session de ce salon la lisent.
  // Sans `sessionId`, on résout la session ouverte de l'utilisateur (jamais « tout le salon »).
  // Un membre garde l'accès à la lecture de sa propre session même après l'échéance
  // (l'écriture, elle, est refusée) : le sort des sessions terminées reste à décider.
  const membership = await findAnyMembership(viewerId, salon.kind, sessionId);

  const blocks = await prisma.block.findMany({
    where: {
      OR: [
        { fromId: viewerId },
        { toId: viewerId },
      ],
    },
    select: { fromId: true, toId: true },
  });
  const blockedUserIds = blocks
    .flatMap((block) => [block.fromId, block.toId])
    .filter((id) => id !== viewerId);

  // Build where clause: filter hidden content, current session and blocked users.
  const where: any = {
    salonId,
    sessionId: membership.sessionId,
    isHidden: false,
    ...(blockedUserIds.length > 0 && { userId: { notIn: blockedUserIds } }),
  };

  // DESC pour récupérer les N derniers, puis on inverse pour l'ordre chrono
  const rows = await prisma.salonMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          profile: { select: { pseudo: true, gender: true, birthDate: true } },
        },
      },
    },
  });

  return rows.reverse().map((row) => ({
    id: row.id,
    salonId: row.salonId,
    userId: row.userId,
    pseudo: row.user.profile?.pseudo ?? "Anonyme",
    gender: row.user.profile?.gender ?? "AUTRE",
    age: computeAge(row.user.profile?.birthDate),
    kind: row.kind,
    content: row.content,
    meta: row.meta,
    createdAt: row.createdAt.toISOString(),
  }));
}

// ============================================================
// postMessage — crée un message et retourne le DTO enrichi
// ============================================================
export async function postMessage(
  salonId: string,
  userId: string,
  content: string,
  sessionId?: string,
): Promise<SalonMessagePublicDto> {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, isActive: true, kind: true },
  });
  if (!salon || !salon.isActive) throw new NotFoundError("Salon");

  // Écriture réservée aux participants ACTIFS d'une session OUVERTE de ce salon.
  // Plus aucun message orphelin (sessionId null) ni écriture dans un autre groupe.
  const membership = await requireOpenMembership(userId, salon.kind, sessionId);

  const [row, profile] = await Promise.all([
    prisma.salonMessage.create({
      data: {
        salonId,
        sessionId: membership.sessionId,
        userId,
        kind: "message",
        content,
      },
    }),
    prisma.profile.findUnique({
      where: { userId },
      select: { pseudo: true, gender: true, birthDate: true },
    }),
  ]);

  return {
    id: row.id,
    salonId: row.salonId,
    userId: row.userId,
    pseudo: profile?.pseudo ?? "Anonyme",
    gender: profile?.gender ?? "AUTRE",
    age: computeAge(profile?.birthDate),
    kind: row.kind,
    content: row.content,
    meta: row.meta,
    createdAt: row.createdAt.toISOString(),
  };
}

// ============================================================
// Admin: Clean test messages (temporary)
// ============================================================
export async function cleanTestMessages(): Promise<{ deletedCount: number }> {
  console.log("[CLEAN] Cleaning test Glouglou/Miam messages from live DB...");

  const miam = await prisma.salonMessage.deleteMany({
    where: {
      content: {
        contains: "Miam",
      },
    },
  });

  const glouglou = await prisma.salonMessage.deleteMany({
    where: {
      content: {
        contains: "Glouglou",
      },
    },
  });

  const totalDeleted = miam.count + glouglou.count;
  console.log(`[CLEAN] Deleted ${miam.count} Miam + ${glouglou.count} Glouglou = ${totalDeleted} messages`);

  return { deletedCount: totalDeleted };
}
