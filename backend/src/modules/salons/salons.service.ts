import { Prisma, Salon, SalonKind } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../core/errors";

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
