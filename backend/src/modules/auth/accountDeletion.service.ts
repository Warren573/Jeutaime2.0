import { prisma } from "../../config/prisma";
import { comparePassword } from "../../core/utils/hash";
import { NotFoundError, UnauthorizedError } from "../../core/errors";
import { deletePhotoFiles } from "../photos/photos.storage";

export async function deleteAccountPermanently(userId: string, currentPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      passwordHash: true,
      photos: {
        select: {
          originalPath: true,
          blurredPath: true,
          blurMediumPath: true,
        },
      },
    },
  });
  if (!user) throw new NotFoundError("Utilisateur");

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Mot de passe incorrect");

  const photos = user.photos;

  await prisma.$transaction(async (tx) => {
    // Purger les références historiques qui stockent un userId sans FK.
    await tx.offeringSent.updateMany({
      where: { lastConsumedBy: userId },
      data: { lastConsumedBy: null },
    });
    await tx.magieCast.updateMany({
      where: { brokenBy: userId },
      data: { brokenBy: null },
    });
    await tx.salonSession.updateMany({
      where: { ownerId: userId },
      data: { ownerId: null },
    });
    await tx.report.updateMany({
      where: { resolvedBy: userId },
      data: { resolvedBy: null },
    });

    // candidateAId/candidateBId/chosenId ne sont pas des FK : supprimer les
    // tickets historiques qui référencent directement le compte supprimé.
    await tx.weeklyProfileDuel.deleteMany({
      where: {
        OR: [
          { candidateAId: userId },
          { candidateBId: userId },
          { chosenId: userId },
        ],
      },
    });

    // Les métadonnées de notification peuvent contenir l'identifiant de l'autre
    // utilisateur. On supprime ces notifications secondaires côté destinataires.
    await tx.$executeRaw`
      DELETE FROM "Notification"
      WHERE "meta"->>'fromUserId' = ${userId}
         OR "meta"->>'otherUserId' = ${userId}
    `;

    // Les logs qui identifient directement ce compte sont retirés. Les autres
    // AuditLog restent intacts et leur FK actor est de toute façon SetNull.
    await tx.auditLog.deleteMany({
      where: { OR: [{ actorId: userId }, { target: userId }] },
    });

    // Relations vers User qui ne sont PAS configurées en onDelete: Cascade.
    await tx.letter.deleteMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    });

    await tx.match.deleteMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
    });

    await tx.offeringSent.deleteMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    });

    await tx.magieCast.deleteMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    });

    await tx.report.deleteMany({
      where: { OR: [{ reporterId: userId }, { targetId: userId }] },
    });

    // Tout le reste lié au User est Cascade ou SetNull dans le schéma courant :
    // profil/questions, wallet/transactions, settings, photos, pets, salons,
    // blocs, réactions, notifications, push tokens, bouteilles, refuge, etc.
    await tx.user.delete({ where: { id: userId } });
  });

  // Les lignes Photo sont déjà supprimées par cascade. On nettoie ensuite les
  // fichiers physiques en best-effort ; deletePhotoFiles est idempotent.
  await Promise.all(
    photos.map((photo) =>
      deletePhotoFiles(photo.originalPath, photo.blurredPath, photo.blurMediumPath),
    ),
  );
}
