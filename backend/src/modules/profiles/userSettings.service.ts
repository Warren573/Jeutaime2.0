import { prisma } from "../../config/prisma";

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
