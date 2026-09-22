import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

type JournalMeta = {
  duelId?: string;
  challengerId?: string;
  opponentId?: string;
  commonUserId?: string | null;
  winnerId?: string | null;
};

function asMeta(value: Prisma.JsonValue | null): JournalMeta {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JournalMeta;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getTodayEdition(userId: string) {
  const start = startOfToday();

  const events = await prisma.journalEvent.findMany({
    where: {
      userId,
      occurredAt: { gte: start },
    },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  const ids = new Set<string>();
  for (const event of events) {
    const meta = asMeta(event.meta);
    for (const id of [meta.challengerId, meta.opponentId, meta.commonUserId, meta.winnerId]) {
      if (id) ids.add(id);
    }
  }

  const users = ids.size
    ? await prisma.user.findMany({
        where: { id: { in: [...ids] } },
        select: { id: true, profile: { select: { pseudo: true } } },
      })
    : [];
  const names = new Map(users.map((u) => [u.id, u.profile?.pseudo ?? "Utilisateur"]));

  const name = (id?: string | null) => (id ? names.get(id) ?? "Utilisateur" : "Utilisateur");

  const personalEvents = events.map((event) => {
    const meta = asMeta(event.meta);
    const challenger = name(meta.challengerId);
    const opponent = name(meta.opponentId);
    const common = name(meta.commonUserId);

    let text = "Un événement a eu lieu aujourd'hui.";

    switch (event.kind) {
      case "DUEL_CREATED":
        text = `Tu as lancé un duel à ${opponent}, autour de ${common}.`;
        break;
      case "DUEL_RECEIVED":
        text = `${challenger} t'a lancé un duel, autour de ${common}.`;
        break;
      case "DUEL_AROUND_YOU_CREATED":
        text = `${challenger} et ${opponent} se sont lancé un duel autour de toi.`;
        break;
      case "DUEL_RESOLVED":
        if (!meta.winnerId) text = `Ton duel avec ${challenger === name(userId) ? opponent : challenger} s'est terminé sur une égalité.`;
        else if (meta.winnerId === userId) text = `Tu as remporté ton duel.`;
        else text = `Ton duel s'est terminé par une défaite.`;
        break;
      case "DUEL_AROUND_YOU_RESOLVED":
        text = meta.winnerId
          ? `Le duel entre ${challenger} et ${opponent} est terminé.`
          : `Le duel entre ${challenger} et ${opponent} s'est terminé sur une égalité.`;
        break;
      case "DUEL_DECLINED":
        text = `${opponent} a décliné ton duel.`;
        break;
      case "DUEL_DECLINED_BY_ME":
        text = `Tu as décliné le duel de ${challenger}.`;
        break;
      case "DUEL_AROUND_YOU_DECLINED":
        text = `Le duel entre ${challenger} et ${opponent} n'aura finalement pas lieu.`;
        break;
      case "DUEL_EXPIRED":
        text = `Un de tes duels a expiré après 48 h sans être terminé.`;
        break;
      case "DUEL_AROUND_YOU_EXPIRED":
        text = `Un duel lancé autour de toi a expiré après 48 h.`;
        break;
    }

    return {
      id: event.id,
      kind: event.kind,
      text,
      occurredAt: event.occurredAt,
    };
  });

  return {
    date: start.toISOString(),
    personalEvents,
  };
}
