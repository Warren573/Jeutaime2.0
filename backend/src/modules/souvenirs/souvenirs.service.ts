import { prisma } from "../../config/prisma";

export interface SouvenirDto {
  id: string;
  type: "milestone" | "match" | "letter" | "gift";
  title: string;
  description: string;
  date: string;
  emoji: string;
}

// Construit la "boîte à souvenirs" d'un utilisateur à partir de ses données
// réelles (inscription, matchs, lettres, offrandes) — aucune donnée fictive.
export async function getSouvenirs(userId: string): Promise<SouvenirDto[]> {
  const souvenirs: SouvenirDto[] = [];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  if (user) {
    souvenirs.push({
      id: "inscription",
      type: "milestone",
      title: "Inscription",
      description: "Tu as rejoint JeuTaime !",
      date: user.createdAt.toISOString(),
      emoji: "🎉",
    });
  }

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: {
      id: true,
      userAId: true,
      userBId: true,
      createdAt: true,
      userA: { select: { profile: { select: { pseudo: true } } } },
      userB: { select: { profile: { select: { pseudo: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  matches.forEach((m, idx) => {
    const partner = m.userAId === userId ? m.userB.profile : m.userA.profile;
    const partnerName = partner?.pseudo ?? "quelqu'un";
    souvenirs.push({
      id: `match-${m.id}`,
      type: "match",
      title: idx === 0 ? "Premier match" : "Nouveau match",
      description: `Tu as matché avec ${partnerName} !`,
      date: m.createdAt.toISOString(),
      emoji: "🌟",
    });
  });

  const firstLetter = await prisma.letter.findFirst({
    where: { toUserId: userId },
    orderBy: { sentAt: "asc" },
    select: { id: true, sentAt: true, fromUser: { select: { profile: { select: { pseudo: true } } } } },
  });

  if (firstLetter) {
    souvenirs.push({
      id: `letter-${firstLetter.id}`,
      type: "letter",
      title: "Première lettre reçue",
      description: `${firstLetter.fromUser.profile?.pseudo ?? "Quelqu'un"} t'a écrit pour la première fois.`,
      date: firstLetter.sentAt.toISOString(),
      emoji: "💌",
    });
  }

  const firstGift = await prisma.offeringSent.findFirst({
    where: { toUserId: userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      offering: { select: { name: true, emoji: true } },
      fromUser: { select: { profile: { select: { pseudo: true } } } },
    },
  });

  if (firstGift) {
    souvenirs.push({
      id: `gift-${firstGift.id}`,
      type: "gift",
      title: "Première offrande reçue",
      description: `${firstGift.fromUser.profile?.pseudo ?? "Quelqu'un"} t'a offert : ${firstGift.offering.name}.`,
      date: firstGift.createdAt.toISOString(),
      emoji: firstGift.offering.emoji || "🎁",
    });
  }

  souvenirs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return souvenirs;
}
