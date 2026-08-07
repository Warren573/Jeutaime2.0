import { prisma } from "../../config/prisma";

export interface UserSettingsPatch {
  notifEmail?: boolean;
  notifPush?: boolean;
  soundEnabled?: boolean;
  showInDiscovery?: boolean;
  locationShared?: boolean;
}

const DEFAULTS = {
  notifEmail: true,
  notifPush: true,
  soundEnabled: true,
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
      showInDiscovery: true,
      locationShared: true,
    },
  });

  return settings ?? DEFAULTS;
}

export async function updateUserSettings(userId: string, patch: UserSettingsPatch) {
  return prisma.userSettings.upsert({
    where: { userId },
    update: patch,
    create: { userId, ...DEFAULTS, ...patch },
    select: {
      notifEmail: true,
      notifPush: true,
      soundEnabled: true,
      showInDiscovery: true,
      locationShared: true,
    },
  });
}
