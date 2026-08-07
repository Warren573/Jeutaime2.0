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
    // Relations vers User qui ne sont PAS configurées en onDelete: Cascade.
    // On les supprime explicitement avant le User pour éviter tout blocage FK.
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
  // fichiers physiques en best-effort ; deletePhotoFiles est idempotent et logue
  // les erreurs non-ENOENT sans faire échouer une suppression DB déjà validée.
  await Promise.all(
    photos.map((photo) =>
      deletePhotoFiles(photo.originalPath, photo.blurredPath, photo.blurMediumPath),
    ),
  );
}
