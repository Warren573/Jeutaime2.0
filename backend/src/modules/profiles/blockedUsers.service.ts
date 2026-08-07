import { prisma } from "../../config/prisma";

export async function listBlockedUsers(userId: string) {
  const blocks = await prisma.block.findMany({
    where: { fromId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      toId: true,
      createdAt: true,
      to: {
        select: {
          profile: {
            select: {
              pseudo: true,
              gender: true,
              city: true,
              avatarConfig: true,
            },
          },
        },
      },
    },
  });

  return blocks.map((block) => ({
    userId: block.toId,
    blockedAt: block.createdAt,
    pseudo: block.to.profile?.pseudo ?? "Utilisateur",
    gender: block.to.profile?.gender ?? null,
    city: block.to.profile?.city ?? null,
    avatarConfig: block.to.profile?.avatarConfig ?? null,
  }));
}
