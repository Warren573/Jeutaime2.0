import { prisma } from "../../config/prisma";

interface PublicProfileLike {
  userId: string;
  city?: string | null;
  [key: string]: unknown;
}

/**
 * Retire la ville des réponses publiques lorsque l'utilisateur a désactivé
 * le partage de localisation. Le réglage est appliqué côté serveur pour
 * éviter qu'un client puisse contourner la préférence d'affichage.
 */
export async function applyLocationPrivacy<T extends PublicProfileLike>(profile: T): Promise<T> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId: profile.userId },
    select: { locationShared: true },
  });

  if (settings?.locationShared === true) return profile;
  return { ...profile, city: null } as T;
}

export async function applyLocationPrivacyToMany<T extends PublicProfileLike>(profiles: T[]): Promise<T[]> {
  if (profiles.length === 0) return profiles;

  const ids = [...new Set(profiles.map((profile) => profile.userId))];
  const settings = await prisma.userSettings.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, locationShared: true },
  });
  const sharedByUser = new Map(settings.map((entry) => [entry.userId, entry.locationShared]));

  return profiles.map((profile) =>
    sharedByUser.get(profile.userId) === true
      ? profile
      : ({ ...profile, city: null } as T),
  );
}
