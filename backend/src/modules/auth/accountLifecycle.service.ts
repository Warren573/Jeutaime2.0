import { prisma } from "../../config/prisma";
import { comparePassword } from "../../core/utils/hash";
import { NotFoundError, UnauthorizedError } from "../../core/errors";

interface DeactivationRow {
  userId: string;
  previousShowInDiscovery: boolean;
  deactivatedAt: Date;
}

export async function isAccountDeactivated(userId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ userId: string }>>`
    SELECT "userId"
    FROM "AccountDeactivation"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function deactivateAccount(userId: string, currentPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, settings: { select: { showInDiscovery: true } } },
  });
  if (!user) throw new NotFoundError("Utilisateur");

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Mot de passe incorrect");

  const previousShowInDiscovery = user.settings?.showInDiscovery ?? true;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "AccountDeactivation" ("userId", "previousShowInDiscovery", "deactivatedAt")
      VALUES (${userId}, ${previousShowInDiscovery}, ${now})
      ON CONFLICT ("userId") DO UPDATE SET
        "previousShowInDiscovery" = EXCLUDED."previousShowInDiscovery",
        "deactivatedAt" = EXCLUDED."deactivatedAt"
    `;

    await tx.userSettings.upsert({
      where: { userId },
      update: { showInDiscovery: false },
      create: { userId, showInDiscovery: false },
    });

    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  });
}

export async function reactivateAccountByEmail(email: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<DeactivationRow[]>`
    SELECT d."userId", d."previousShowInDiscovery", d."deactivatedAt"
    FROM "AccountDeactivation" d
    INNER JOIN "User" u ON u."id" = d."userId"
    WHERE LOWER(u."email") = LOWER(${email})
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return false;

  await prisma.$transaction(async (tx) => {
    await tx.userSettings.upsert({
      where: { userId: row.userId },
      update: { showInDiscovery: row.previousShowInDiscovery },
      create: { userId: row.userId, showInDiscovery: row.previousShowInDiscovery },
    });

    await tx.$executeRaw`
      DELETE FROM "AccountDeactivation"
      WHERE "userId" = ${row.userId}
    `;
  });

  return true;
}
