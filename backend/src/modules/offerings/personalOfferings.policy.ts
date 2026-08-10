import { MatchStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ForbiddenError, BadRequestError } from '../../core/errors';

export const PERSONAL_OFFERING_PREFIX = 'desk_';

export function isPersonalOfferingId(offeringId: string): boolean {
  return offeringId.startsWith(PERSONAL_OFFERING_PREFIX);
}

export async function assertPersonalOfferingAllowed(
  fromUserId: string,
  toUserId: string,
  offeringId: string,
  salonId?: string,
): Promise<void> {
  if (!isPersonalOfferingId(offeringId)) return;

  if (salonId) {
    throw new BadRequestError('Une offrande de bureau ne peut pas être envoyée dans un salon');
  }

  const [userAId, userBId] = [fromUserId, toUserId].sort();
  const contact = await prisma.match.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { status: true },
  });

  if (!contact || contact.status !== MatchStatus.ACTIVE) {
    throw new ForbiddenError('Les offrandes de bureau sont réservées à tes contacts');
  }

  const alreadyOwned = await prisma.offeringSent.findFirst({
    where: {
      toUserId,
      offeringId,
    },
    select: { id: true },
  });

  if (alreadyOwned) {
    throw new BadRequestError('Cette offrande est déjà présente sur son bureau');
  }
}
