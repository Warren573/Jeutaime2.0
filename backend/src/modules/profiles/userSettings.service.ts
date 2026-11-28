import { prisma } from "../../config/prisma";
import { ConflictError } from "../../core/errors";
import { getMatchLimit } from "../../policies/contactLimits";
import { isPremiumActive } from "../../policies/premium";
import { MatchStatus } from "@prisma/client";

export interface UserSettingsPatch {
  notifEmail?: boolean;
  notifPush?: boolean;
  notifMeetings?: boolean;
  notifLetters?: boolean;
  notifSalons?: boolean;
  notifActivities?: boolean;
  notifNews?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  vacationMode?: boolean;
  showInDiscovery?: boolean;
  locationShared?: boolean;
}

const DEFAULTS = {
  notifEmail: true,
  notifPush: true,
  notifMeetings: true,
  notifLetters: true,
  notifSalons: true,
  notifActivities: true,
  notifNews: true,
  soundEnabled: true,
  vibrationEnabled: true,
  vacationMode: false,
  showInDiscovery: true,
  locationShared: false,
} as const;

export async function getUserSettings(userId: string) {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      notifEmail: true,
      notifPush: true,
      notifMeetings: true,
      notifLetters: true,
      notifSalons: true,
      notifActivities: true,
      notifNews: true,
      soundEnabled: true,
      vibrationEnabled: true,
      vacationMode: true,
      vacationStartedAt: true,
      showInDiscovery: true,
      locationShared: true,
    },
  });

  return settings ?? DEFAULTS;
}

export async function updateUserSettings(userId: string, patch: UserSettingsPatch) {
  const vacationChanged = patch.vacationMode !== undefined;

  if (patch.vacationMode === false) {
    const [user, activeContacts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { premiumTier: true, premiumUntil: true },
      }),
      prisma.match.count({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
          status: { in: [MatchStatus.ACTIVE, MatchStatus.PENDING] },
        },
      }),
    ]);

    const limit = getMatchLimit(user ? isPremiumActive(user) : false);
    if (activeContacts > limit) {
      throw new ConflictError(
        `Tu as ${activeContacts} contacts pour une limite de ${limit}. Romps un contact ou passe à l'abonnement adapté avant de quitter le mode vacances.`,
      );
    }
  }

  const data = {
    ...patch,
    ...(vacationChanged
      ? { vacationStartedAt: patch.vacationMode ? new Date() : null }
      : {}),
  };

  const select = {
      notifEmail: true,
      notifPush: true,
      notifMeetings: true,
      notifLetters: true,
      notifSalons: true,
      notifActivities: true,
      notifNews: true,
      soundEnabled: true,
      vibrationEnabled: true,
      vacationMode: true,
      vacationStartedAt: true,
      showInDiscovery: true,
      locationShared: true,
  } as const;

  if (!vacationChanged) {
    return prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...DEFAULTS, ...data },
      select,
    });
  }

  // Changement du mode vacances : l'historique des périodes est tenu dans la MÊME transaction (collecte pour le futur
  // système de confiance ; le comportement du mode vacances, lui, est inchangé).
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "userId" FROM "UserSettings" WHERE "userId" = ${userId} FOR UPDATE`;
    const before = await tx.userSettings.findUnique({ where: { userId }, select: { vacationMode: true } });
    const result = await tx.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...DEFAULTS, ...data },
      select,
    });
    const wasOn = before?.vacationMode === true;
    const now = new Date();
    if (patch.vacationMode === true && !wasOn) {
      await tx.vacationPeriod.create({ data: { userId, startedAt: now } });
    } else if (patch.vacationMode === false && wasOn) {
      await tx.vacationPeriod.updateMany({ where: { userId, endedAt: null }, data: { endedAt: now } });
    }
    return result;
  });
}
