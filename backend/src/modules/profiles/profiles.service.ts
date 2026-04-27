import { prisma } from "../../config/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "../../core/errors";
import { getPhotoUnlockProgress } from "../../policies/photoUnlock";
import { buildMeta } from "../../core/utils/pagination";
import { buildPhotoUrl } from "../photos/photos.urls";
import { UpdateProfileDto, UpdateQuestionsDto, DiscoveryQuery } from "./profiles.schemas";
import { Gender, LookingFor, MatchStatus, Prisma } from "@prisma/client";

// -----------------------------------------------------------------------
// Mon profil complet
// -----------------------------------------------------------------------
export async function getMyProfile(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { questions: true },
  });
  if (!profile) throw new NotFoundError("Profil");
  return profile;
}

// -----------------------------------------------------------------------
// Mise à jour de mon profil
// -----------------------------------------------------------------------
export async function updateMyProfile(userId: string, dto: UpdateProfileDto) {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new NotFoundError("Profil");
  if (dto.pseudo !== undefined) {
    const pseudoTaken = await prisma.profile.findFirst({
      where: { pseudo: dto.pseudo, userId: { not: userId } },
      select: { id: true },
    });
    if (pseudoTaken) throw new ConflictError("Ce pseudo est déjà pris");
  }

  return prisma.profile.update({
    where: { userId },
    data: {
      ...(dto.pseudo !== undefined && { pseudo: dto.pseudo }),
      ...(dto.birthDate !== undefined && { birthDate: dto.birthDate }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
      ...(dto.job !== undefined && { job: dto.job }),
      ...(dto.physicalDesc !== undefined && { physicalDesc: dto.physicalDesc }),
      ...(dto.interests !== undefined && { interests: dto.interests }),
      ...(dto.lookingFor !== undefined && { lookingFor: dto.lookingFor as LookingFor[] }),
      ...(dto.interestedIn !== undefined && { interestedIn: dto.interestedIn as Gender[] }),
      ...(dto.hasChildren !== undefined && { hasChildren: dto.hasChildren }),
      ...(dto.wantsChildren !== undefined && { wantsChildren: dto.wantsChildren }),
      ...(dto.avatarConfig !== undefined && { avatarConfig: dto.avatarConfig as Prisma.InputJsonValue }),
      ...(dto.height !== undefined && { height: dto.height }),
      ...(dto.vibe !== undefined && { vibe: dto.vibe }),
      ...(dto.quote !== undefined && { quote: dto.quote }),
      ...(dto.identityTags !== undefined && { identityTags: dto.identityTags }),
      ...(dto.qualities !== undefined && { qualities: dto.qualities }),
      ...(dto.defaults !== undefined && { defaults: dto.defaults }),
      ...(dto.idealDay !== undefined && { idealDay: dto.idealDay }),
      ...(dto.skills !== undefined && { skills: dto.skills as Prisma.InputJsonValue }),
    },
    include: { questions: true },
  });
}

// -----------------------------------------------------------------------
// Répondre aux questions de validation
// -----------------------------------------------------------------------
export async function updateQuestions(userId: string, dto: UpdateQuestionsDto) {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new NotFoundError("Profil");

  await prisma.$transaction(
    dto.questions.map((q) =>
      prisma.profileQuestion.upsert({
        where: { profileId_questionId: { profileId: profile.id, questionId: q.questionId } },
        update: { answer: q.answer, wrongAnswers: q.wrongAnswers },
        create: {
          profileId: profile.id,
          questionId: q.questionId,
          answer: q.answer,
          wrongAnswers: q.wrongAnswers,
        },
      }),
    ),
  );

  return prisma.profileQuestion.findMany({ where: { profileId: profile.id } });
}

// -----------------------------------------------------------------------
// Vue publique d'un profil (photos floutées selon policy)
// -----------------------------------------------------------------------
export async function getPublicProfile(viewerId: string, targetUserId: string, viewerIsPremium: boolean) {
  const profile = await prisma.profile.findUnique({
    where: { userId: targetUserId },
    include: { questions: { select: { questionId: true, answer: true } } },
  });
  if (!profile) throw new NotFoundError("Profil");

  // Est-ce que le viewer a bloqué cet user ou vice versa ?
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { fromId: viewerId, toId: targetUserId },
        { fromId: targetUserId, toId: viewerId },
      ],
    },
  });
  if (block) throw new ForbiddenError("Accès interdit à ce profil");

  // Trouver le match entre les deux pour calculer le unlock
  const match = await findMatchBetween(viewerId, targetUserId);

  let photoUnlockInfo = {
    unlocked: false,
    threshold: viewerIsPremium ? 3 : 10,
    myCount: 0,
    otherCount: 0,
  };

  if (match) {
    const myLetterCount = match.userAId === viewerId ? match.letterCountA : match.letterCountB;
    const otherLetterCount = match.userAId === viewerId ? match.letterCountB : match.letterCountA;
    photoUnlockInfo = getPhotoUnlockProgress({
      myLetterCount,
      otherLetterCount,
      viewerIsPremium,
    });
  }

  // Photos — jamais de chemin disque exposé, on construit des URLs API
  // sécurisées qui passeront par /api/photos/file/:id/:variant
  const photos = await prisma.photo.findMany({
    where: { userId: targetUserId },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
    select: { id: true, position: true, isPrimary: true },
  });

  const variant = photoUnlockInfo.unlocked ? "original" : "blurred";
  const servedPhotos = photos.map((p) => ({
    id: p.id,
    url: buildPhotoUrl(p.id, variant),
    position: p.position,
    isPrimary: p.isPrimary,
    isBlurred: !photoUnlockInfo.unlocked,
  }));

  return {
    profile,
    photos: servedPhotos,
    photoUnlock: photoUnlockInfo,
  };
}

// -----------------------------------------------------------------------
// Discovery (liste de profils filtrés)
// -----------------------------------------------------------------------
export async function discoverProfiles(viewerId: string, query: DiscoveryQuery) {
  const { page, pageSize, gender, city, lookingFor, minAge, maxAge } = query;

  // Profils bloqués (dans les deux sens)
  const blocks = await prisma.block.findMany({
    where: { OR: [{ fromId: viewerId }, { toId: viewerId }] },
    select: { fromId: true, toId: true },
  });
  const blockedIds = blocks.flatMap((b) => [b.fromId, b.toId]).filter((id) => id !== viewerId);

  // Ids déjà en match actif/pending avec le viewer
  const existingMatchIds = await getExistingMatchUserIds(viewerId);

  const excludeIds = [...new Set([...blockedIds, ...existingMatchIds, viewerId])];

  // Filtres de date pour l'âge
  let birthDateFilter: Record<string, Date> = {};
  const now = new Date();
  if (minAge !== undefined) {
    const maxBirth = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
    birthDateFilter = { ...birthDateFilter, lte: maxBirth };
  }
  if (maxAge !== undefined) {
    const minBirth = new Date(now.getFullYear() - maxAge - 1, now.getMonth(), now.getDate());
    birthDateFilter = { ...birthDateFilter, gte: minBirth };
  }

  const where = {
    userId: { notIn: excludeIds },
    user: { isBanned: false, settings: { showInDiscovery: true } },
    ...(gender && { gender }),
    ...(city && { city: { contains: city, mode: "insensitive" as const } }),
    ...(lookingFor && { lookingFor: { has: lookingFor } }),
    ...(Object.keys(birthDateFilter).length > 0 && { birthDate: birthDateFilter }),
  };

  const [total, profiles] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      select: {
        id: true,
        userId: true,
        pseudo: true,
        gender: true,
        city: true,
        birthDate: true,
        bio: true,
        physicalDesc: true,
        interests: true,
        lookingFor: true,
        avatarConfig: true,
        points: true,
        badges: true,
      },
      orderBy: { points: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: profiles,
    meta: buildMeta(total, { page, pageSize }),
  };
}

// -----------------------------------------------------------------------
// Bloquer / Débloquer
// -----------------------------------------------------------------------
export async function blockUser(fromId: string, toId: string) {
  if (fromId === toId) throw new ForbiddenError("Tu ne peux pas te bloquer toi-même");
  return prisma.block.upsert({
    where: { fromId_toId: { fromId, toId } },
    update: {},
    create: { fromId, toId },
  });
}

export async function unblockUser(fromId: string, toId: string) {
  const block = await prisma.block.findUnique({
    where: { fromId_toId: { fromId, toId } },
  });
  if (!block) throw new NotFoundError("Blocage");
  await prisma.block.delete({ where: { fromId_toId: { fromId, toId } } });
}

// -----------------------------------------------------------------------
// Helpers internes
// -----------------------------------------------------------------------
async function findMatchBetween(userAId: string, userBId: string) {
  const [a, b] = [userAId, userBId].sort();
  return prisma.match.findUnique({
    where: { userAId_userBId: { userAId: a as string, userBId: b as string } },
    select: { userAId: true, letterCountA: true, letterCountB: true, status: true },
  });
}

async function getExistingMatchUserIds(userId: string): Promise<string[]> {
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      status: { in: [MatchStatus.ACTIVE, MatchStatus.PENDING] },
    },
    select: { userAId: true, userBId: true },
  });
  return matches.flatMap((m) => [m.userAId, m.userBId]).filter((id) => id !== userId);
}

// -----------------------------------------------------------------------
// Mes photos — retourne des URLs API sécurisées (pas de chemin disque)
// -----------------------------------------------------------------------
export async function getMyPhotos(userId: string) {
  const photos = await prisma.photo.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
    select: {
      id: true,
      position: true,
      isPrimary: true,
      createdAt: true,
    },
  });
  return photos.map((p) => ({
    id: p.id,
    url: buildPhotoUrl(p.id, "original"),
    position: p.position,
    isPrimary: p.isPrimary,
    createdAt: p.createdAt,
  }));
}
