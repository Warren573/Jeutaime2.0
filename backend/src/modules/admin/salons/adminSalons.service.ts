import { Prisma, Salon, SalonKind } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { ConflictError, NotFoundError } from "../../../core/errors";
import { assertBackgroundCoherence } from "../../../policies/salonBackground";
import { writeAudit } from "../admin.audit";
import type {
  CreateSalonDto,
  UpdateSalonDto,
} from "./adminSalons.schemas";

// ============================================================
// Types de retour
// ============================================================

export interface SalonAdminDto {
  id: string;
  kind: SalonKind;
  name: string;
  description: string | null;
  magicAction: string | null;
  gradient: Prisma.JsonValue | null;

  backgroundImage: string | null;
  backgroundType: string;
  backgroundConfig: Prisma.JsonValue | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  textColor: string | null;

  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

function toDto(s: Salon): SalonAdminDto {
  return {
    id: s.id,
    kind: s.kind,
    name: s.name,
    description: s.description,
    magicAction: s.magicAction,
    gradient: s.gradient,
    backgroundImage: s.backgroundImage,
    backgroundType: s.backgroundType,
    backgroundConfig: s.backgroundConfig,
    primaryColor: s.primaryColor,
    secondaryColor: s.secondaryColor,
    textColor: s.textColor,
    isActive: s.isActive,
    order: s.order,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

// ============================================================
// listAll — admin : retourne TOUS les salons (actifs + inactifs)
// ============================================================
export async function listAll(): Promise<SalonAdminDto[]> {
  const rows = await prisma.salon.findMany({
    orderBy: [
      { order: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });
  return rows.map(toDto);
}

// ============================================================
// getById
// ============================================================
export async function getById(id: string): Promise<SalonAdminDto> {
  const salon = await prisma.salon.findUnique({ where: { id } });
  if (!salon) throw new NotFoundError("Salon");
  return toDto(salon);
}

// ============================================================
// createSalon — un kind = un salon unique (contrainte @unique)
// ============================================================
export async function createSalon(
  actorId: string,
  dto: CreateSalonDto,
): Promise<SalonAdminDto> {
  // Vérifier la cohérence visuelle AVANT d'insérer
  assertBackgroundCoherence(
    dto.backgroundType,
    dto.backgroundConfig ?? null,
    dto.backgroundImage ?? null,
  );

  // Conflit kind unique
  const existing = await prisma.salon.findUnique({
    where: { kind: dto.kind },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError(
      `Un salon existe déjà pour le kind ${dto.kind} (id=${existing.id})`,
    );
  }

  const created = await prisma.salon.create({
    data: {
      kind: dto.kind,
      name: dto.name,
      description: dto.description ?? null,
      magicAction: dto.magicAction ?? null,
      backgroundImage: dto.backgroundImage ?? null,
      backgroundType: dto.backgroundType,
      backgroundConfig:
        dto.backgroundConfig !== undefined
          ? (dto.backgroundConfig as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      primaryColor: dto.primaryColor ?? null,
      secondaryColor: dto.secondaryColor ?? null,
      textColor: dto.textColor ?? null,
      isActive: dto.isActive,
      order: dto.order,
    },
  });

  await writeAudit({
    actorId,
    action: "admin.salon.create",
    target: created.id,
    meta: { kind: created.kind, name: created.name } as Prisma.InputJsonValue,
  });

  return toDto(created);
}

// ============================================================
// updateSalon
// ============================================================
export async function updateSalon(
  actorId: string,
  id: string,
  dto: UpdateSalonDto,
): Promise<SalonAdminDto> {
  const current = await prisma.salon.findUnique({ where: { id } });
  if (!current) throw new NotFoundError("Salon");

  // Résolution de l'état visuel post-update pour validation de cohérence
  const nextType = dto.backgroundType ?? current.backgroundType;
  const nextImage =
    dto.backgroundImage !== undefined
      ? dto.backgroundImage
      : current.backgroundImage;
  const nextConfig =
    dto.backgroundConfig !== undefined
      ? dto.backgroundConfig
      : current.backgroundConfig;

  assertBackgroundCoherence(nextType, nextConfig, nextImage);

  // On construit le data object en omettant les undefined (partial update)
  const data: Prisma.SalonUpdateInput = {};
  if (dto.name !== undefined) data.name = dto.name;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.magicAction !== undefined) data.magicAction = dto.magicAction;
  if (dto.backgroundImage !== undefined) data.backgroundImage = dto.backgroundImage;
  if (dto.backgroundType !== undefined) data.backgroundType = dto.backgroundType;
  if (dto.backgroundConfig !== undefined) {
    data.backgroundConfig =
      dto.backgroundConfig === null
        ? Prisma.JsonNull
        : (dto.backgroundConfig as Prisma.InputJsonValue);
  }
  if (dto.primaryColor !== undefined) data.primaryColor = dto.primaryColor;
  if (dto.secondaryColor !== undefined) data.secondaryColor = dto.secondaryColor;
  if (dto.textColor !== undefined) data.textColor = dto.textColor;
  if (dto.order !== undefined) data.order = dto.order;

  const updated = await prisma.salon.update({ where: { id }, data });

  await writeAudit({
    actorId,
    action: "admin.salon.update",
    target: id,
    meta: {
      fields: Object.keys(dto),
    } as Prisma.InputJsonValue,
  });

  return toDto(updated);
}

// ============================================================
// setActive — activation/désactivation sans suppression
// ============================================================
export async function setActive(
  actorId: string,
  id: string,
  isActive: boolean,
): Promise<SalonAdminDto> {
  const current = await prisma.salon.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
  if (!current) throw new NotFoundError("Salon");

  // Idempotent : si déjà dans l'état voulu, on ne log rien
  if (current.isActive === isActive) {
    const fresh = await prisma.salon.findUniqueOrThrow({ where: { id } });
    return toDto(fresh);
  }

  const updated = await prisma.salon.update({
    where: { id },
    data: { isActive },
  });

  await writeAudit({
    actorId,
    action: isActive ? "admin.salon.activate" : "admin.salon.deactivate",
    target: id,
    meta: { previousState: current.isActive } as Prisma.InputJsonValue,
  });

  return toDto(updated);
}
