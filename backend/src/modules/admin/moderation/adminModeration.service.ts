import { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { NotFoundError } from "../../../core/errors";
import { resolveStoredPath } from "../../photos/photos.storage";
import { writeAudit } from "../admin.audit";

export async function getModerationOverview() {
  const [
    activePhotos,
    hiddenPhotos,
    removedPhotos,
    visibleSalonMessages,
    hiddenSalonMessages,
    openReports,
  ] = await Promise.all([
    prisma.photo.count({ where: { moderationStatus: "ACTIVE" } }),
    prisma.photo.count({ where: { moderationStatus: "HIDDEN" } }),
    prisma.photo.count({ where: { moderationStatus: "REMOVED" } }),
    prisma.salonMessage.count({ where: { isHidden: false } }),
    prisma.salonMessage.count({ where: { isHidden: true } }),
    prisma.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
  ]);

  return {
    photos: { active: activePhotos, hidden: hiddenPhotos, removed: removedPhotos },
    salonMessages: { visible: visibleSalonMessages, hidden: hiddenSalonMessages },
    openReports,
  };
}

export async function listPhotos(status?: string) {
  const rows = await prisma.photo.findMany({
    where: status ? { moderationStatus: status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      createdAt: true,
      isPrimary: true,
      moderationStatus: true,
      moderationReason: true,
      moderatedAt: true,
      moderatedBy: true,
      user: {
        select: {
          email: true,
          profile: { select: { pseudo: true } },
        },
      },
    },
  });

  return rows.map((p) => ({
    id: p.id,
    userId: p.userId,
    pseudo: p.user.profile?.pseudo ?? null,
    email: p.user.email,
    createdAt: p.createdAt,
    isPrimary: p.isPrimary,
    moderationStatus: p.moderationStatus,
    moderationReason: p.moderationReason,
    moderatedAt: p.moderatedAt,
    moderatedBy: p.moderatedBy,
    adminPreviewUrl: `/api/admin/moderation/photos/${p.id}/file`,
  }));
}

export async function getPhotoFile(photoId: string) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, userId: true, originalPath: true },
  });
  if (!photo) throw new NotFoundError("Photo");
  return {
    absolutePath: resolveStoredPath(photo.originalPath),
    ownerId: photo.userId,
  };
}

export async function moderatePhoto(
  actorId: string,
  photoId: string,
  status: "ACTIVE" | "HIDDEN" | "REMOVED",
  reason: string,
) {
  const current = await prisma.photo.findUnique({
    where: { id: photoId },
    select: {
      id: true,
      userId: true,
      moderationStatus: true,
    },
  });
  if (!current) throw new NotFoundError("Photo");

  const updated = await prisma.photo.update({
    where: { id: photoId },
    data: {
      moderationStatus: status,
      moderationReason: reason,
      moderatedAt: new Date(),
      moderatedBy: actorId,
    },
    select: {
      id: true,
      userId: true,
      moderationStatus: true,
      moderationReason: true,
      moderatedAt: true,
    },
  });

  await writeAudit({
    actorId,
    action: status === "ACTIVE" ? "admin.photo.restore" : status === "HIDDEN" ? "admin.photo.hide" : "admin.photo.remove",
    target: current.userId,
    meta: {
      photoId,
      from: current.moderationStatus,
      to: status,
      reason,
    } as Prisma.InputJsonValue,
  });

  return updated;
}

export async function getProfileContent(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          pseudo: true,
          bio: true,
          updatedAt: true,
        },
      },
      settings: {
        select: { showInDiscovery: true },
      },
      photos: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          moderationStatus: true,
          moderationReason: true,
          createdAt: true,
        },
      },
    },
  });
  if (!user) throw new NotFoundError("Utilisateur");

  return {
    id: user.id,
    email: user.email,
    pseudo: user.profile?.pseudo ?? null,
    bio: user.profile?.bio ?? null,
    profileUpdatedAt: user.profile?.updatedAt ?? null,
    showInDiscovery: user.settings?.showInDiscovery ?? false,
    photos: user.photos.map((p) => ({
      ...p,
      adminPreviewUrl: `/api/admin/moderation/photos/${p.id}/file`,
    })),
  };
}

export async function moderateProfile(
  actorId: string,
  userId: string,
  action: "HIDE_FROM_DISCOVERY" | "RESTORE_DISCOVERY" | "CLEAR_BIO",
  reason: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      profile: { select: { id: true, bio: true, pseudo: true } },
      settings: { select: { showInDiscovery: true } },
    },
  });
  if (!user) throw new NotFoundError("Utilisateur");

  if (action === "CLEAR_BIO") {
    if (!user.profile) throw new NotFoundError("Profil");
    await prisma.profile.update({
      where: { id: user.profile.id },
      data: { bio: null },
    });
  } else {
    await prisma.userSettings.upsert({
      where: { userId },
      update: { showInDiscovery: action === "RESTORE_DISCOVERY" },
      create: {
        userId,
        showInDiscovery: action === "RESTORE_DISCOVERY",
      },
    });
  }

  await writeAudit({
    actorId,
    action:
      action === "CLEAR_BIO"
        ? "admin.profile.bio.clear"
        : action === "HIDE_FROM_DISCOVERY"
          ? "admin.profile.discovery.hide"
          : "admin.profile.discovery.restore",
    target: userId,
    meta: {
      reason,
      previousBio: action === "CLEAR_BIO" ? user.profile?.bio ?? null : undefined,
      pseudo: user.profile?.pseudo ?? null,
      previousShowInDiscovery: user.settings?.showInDiscovery ?? null,
    } as Prisma.InputJsonValue,
  });

  return getProfileContent(userId);
}

export async function listSalonMessages(hidden?: boolean) {
  const rows = await prisma.salonMessage.findMany({
    where: hidden === undefined ? undefined : { isHidden: hidden },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      salonId: true,
      userId: true,
      content: true,
      kind: true,
      isHidden: true,
      hiddenReason: true,
      hiddenAt: true,
      hiddenBy: true,
      createdAt: true,
      salon: { select: { name: true } },
      user: {
        select: {
          email: true,
          profile: { select: { pseudo: true } },
        },
      },
    },
  });

  return rows.map((m) => ({
    id: m.id,
    salonId: m.salonId,
    salonName: m.salon.name,
    userId: m.userId,
    pseudo: m.user.profile?.pseudo ?? null,
    email: m.user.email,
    content: m.content,
    kind: m.kind,
    isHidden: m.isHidden,
    hiddenReason: m.hiddenReason,
    hiddenAt: m.hiddenAt,
    hiddenBy: m.hiddenBy,
    createdAt: m.createdAt,
  }));
}

export async function moderateSalonMessage(
  actorId: string,
  messageId: string,
  hidden: boolean,
  reason: string,
) {
  const current = await prisma.salonMessage.findUnique({
    where: { id: messageId },
    select: { id: true, userId: true, isHidden: true, content: true },
  });
  if (!current) throw new NotFoundError("Message");

  const updated = await prisma.salonMessage.update({
    where: { id: messageId },
    data: {
      isHidden: hidden,
      hiddenReason: hidden ? reason : null,
      hiddenAt: hidden ? new Date() : null,
      hiddenBy: hidden ? actorId : null,
    },
    select: {
      id: true,
      userId: true,
      isHidden: true,
      hiddenReason: true,
      hiddenAt: true,
    },
  });

  await writeAudit({
    actorId,
    action: hidden ? "admin.salon_message.hide" : "admin.salon_message.restore",
    target: current.userId,
    meta: {
      messageId,
      reason,
      previousHidden: current.isHidden,
      contentPreview: current.content.slice(0, 200),
    } as Prisma.InputJsonValue,
  });

  return updated;
}
