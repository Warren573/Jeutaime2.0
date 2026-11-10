import { prisma } from "../../config/prisma";
import { comparePassword, hashPassword } from "../../core/utils/hash";
import { NotFoundError, UnauthorizedError } from "../../core/errors";
import { notifySecurity, requestEmailChange } from "./security/accountSecurity.core";

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw new NotFoundError("Utilisateur");

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Mot de passe actuel incorrect");

  const samePassword = await comparePassword(newPassword, user.passwordHash);
  if (samePassword) throw new UnauthorizedError("Le nouveau mot de passe doit être différent de l’ancien");

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  await notifySecurity(userId, "password_changed");
}


/**
 * Changement d'adresse. Retourne la nouvelle adresse si elle a été appliquée
 * immédiatement, ou null si une confirmation par e-mail est attendue.
 */
export async function changeEmail(
  userId: string,
  currentPassword: string,
  newEmail: string,
) {
  const outcome = await requestEmailChange(userId, currentPassword, newEmail);
  return outcome.status === "changed" ? outcome.email : null;
}
