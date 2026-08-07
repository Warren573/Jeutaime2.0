import { prisma } from "../../config/prisma";
import { hashPassword, comparePassword } from "../../core/utils/hash";
import { UnauthorizedError, NotFoundError } from "../../core/errors";
import { ChangePasswordDto } from "./users.schemas";

// -----------------------------------------------------------------------
// Changer le mot de passe — route historique conservée pour compatibilité.
// Le nouvel écran utilise /api/auth/change-password.
// -----------------------------------------------------------------------
export async function changePassword(userId: string, dto: ChangePasswordDto) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw new NotFoundError("Utilisateur");

  const valid = await comparePassword(dto.currentPassword, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Mot de passe actuel incorrect");

  const newHash = await hashPassword(dto.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

  // Révoquer tous les refresh tokens (force re-login sur tous les appareils)
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
