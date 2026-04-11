import { Prisma, Role, User } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { NotFoundError } from "../../../core/errors";
import { assertCanBanUser } from "../../../policies/moderation";
import { writeAudit } from "../admin.audit";

// ============================================================
// DTO de retour minimal
// ============================================================
export interface AdminUserDto {
  id: string;
  email: string;
  role: Role;
  isBanned: boolean;
  banReason: string | null;
}

function toDto(u: Pick<User, "id" | "email" | "role" | "isBanned" | "banReason">): AdminUserDto {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    isBanned: u.isBanned,
    banReason: u.banReason,
  };
}

const adminUserSelect = {
  id: true,
  email: true,
  role: true,
  isBanned: true,
  banReason: true,
} as const;

// ============================================================
// banUser
// ============================================================
export async function banUser(
  actor: { id: string; role: Role },
  targetId: string,
  reason: string,
): Promise<AdminUserDto> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: adminUserSelect,
  });
  if (!target) throw new NotFoundError("Utilisateur");

  // Permissions métier (matrice ADMIN/MOD/USER)
  assertCanBanUser(
    { id: actor.id, role: actor.role },
    { id: target.id, role: target.role },
  );

  // Idempotent : si déjà banni avec la même raison, no-op
  if (target.isBanned && target.banReason === reason) {
    return toDto(target);
  }

  // Ban + révocation de tous les refresh tokens (force logout immédiat)
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: targetId },
      data: { isBanned: true, banReason: reason },
      select: adminUserSelect,
    });
    await tx.refreshToken.updateMany({
      where: { userId: targetId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return u;
  });

  await writeAudit({
    actorId: actor.id,
    action: "admin.user.ban",
    target: targetId,
    meta: {
      reason,
      previousBanned: target.isBanned,
    } as Prisma.InputJsonValue,
  });

  return toDto(updated);
}

// ============================================================
// unbanUser — idempotent
// ============================================================
export async function unbanUser(
  actor: { id: string; role: Role },
  targetId: string,
): Promise<AdminUserDto> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: adminUserSelect,
  });
  if (!target) throw new NotFoundError("Utilisateur");

  // Pas de no-op silencieux côté DB, mais pas d'audit si déjà OK
  if (!target.isBanned) {
    return toDto(target);
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { isBanned: false, banReason: null },
    select: adminUserSelect,
  });

  await writeAudit({
    actorId: actor.id,
    action: "admin.user.unban",
    target: targetId,
    meta: {
      previousReason: target.banReason ?? null,
    } as Prisma.InputJsonValue,
  });

  return toDto(updated);
}

// ============================================================
// warnUser — pas d'effet DB hors audit (Phase 6 = pas de notif)
// ============================================================
export async function warnUser(
  actor: { id: string; role: Role },
  targetId: string,
  message: string,
): Promise<AdminUserDto> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: adminUserSelect,
  });
  if (!target) throw new NotFoundError("Utilisateur");

  // Cohérent avec ban : on n'avertit pas un ADMIN
  if (target.role === Role.ADMIN) {
    return toDto(target);
  }

  await writeAudit({
    actorId: actor.id,
    action: "admin.user.warn",
    target: targetId,
    meta: { message } as Prisma.InputJsonValue,
  });

  return toDto(target);
}
