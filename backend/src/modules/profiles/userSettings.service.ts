import { prisma } from "../../config/prisma";
import { ConflictError } from "../../core/errors";
import { getMatchLimit } from "../../policies/contactLimits";
import { isPremiumActive } from "../../policies/premium";
import { MatchStatus } from "@prisma/client";

export interface UserSettingsPatch {
  notifEmail?: boolean;
  notifPush?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  vacationMode?: boolean;
  showInDiscovery?: boolean;
  locationShared?: boolean;
}

const DEFAULTS = {
  notifEmail: true,
  notifPush: true,
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

  return prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...DEFAULTS, ...data },
    select: {
      notifEmail: true,
      notifPush: true,
      soundEnabled: true,
      vibrationEnabled: true,
      vacationMode: true,
      vacationStartedAt: true,
      showInDiscovery: true,
      locationShared: true,
    },
  });
}
