import { Prisma, Salon, SalonKind } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../core/errors";

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
// listMessages — derniers N messages, ordre chronologique
// ============================================================
export async function listMessages(
  salonId: string,
  limit = 50,
): Promise<SalonMessagePublicDto[]> {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, isActive: true },
  });
  if (!salon || !salon.isActive) throw new NotFoundError("Salon");

  // DESC pour récupérer les N derniers, puis on inverse pour l'ordre chrono
  const rows = await prisma.salonMessage.findMany({
    where: { salonId },
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
): Promise<SalonMessagePublicDto> {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, isActive: true },
  });
  if (!salon || !salon.isActive) throw new NotFoundError("Salon");

  const [row, profile] = await Promise.all([
    prisma.salonMessage.create({
      data: { salonId, userId, kind: "message", content },
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
