import { CoinTxnType, PremiumTier, Prisma, Role, User } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../../core/errors";
import { assertCanBanUser } from "../../../policies/moderation";
import { writeAudit } from "../admin.audit";
import { creditWallet, debitWallet } from "../../wallet/wallet.service";
import { sendAdminMessage } from "../engagement/adminEngagement.service";

// ============================================================
// DTO de retour minimal
// ============================================================
export interface AdminUserDto {
  id: string;
  email: string;
  role: Role;
  isBanned: boolean;
  banReason: string | null;
  banUntil: Date | null;
}

function toDto(u: Pick<User, "id" | "email" | "role" | "isBanned" | "banReason" | "banUntil">): AdminUserDto {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    isBanned: u.isBanned,
    banReason: u.banReason,
    banUntil: u.banUntil,
  };
}

const adminUserSelect = {
  id: true,
  email: true,
  role: true,
  isBanned: true,
  banReason: true,
  banUntil: true,
} as const;

// ============================================================
// banUser
// ============================================================
export async function banUser(
  actor: { id: string; role: Role },
  targetId: string,
  reason: string,
  durationDays?: number,
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

  const banUntil = durationDays
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
    : null;

  // Idempotent : si déjà suspendu avec la même raison et la même échéance de principe, no-op
  if (target.isBanned && target.banReason === reason) {
    const bothPermanent = !target.banUntil && !banUntil;
    const bothTemporary = !!target.banUntil && !!banUntil;
    if (bothPermanent || bothTemporary) return toDto(target);
  }

  // Suspension + révocation de tous les refresh tokens (force logout immédiat)
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: targetId },
      data: { isBanned: true, banReason: reason, banUntil },
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
      durationDays: durationDays ?? null,
      banUntil: banUntil?.toISOString() ?? null,
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

  assertCanBanUser(
    { id: actor.id, role: actor.role },
    { id: target.id, role: target.role },
  );

  // Pas de no-op silencieux côté DB, mais pas d'audit si déjà OK
  if (!target.isBanned) {
    return toDto(target);
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { isBanned: false, banReason: null, banUntil: null },
    select: adminUserSelect,
  });

  await writeAudit({
    actorId: actor.id,
    action: "admin.user.unban",
    target: targetId,
    meta: {
      previousReason: target.banReason ?? null,
      previousBanUntil: target.banUntil?.toISOString() ?? null,
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

  if (target.role === Role.OWNER) {
    throw new ForbiddenError("Le propriétaire ne peut pas recevoir d’avertissement administratif");
  }
  if (target.role === Role.ADMIN && actor.role !== Role.OWNER) {
    throw new ForbiddenError("Seul le propriétaire peut avertir un administrateur");
  }
  if (
    target.role === Role.MODERATOR &&
    actor.role !== Role.ADMIN &&
    actor.role !== Role.OWNER
  ) {
    throw new ForbiddenError("Seul un administrateur ou le propriétaire peut avertir un modérateur");
  }

  await sendAdminMessage(
    actor.id,
    targetId,
    "Avertissement de l’administration",
    message,
  );

  await writeAudit({
    actorId: actor.id,
    action: "admin.user.warn",
    target: targetId,
    meta: { message, delivered: true } as Prisma.InputJsonValue,
  });

  return toDto(target);
}


export async function listUsers(query?: string): Promise<AdminUserDto[]> {
  const q = query?.trim();
  const rows = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { profile: { is: { pseudo: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: 100,
    select: {
      ...adminUserSelect,
      profile: { select: { pseudo: true } },
    },
  });

  return rows.map((u) => ({
    ...toDto(u),
    pseudo: u.profile?.pseudo ?? null,
  })) as Array<AdminUserDto & { pseudo: string | null }>;
}


export async function getUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      isBanned: true,
      banReason: true,
      banUntil: true,
      premiumTier: true,
      premiumUntil: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      profile: {
        select: {
          pseudo: true,
          city: true,
          gender: true,
          birthDate: true,
        },
      },
      settings: {
        select: {
          showInDiscovery: true,
          vacationMode: true,
          notifPush: true,
          notifEmail: true,
        },
      },
      wallet: {
        select: {
          coins: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!user) throw new NotFoundError("Utilisateur");

  const [
    matches,
    lettersSent,
    lettersReceived,
    reportsReceived,
    reportsMade,
    salonParticipations,
    offeringsSent,
    offeringsReceived,
    bottlesSent,
    recentTransactions,
    adminHistory,
  ] = await Promise.all([
    prisma.match.count({
      where: { OR: [{ userAId: id }, { userBId: id }] },
    }),
    prisma.letter.count({ where: { fromUserId: id } }),
    prisma.letter.count({ where: { toUserId: id } }),
    prisma.report.count({ where: { targetId: id } }),
    prisma.report.count({ where: { reporterId: id } }),
    prisma.salonSessionParticipant.count({ where: { userId: id } }),
    prisma.offeringSent.count({ where: { fromUserId: id } }),
    prisma.offeringSent.count({ where: { toUserId: id } }),
    prisma.messageInABottle.count({ where: { senderId: id } }),
    prisma.coinTransaction.findMany({
      where: { walletId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        amount: true,
        balance: true,
        meta: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { target: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        actorId: true,
        action: true,
        target: true,
        meta: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    ...user,
    stats: {
      matches,
      lettersSent,
      lettersReceived,
      reportsReceived,
      reportsMade,
      salonParticipations,
      offeringsSent,
      offeringsReceived,
      bottlesSent,
    },
    recentTransactions,
    adminHistory,
  };
}

export async function adjustCoins(
  actor: { id: string; role: Role },
  targetId: string,
  amount: number,
  reason: string,
) {
  if (actor.role !== Role.ADMIN && actor.role !== Role.OWNER) throw new ForbiddenError();
  if (!Number.isInteger(amount) || amount === 0) {
    throw new BadRequestError("Le montant doit être un entier non nul");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, email: true },
  });
  if (!target) throw new NotFoundError("Utilisateur");
  if (target.role === Role.OWNER && actor.role !== Role.OWNER) {
    throw new ForbiddenError("Le compte propriétaire est protégé");
  }

  const meta = {
    reason,
    adjustedBy: actor.id,
  } as Prisma.InputJsonValue;

  const result = amount > 0
    ? await creditWallet({
        userId: targetId,
        amount,
        type: CoinTxnType.ADMIN_ADJUST,
        meta,
      })
    : await debitWallet({
        userId: targetId,
        amount: Math.abs(amount),
        type: CoinTxnType.ADMIN_ADJUST,
        meta,
      });

  await writeAudit({
    actorId: actor.id,
    action: "admin.user.coins.adjust",
    target: targetId,
    meta: {
      amount,
      reason,
      resultingBalance: result.wallet.coins,
    } as Prisma.InputJsonValue,
  });

  return result;
}

export async function updateRole(
  actor: { id: string; role: Role },
  targetId: string,
  nextRole: "USER" | "MODERATOR" | "ADMIN",
) {
  if (actor.role !== Role.ADMIN && actor.role !== Role.OWNER) {
    throw new ForbiddenError();
  }
  if (actor.id === targetId) {
    throw new BadRequestError("Tu ne peux pas modifier ton propre rôle");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: adminUserSelect,
  });
  if (!target) throw new NotFoundError("Utilisateur");

  if (target.role === Role.OWNER) {
    throw new ForbiddenError("Le rôle du propriétaire ne peut jamais être modifié depuis l’administration");
  }

  if (actor.role === Role.ADMIN) {
    if (target.role === Role.ADMIN) {
      throw new ForbiddenError("Seul le propriétaire peut gérer les administrateurs");
    }
    if (nextRole === "ADMIN") {
      throw new ForbiddenError("Seul le propriétaire peut nommer un administrateur");
    }
    if (target.role !== Role.USER && target.role !== Role.MODERATOR) {
      throw new ForbiddenError();
    }
    if (nextRole !== "USER" && nextRole !== "MODERATOR") {
      throw new ForbiddenError();
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { role: nextRole as Role },
    select: adminUserSelect,
  });

  await writeAudit({
    actorId: actor.id,
    action: "admin.user.role.update",
    target: targetId,
    meta: {
      from: target.role,
      to: nextRole,
    } as Prisma.InputJsonValue,
  });

  return toDto(updated);
}

export async function grantPremium(
  actor: { id: string; role: Role },
  targetId: string,
  days: number,
  reason: string,
) {
  if (actor.role !== Role.ADMIN && actor.role !== Role.OWNER) throw new ForbiddenError();
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new BadRequestError("Durée Premium invalide");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, premiumTier: true, premiumUntil: true, role: true },
  });
  if (!target) throw new NotFoundError("Utilisateur");
  if (target.role === Role.OWNER && actor.role !== Role.OWNER) {
    throw new ForbiddenError("Le compte propriétaire est protégé");
  }

  const now = new Date();
  const base = target.premiumUntil && target.premiumUntil > now ? target.premiumUntil : now;
  const premiumUntil = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      premiumTier: PremiumTier.PREMIUM,
      premiumUntil,
    },
    select: {
      id: true,
      premiumTier: true,
      premiumUntil: true,
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "admin.user.premium.grant",
    target: targetId,
    meta: {
      days,
      reason,
      previousTier: target.premiumTier,
      previousUntil: target.premiumUntil?.toISOString() ?? null,
      premiumUntil: premiumUntil.toISOString(),
    } as Prisma.InputJsonValue,
  });

  return updated;
}

export async function resetUserSalons(
  actor: { id: string; role: Role },
  targetId: string,
  reason: string,
) {
  if (actor.role !== Role.OWNER) throw new ForbiddenError();

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true },
  });
  if (!target) throw new NotFoundError("Utilisateur");
  if (target.role === Role.OWNER && actor.role !== Role.OWNER) {
    throw new ForbiddenError("Le compte propriétaire est protégé");
  }

  const result = await prisma.salonSessionParticipant.updateMany({
    where: {
      userId: targetId,
      status: "ACTIVE",
    },
    data: {
      status: "LEFT",
      leftAt: new Date(),
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "admin.user.salons.reset",
    target: targetId,
    meta: {
      reason,
      sessionsLeft: result.count,
    } as Prisma.InputJsonValue,
  });

  return { resetCount: result.count };
}

export async function resetUserRefuge(
  actor: { id: string; role: Role },
  targetId: string,
  reason: string,
) {
  if (actor.role !== Role.OWNER) throw new ForbiddenError();

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true },
  });
  if (!target) throw new NotFoundError("Utilisateur");
  if (target.role === Role.OWNER && actor.role !== Role.OWNER) {
    throw new ForbiddenError("Le compte propriétaire est protégé");
  }

  const result = await prisma.refugeSession.updateMany({
    where: {
      OR: [
        { adopteId: targetId },
        { adoptantId: targetId },
      ],
      status: {
        in: ["CREATION", "WAITING_FOR_ADOPTANT", "ACTIVE", "AWAITING_REVEAL_CONSENT"],
      },
    },
    data: {
      status: "ABANDONED",
    },
  });

  await writeAudit({
    actorId: actor.id,
    action: "admin.user.refuge.reset",
    target: targetId,
    meta: {
      reason,
      sessionsAbandoned: result.count,
    } as Prisma.InputJsonValue,
  });

  return { resetCount: result.count };
}


export async function resetUserBottles(
  actor: { id: string; role: Role },
  targetId: string,
  reason: string,
) {
  if (actor.role !== Role.OWNER) throw new ForbiddenError();

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (!target) throw new NotFoundError("Utilisateur");

  const active = await prisma.messageInABottle.findMany({
    where: {
      OR: [{ senderId: targetId }, { acceptedById: targetId }],
      status: { in: ["FLOATING", "ACCEPTED"] },
    },
    select: { id: true },
  });

  const ids = active.map((b) => b.id);
  if (ids.length > 0) {
    await prisma.$transaction([
      prisma.messageInABottle.updateMany({
        where: { id: { in: ids } },
        data: { status: "BROKEN" },
      }),
      prisma.bottleReceipt.updateMany({
        where: { bottleId: { in: ids }, status: "PENDING" },
        data: { status: "TAKEN", actionAt: new Date() },
      }),
      prisma.bottleRevealRequest.updateMany({
        where: { bottleId: { in: ids }, status: "PENDING" },
        data: { status: "REFUSED", respondedAt: new Date() },
      }),
    ]);
  }

  await writeAudit({
    actorId: actor.id,
    action: "admin.user.bottles.reset",
    target: targetId,
    meta: { reason, bottlesClosed: ids.length } as Prisma.InputJsonValue,
  });

  return { resetCount: ids.length };
}

export async function repairUserLetters(
  actor: { id: string; role: Role },
  targetId: string,
  reason: string,
) {
  if (actor.role !== Role.OWNER) throw new ForbiddenError();

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (!target) throw new NotFoundError("Utilisateur");

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: targetId }, { userBId: targetId }] },
    select: {
      id: true,
      userAId: true,
      userBId: true,
      letters: {
        orderBy: { sentAt: "asc" },
        select: {
          fromUserId: true,
          isGhostRelance: true,
          sentAt: true,
        },
      },
    },
  });

  let repaired = 0;
  for (const match of matches) {
    const letterCountA = match.letters.filter((l) => l.fromUserId === match.userAId).length;
    const letterCountB = match.letters.filter((l) => l.fromUserId === match.userBId).length;
    const last = match.letters.length > 0 ? match.letters[match.letters.length - 1] : null;
    const ghost = [...match.letters].reverse().find((l) => l.isGhostRelance) ?? null;

    await prisma.match.update({
      where: { id: match.id },
      data: {
        letterCountA,
        letterCountB,
        lastLetterBy: last?.fromUserId ?? null,
        lastLetterAt: last?.sentAt ?? null,
        ghostRelanceUsedBy: ghost?.fromUserId ?? null,
      },
    });
    repaired += 1;
  }

  await writeAudit({
    actorId: actor.id,
    action: "admin.user.letters.repair",
    target: targetId,
    meta: { reason, matchesRecalculated: repaired } as Prisma.InputJsonValue,
  });

  return { resetCount: repaired };
}
