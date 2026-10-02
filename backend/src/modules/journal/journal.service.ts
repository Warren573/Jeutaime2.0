import { prisma } from "../../config/prisma";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getTodayEdition(_userId: string) {
  const start = startOfToday();

  const communityPosts = await prisma.communityJournalPost.findMany({
    where: {
      publishedAt: { gte: start },
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      body: true,
      publishedAt: true,
    },
  });

  return {
    date: start.toISOString(),
    communityPosts,
  };
}
