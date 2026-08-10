import { prisma } from '../../config/prisma';
import { PERSONAL_OFFERING_PREFIX } from './personalOfferings.policy';

const SPOTLIGHT_DURATION_MS = 36 * 60 * 60 * 1000;

type SpotlightRow = {
  toUserId: string;
  offeringId: string;
  startsAt: Date;
  expiresAt: Date;
};

export interface PersonalOfferingSpotlightDto {
  offering: {
    id: string;
    emoji: string;
    name: string;
    cost: number;
    category: string;
  } | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  ownedOfferingIds: string[];
}

function pickIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

export async function getPersonalOfferingSpotlight(
  toUserId: string,
  now: Date = new Date(),
): Promise<PersonalOfferingSpotlightDto> {
  const ownedRows = await prisma.offeringSent.findMany({
    where: {
      toUserId,
      offeringId: { startsWith: PERSONAL_OFFERING_PREFIX },
    },
    select: { offeringId: true },
    distinct: ['offeringId'],
  });
  const ownedOfferingIds = ownedRows.map((row) => row.offeringId);
  const ownedSet = new Set(ownedOfferingIds);

  const existingRows = await prisma.$queryRaw<SpotlightRow[]>`
    SELECT "toUserId", "offeringId", "startsAt", "expiresAt"
    FROM "PersonalOfferingSpotlight"
    WHERE "toUserId" = ${toUserId}
    LIMIT 1
  `;
  const existing = existingRows[0];

  if (existing && existing.expiresAt.getTime() > now.getTime()) {
    if (ownedSet.has(existing.offeringId)) {
      return {
        offering: null,
        startsAt: existing.startsAt,
        expiresAt: existing.expiresAt,
        ownedOfferingIds,
      };
    }

    const offering = await prisma.offeringCatalog.findFirst({
      where: {
        id: existing.offeringId,
        enabled: true,
      },
      select: { id: true, emoji: true, name: true, cost: true, category: true },
    });

    if (offering) {
      return {
        offering: { ...offering, category: String(offering.category) },
        startsAt: existing.startsAt,
        expiresAt: existing.expiresAt,
        ownedOfferingIds,
      };
    }
  }

  const available = await prisma.offeringCatalog.findMany({
    where: {
      enabled: true,
      id: {
        startsWith: PERSONAL_OFFERING_PREFIX,
        notIn: ownedOfferingIds.length > 0 ? ownedOfferingIds : undefined,
      },
    },
    orderBy: { id: 'asc' },
    select: { id: true, emoji: true, name: true, cost: true, category: true },
  });

  if (available.length === 0) {
    await prisma.$executeRaw`
      DELETE FROM "PersonalOfferingSpotlight" WHERE "toUserId" = ${toUserId}
    `;
    return { offering: null, startsAt: null, expiresAt: null, ownedOfferingIds };
  }

  const cycleSeed = `${toUserId}:${Math.floor(now.getTime() / SPOTLIGHT_DURATION_MS)}`;
  const selected = available[pickIndex(cycleSeed, available.length)]!;
  const startsAt = now;
  const expiresAt = new Date(now.getTime() + SPOTLIGHT_DURATION_MS);

  await prisma.$executeRaw`
    INSERT INTO "PersonalOfferingSpotlight" ("toUserId", "offeringId", "startsAt", "expiresAt")
    VALUES (${toUserId}, ${selected.id}, ${startsAt}, ${expiresAt})
    ON CONFLICT ("toUserId") DO UPDATE SET
      "offeringId" = EXCLUDED."offeringId",
      "startsAt" = EXCLUDED."startsAt",
      "expiresAt" = EXCLUDED."expiresAt"
  `;

  return {
    offering: { ...selected, category: String(selected.category) },
    startsAt,
    expiresAt,
    ownedOfferingIds,
  };
}
