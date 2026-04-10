import { prisma } from "../../config/prisma";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from "../../core/errors";
import { MAX_PHOTOS_PER_USER } from "../../config/constants";
import {
  processAndWrite,
  deletePhotoFiles,
  resolveStoredPath,
} from "./photos.storage";
import { buildPhotoUrl, PhotoVariant } from "./photos.urls";
import { resolvePhotoAccess, pickNextPrimary } from "./photos.access";
import type { UpdatePhotoDto } from "./photos.schemas";

// ============================================================
// Types de retour
// ============================================================
export interface PhotoDto {
  id: string;
  userId: string;
  position: number;
  isPrimary: boolean;
  createdAt: Date;
  url: string;
  variant: PhotoVariant;
}

function toDto(
  photo: {
    id: string;
    userId: string;
    position: number;
    isPrimary: boolean;
    createdAt: Date;
  },
  variant: PhotoVariant,
): PhotoDto {
  return {
    id: photo.id,
    userId: photo.userId,
    position: photo.position,
    isPrimary: photo.isPrimary,
    createdAt: photo.createdAt,
    url: buildPhotoUrl(photo.id, variant),
    variant,
  };
}

// ============================================================
// Helpers DB (les helpers purs vivent dans photos.access.ts)
// ============================================================
async function hasBlockBetween(a: string, b: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: { OR: [{ fromId: a, toId: b }, { fromId: b, toId: a }] },
    select: { id: true },
  });
  return Boolean(block);
}

async function findMatchBetween(userA: string, userB: string) {
  const [a, b] = [userA, userB].sort();
  return prisma.match.findUnique({
    where: { userAId_userBId: { userAId: a as string, userBId: b as string } },
    select: {
      userAId: true,
      userBId: true,
      letterCountA: true,
      letterCountB: true,
      status: true,
    },
  });
}

// ============================================================
// listMyPhotos — retourne toutes mes photos (originales)
// ============================================================
export async function listMyPhotos(userId: string): Promise<PhotoDto[]> {
  const photos = await prisma.photo.findMany({
    where: { userId },
    orderBy: [
      { isPrimary: "desc" },
      { position: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: {
      id: true,
      userId: true,
      position: true,
      isPrimary: true,
      createdAt: true,
    },
  });
  // Propriétaire → toujours "original"
  return photos.map((p) => toDto(p, "original"));
}

// ============================================================
// listPhotosForViewer — retourne les photos d'un autre user
// selon la policy photoUnlock (blurred par défaut, original si unlock)
// ============================================================
export async function listPhotosForViewer(params: {
  viewerId: string;
  targetUserId: string;
  viewerIsPremium: boolean;
}): Promise<{
  photos: PhotoDto[];
  unlocked: boolean;
}> {
  const { viewerId, targetUserId, viewerIsPremium } = params;

  if (viewerId === targetUserId) {
    const photos = await listMyPhotos(viewerId);
    return { photos, unlocked: true };
  }

  // Le user cible doit exister
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isBanned: true },
  });
  if (!target || target.isBanned) throw new NotFoundError("Utilisateur");

  const hasBlock = await hasBlockBetween(viewerId, targetUserId);

  // Délégation complète à resolvePhotoAccess : on teste "original" pour
  // savoir si unlock, puis on teste "blurred" pour savoir si on peut au
  // moins voir les versions floutées.
  const match = await findMatchBetween(viewerId, targetUserId);
  const originalAccess = resolvePhotoAccess({
    viewerId,
    ownerId: targetUserId,
    variant: "original",
    viewerIsPremium,
    hasBlock,
    match,
  });
  const blurredAccess = resolvePhotoAccess({
    viewerId,
    ownerId: targetUserId,
    variant: "blurred",
    viewerIsPremium,
    hasBlock,
    match,
  });

  if (!blurredAccess.allowed) {
    // Bloqué : pas d'accès du tout
    throw new ForbiddenError("Accès interdit");
  }

  const unlocked = originalAccess.allowed;
  const variant: PhotoVariant = unlocked ? "original" : "blurred";

  const photos = await prisma.photo.findMany({
    where: { userId: targetUserId },
    orderBy: [
      { isPrimary: "desc" },
      { position: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: {
      id: true,
      userId: true,
      position: true,
      isPrimary: true,
      createdAt: true,
    },
  });

  return {
    photos: photos.map((p) => toDto(p, variant)),
    unlocked,
  };
}

// ============================================================
// uploadPhoto — process buffer, write files, persist Photo row
//
// Flow 2-temps pour garantir cohérence DB/FS :
//  1. create row avec paths placeholder (on a besoin du cuid pour nommer)
//  2. sharp écrit les fichiers en utilisant l'id généré par Prisma
//  3. update row avec les vrais paths
//  4. rollback (delete row) si sharp échoue
// ============================================================
export async function uploadPhoto(params: {
  userId: string;
  buffer: Buffer;
  mimetype: string;
}): Promise<PhotoDto> {
  const { userId, buffer } = params;

  if (!buffer || buffer.length === 0) {
    throw new BadRequestError("Fichier vide");
  }

  // Vérifier la limite par user
  const current = await prisma.photo.count({ where: { userId } });
  if (current >= MAX_PHOTOS_PER_USER) {
    throw new UnprocessableError(
      `Limite atteinte : ${MAX_PHOTOS_PER_USER} photos maximum par profil`,
    );
  }

  // Étape 1 : créer la row avec paths placeholder pour obtenir le cuid
  const created = await prisma.photo.create({
    data: {
      userId,
      originalPath: "__pending__",
      blurredPath: "__pending__",
      position: current, // append à la fin
      isPrimary: current === 0, // 1ère photo = primary
    },
    select: {
      id: true,
      userId: true,
      position: true,
      isPrimary: true,
      createdAt: true,
    },
  });

  try {
    // Étape 2 : sharp écrit original + blurred sur disque
    const { originalPath, blurredPath } = await processAndWrite({
      userId,
      photoId: created.id,
      inputBuffer: buffer,
    });

    // Étape 3 : update row avec les vrais paths
    const updated = await prisma.photo.update({
      where: { id: created.id },
      data: { originalPath, blurredPath },
      select: {
        id: true,
        userId: true,
        position: true,
        isPrimary: true,
        createdAt: true,
      },
    });
    return toDto(updated, "original");
  } catch (e) {
    // Étape 4 : rollback si sharp ou update échoue
    await prisma.photo
      .delete({ where: { id: created.id } })
      .catch(() => undefined);
    throw e;
  }
}

// ============================================================
// updatePhoto — position / isPrimary
// ============================================================
export async function updatePhoto(params: {
  userId: string;
  photoId: string;
  dto: UpdatePhotoDto;
}): Promise<PhotoDto> {
  const { userId, photoId, dto } = params;

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, userId: true },
  });
  if (!photo) throw new NotFoundError("Photo");
  if (photo.userId !== userId) {
    throw new ForbiddenError("Cette photo ne t'appartient pas");
  }

  // Si isPrimary = true, on doit démote l'ancienne primary en transaction
  const updated = await prisma.$transaction(async (tx) => {
    if (dto.isPrimary === true) {
      await tx.photo.updateMany({
        where: { userId, isPrimary: true, NOT: { id: photoId } },
        data: { isPrimary: false },
      });
    }
    return tx.photo.update({
      where: { id: photoId },
      data: {
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
      },
      select: {
        id: true,
        userId: true,
        position: true,
        isPrimary: true,
        createdAt: true,
      },
    });
  });

  return toDto(updated, "original");
}

// ============================================================
// deletePhoto — DB + fichiers disque
// ============================================================
export async function deletePhoto(params: {
  userId: string;
  photoId: string;
}): Promise<void> {
  const { userId, photoId } = params;

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, userId: true, originalPath: true, blurredPath: true, isPrimary: true },
  });
  if (!photo) throw new NotFoundError("Photo");
  if (photo.userId !== userId) {
    throw new ForbiddenError("Cette photo ne t'appartient pas");
  }

  await prisma.$transaction(async (tx) => {
    await tx.photo.delete({ where: { id: photoId } });

    // Si c'était la primary, promouvoir la suivante.
    // On fetche toutes les photos restantes et on applique pickNextPrimary
    // pour garantir un ordre 100% déterministe (position, createdAt, id).
    // Limite MAX_PHOTOS_PER_USER = 6 → fetch in-memory négligeable.
    if (photo.isPrimary) {
      const remaining = await tx.photo.findMany({
        where: { userId },
        select: { id: true, position: true, createdAt: true },
      });
      const next = pickNextPrimary(remaining);
      if (next) {
        await tx.photo.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }
  });

  // Fichiers disque : fire-and-forget après commit
  await deletePhotoFiles(photo.originalPath, photo.blurredPath);
}

// ============================================================
// resolvePhotoForStream — utilisée par la route /file/:id/:variant
// Vérifie l'ownership ou le déblocage via resolvePhotoAccess,
// puis retourne le chemin absolu du fichier à streamer.
// ============================================================
export async function resolvePhotoForStream(params: {
  viewerId: string;
  viewerIsPremium: boolean;
  photoId: string;
  variant: PhotoVariant;
}): Promise<{ absolutePath: string; ownerId: string }> {
  const { viewerId, viewerIsPremium, photoId, variant } = params;

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: {
      id: true,
      userId: true,
      originalPath: true,
      blurredPath: true,
    },
  });
  if (!photo) throw new NotFoundError("Photo");

  const isOwner = photo.userId === viewerId;
  let hasBlock = false;
  let match: Awaited<ReturnType<typeof findMatchBetween>> = null;

  if (!isOwner) {
    hasBlock = await hasBlockBetween(viewerId, photo.userId);
    // Un lookup de match n'est utile que pour la variante "original"
    if (variant === "original") {
      match = await findMatchBetween(viewerId, photo.userId);
    }
  }

  const access = resolvePhotoAccess({
    viewerId,
    ownerId: photo.userId,
    variant,
    viewerIsPremium,
    hasBlock,
    match,
  });
  if (!access.allowed) {
    switch (access.reason) {
      case "BLOCKED":
        throw new ForbiddenError("Accès interdit");
      case "NO_MATCH_FOR_ORIGINAL":
        throw new ForbiddenError("Aucune relation existante avec cet utilisateur");
      case "NOT_UNLOCKED":
        throw new ForbiddenError(
          "Photos non encore déverrouillées pour cette relation",
        );
      default:
        throw new ForbiddenError("Accès interdit");
    }
  }

  const relative = variant === "original" ? photo.originalPath : photo.blurredPath;
  const absolutePath = resolveStoredPath(relative);
  return { absolutePath, ownerId: photo.userId };
}
