import { prisma } from "../../../config/prisma";

export interface AdminOverviewDto {
  users: {
    total: number;
    registrationsToday: number;
    registrations7d: number;
    registrations30d: number;
    activeToday: number;
    active7d: number;
    active30d: number;
    premiumActive: number;
    banned: number;
  };
  moderation: {
    openReports: number;
    totalReports: number;
  };
  activity: {
    matchesToday: number;
    lettersToday: number;
    bottlesActive: number;
    refugesActive: number;
  };
  salons: {
    active: number;
    total: number;
    activeSessions: number;
  };
  analytics: {
    registrations: {
      averagePerDay7d: number;
      averagePerDay30d: number;
      previous7d: number;
      weeklyChangePct: number | null;
    };
    demographics: {
      averageAge: number | null;
      averageAgeMen: number | null;
      averageAgeWomen: number | null;
      men: number;
      women: number;
      other: number;
      menPct: number;
      womenPct: number;
      otherPct: number;
      active7dMen: number;
      active7dWomen: number;
      premiumMen: number;
      premiumWomen: number;
      ageBands: {
        age18to24: number;
        age25to34: number;
        age35to44: number;
        age45to54: number;
        age55plus: number;
      };
    };
    funnel: {
      registered: number;
      profileCreated: number;
      sentSmile: number;
      matched: number;
      sentLetter: number;
      reachedTenLetters: number;
      premiumActive: number;
      profileRatePct: number;
      smileRatePct: number;
      matchRatePct: number;
      letterRatePct: number;
      tenLettersRatePct: number;
      premiumRatePct: number;
    };
    features7d: {
      salonJoins: number;
      refugesStarted: number;
      bottlesSent: number;
      cardGamesStarted: number;
      duelsCreated: number;
    };
    retention: {
      day1: { eligible: number; retained: number; ratePct: number };
      day7: { eligible: number; retained: number; ratePct: number };
      day30: { eligible: number; retained: number; ratePct: number };
    };
  };
}

export async function getOverview(): Promise<AdminOverviewDto> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const previousSevenDaysAgo = new Date(now);
  previousSevenDaysAgo.setDate(previousSevenDaysAgo.getDate() - 14);

  const [
    total,
    registrationsToday,
    registrations7d,
    registrations30d,
    activeToday,
    active7d,
    active30d,
    premiumActive,
    banned,
    openReports,
    totalReports,
    matchesToday,
    lettersToday,
    bottlesActive,
    refugesActive,
    activeSalons,
    totalSalons,
    activeSessions,
    previous7d,
    demographicsRows,
    profileCreated,
    funnelRows,
    salonJoins7d,
    refugesStarted7d,
    bottlesSent7d,
    cardGamesStarted7d,
    duelsCreated7d,
    retentionRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: startOfDay } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { premiumTier: "PREMIUM", premiumUntil: { gt: now } } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    prisma.report.count(),
    prisma.match.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.letter.count({ where: { sentAt: { gte: startOfDay } } }),
    prisma.messageInABottle.count({ where: { status: { in: ["FLOATING", "ACCEPTED"] } } }),
    prisma.refugeSession.count({ where: { status: { in: ["ACTIVE", "AWAITING_REVEAL_CONSENT"] } } }),
    prisma.salon.count({ where: { isActive: true } }),
    prisma.salon.count(),
    prisma.salonSession.count({ where: { status: "ACTIVE", expiresAt: { gt: now } } }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: previousSevenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
    }),
    prisma.$queryRaw<Array<{
      men: bigint;
      women: bigint;
      other: bigint;
      averageAge: number | null;
      averageAgeMen: number | null;
      averageAgeWomen: number | null;
      active7dMen: bigint;
      active7dWomen: bigint;
      premiumMen: bigint;
      premiumWomen: bigint;
      age18to24: bigint;
      age25to34: bigint;
      age35to44: bigint;
      age45to54: bigint;
      age55plus: bigint;
    }>>`
      SELECT
        COUNT(*) FILTER (WHERE p."gender" = 'HOMME')::bigint AS "men",
        COUNT(*) FILTER (WHERE p."gender" = 'FEMME')::bigint AS "women",
        COUNT(*) FILTER (WHERE p."gender" = 'AUTRE')::bigint AS "other",
        ROUND(AVG(EXTRACT(YEAR FROM AGE(NOW(), p."birthDate")))::numeric, 1)::float8 AS "averageAge",
        ROUND(AVG(EXTRACT(YEAR FROM AGE(NOW(), p."birthDate"))) FILTER (WHERE p."gender" = 'HOMME')::numeric, 1)::float8 AS "averageAgeMen",
        ROUND(AVG(EXTRACT(YEAR FROM AGE(NOW(), p."birthDate"))) FILTER (WHERE p."gender" = 'FEMME')::numeric, 1)::float8 AS "averageAgeWomen",
        COUNT(*) FILTER (WHERE p."gender" = 'HOMME' AND u."lastLoginAt" >= ${sevenDaysAgo})::bigint AS "active7dMen",
        COUNT(*) FILTER (WHERE p."gender" = 'FEMME' AND u."lastLoginAt" >= ${sevenDaysAgo})::bigint AS "active7dWomen",
        COUNT(*) FILTER (WHERE p."gender" = 'HOMME' AND u."premiumTier" = 'PREMIUM' AND u."premiumUntil" > NOW())::bigint AS "premiumMen",
        COUNT(*) FILTER (WHERE p."gender" = 'FEMME' AND u."premiumTier" = 'PREMIUM' AND u."premiumUntil" > NOW())::bigint AS "premiumWomen",
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(NOW(), p."birthDate")) BETWEEN 18 AND 24)::bigint AS "age18to24",
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(NOW(), p."birthDate")) BETWEEN 25 AND 34)::bigint AS "age25to34",
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(NOW(), p."birthDate")) BETWEEN 35 AND 44)::bigint AS "age35to44",
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(NOW(), p."birthDate")) BETWEEN 45 AND 54)::bigint AS "age45to54",
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(NOW(), p."birthDate")) >= 55)::bigint AS "age55plus"
      FROM "Profile" p
      JOIN "User" u ON u."id" = p."userId"
    `,
    prisma.profile.count(),
    prisma.$queryRaw<Array<{
      sentSmileUsers: bigint;
      matchedUsers: bigint;
      sentLetterUsers: bigint;
      reachedTenLettersUsers: bigint;
    }>>`
      SELECT
        (SELECT COUNT(DISTINCT r."fromId") FROM "Reaction" r WHERE r."type" = 'SMILE')::bigint AS "sentSmileUsers",
        (
          SELECT COUNT(DISTINCT x."userId")
          FROM (
            SELECT m."userAId" AS "userId" FROM "Match" m
            UNION
            SELECT m."userBId" AS "userId" FROM "Match" m
          ) x
        )::bigint AS "matchedUsers",
        (SELECT COUNT(DISTINCT l."fromUserId") FROM "Letter" l)::bigint AS "sentLetterUsers",
        (
          SELECT COUNT(DISTINCT x."userId")
          FROM (
            SELECT m."userAId" AS "userId"
            FROM "Match" m
            WHERE (m."letterCountA" + m."letterCountB") >= 10
            UNION
            SELECT m."userBId" AS "userId"
            FROM "Match" m
            WHERE (m."letterCountA" + m."letterCountB") >= 10
          ) x
        )::bigint AS "reachedTenLettersUsers"
    `,
    prisma.salonSessionParticipant.count({ where: { joinedAt: { gte: sevenDaysAgo } } }),
    prisma.refugeSession.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.messageInABottle.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.cardGameSession.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.privateDuel.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.$queryRaw<Array<{
      eligible1: bigint;
      retained1: bigint;
      eligible7: bigint;
      retained7: bigint;
      eligible30: bigint;
      retained30: bigint;
    }>>`
      SELECT
        COUNT(*) FILTER (WHERE u."createdAt" <= NOW() - INTERVAL '1 day')::bigint AS "eligible1",
        COUNT(*) FILTER (
          WHERE u."createdAt" <= NOW() - INTERVAL '1 day'
          AND EXISTS (
            SELECT 1 FROM "LoginEvent" le
            WHERE le."userId" = u."id"
              AND le."success" = true
              AND le."createdAt" >= u."createdAt" + INTERVAL '1 day'
              AND le."createdAt" <  u."createdAt" + INTERVAL '2 days'
          )
        )::bigint AS "retained1",
        COUNT(*) FILTER (WHERE u."createdAt" <= NOW() - INTERVAL '7 days')::bigint AS "eligible7",
        COUNT(*) FILTER (
          WHERE u."createdAt" <= NOW() - INTERVAL '7 days'
          AND EXISTS (
            SELECT 1 FROM "LoginEvent" le
            WHERE le."userId" = u."id"
              AND le."success" = true
              AND le."createdAt" >= u."createdAt" + INTERVAL '7 days'
              AND le."createdAt" <  u."createdAt" + INTERVAL '8 days'
          )
        )::bigint AS "retained7",
        COUNT(*) FILTER (WHERE u."createdAt" <= NOW() - INTERVAL '30 days')::bigint AS "eligible30",
        COUNT(*) FILTER (
          WHERE u."createdAt" <= NOW() - INTERVAL '30 days'
          AND EXISTS (
            SELECT 1 FROM "LoginEvent" le
            WHERE le."userId" = u."id"
              AND le."success" = true
              AND le."createdAt" >= u."createdAt" + INTERVAL '30 days'
              AND le."createdAt" <  u."createdAt" + INTERVAL '31 days'
          )
        )::bigint AS "retained30"
      FROM "User" u
      WHERE u."role" = 'USER'
    `,
  ]);

  const d = demographicsRows[0];
  const men = Number(d?.men ?? 0);
  const women = Number(d?.women ?? 0);
  const other = Number(d?.other ?? 0);
  const demographicTotal = men + women + other;
  const pct = (value: number) => demographicTotal > 0 ? Math.round((value / demographicTotal) * 1000) / 10 : 0;
  const weeklyChangePct = previous7d > 0
    ? Math.round(((registrations7d - previous7d) / previous7d) * 1000) / 10
    : null;

  const funnel = funnelRows[0];
  const sentSmileUsers = Number(funnel?.sentSmileUsers ?? 0);
  const matchedUsers = Number(funnel?.matchedUsers ?? 0);
  const sentLetterUsers = Number(funnel?.sentLetterUsers ?? 0);
  const reachedTenLettersUsers = Number(funnel?.reachedTenLettersUsers ?? 0);
  const rate = (value: number) => total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
  const rr = retentionRows[0];
  const retentionMetric = (eligibleRaw: bigint | undefined, retainedRaw: bigint | undefined) => {
    const eligible = Number(eligibleRaw ?? 0);
    const retained = Number(retainedRaw ?? 0);
    return {
      eligible,
      retained,
      ratePct: eligible > 0 ? Math.round((retained / eligible) * 1000) / 10 : 0,
    };
  };

  return {
    users: {
      total,
      registrationsToday,
      registrations7d,
      registrations30d,
      activeToday,
      active7d,
      active30d,
      premiumActive,
      banned,
    },
    moderation: { openReports, totalReports },
    activity: { matchesToday, lettersToday, bottlesActive, refugesActive },
    salons: { active: activeSalons, total: totalSalons, activeSessions },
    analytics: {
      registrations: {
        averagePerDay7d: Math.round((registrations7d / 7) * 10) / 10,
        averagePerDay30d: Math.round((registrations30d / 30) * 10) / 10,
        previous7d,
        weeklyChangePct,
      },
      demographics: {
        averageAge: d?.averageAge ?? null,
        averageAgeMen: d?.averageAgeMen ?? null,
        averageAgeWomen: d?.averageAgeWomen ?? null,
        men,
        women,
        other,
        menPct: pct(men),
        womenPct: pct(women),
        otherPct: pct(other),
        active7dMen: Number(d?.active7dMen ?? 0),
        active7dWomen: Number(d?.active7dWomen ?? 0),
        premiumMen: Number(d?.premiumMen ?? 0),
        premiumWomen: Number(d?.premiumWomen ?? 0),
        ageBands: {
          age18to24: Number(d?.age18to24 ?? 0),
          age25to34: Number(d?.age25to34 ?? 0),
          age35to44: Number(d?.age35to44 ?? 0),
          age45to54: Number(d?.age45to54 ?? 0),
          age55plus: Number(d?.age55plus ?? 0),
        },
      },
      funnel: {
        registered: total,
        profileCreated,
        sentSmile: sentSmileUsers,
        matched: matchedUsers,
        sentLetter: sentLetterUsers,
        reachedTenLetters: reachedTenLettersUsers,
        premiumActive,
        profileRatePct: rate(profileCreated),
        smileRatePct: rate(sentSmileUsers),
        matchRatePct: rate(matchedUsers),
        letterRatePct: rate(sentLetterUsers),
        tenLettersRatePct: rate(reachedTenLettersUsers),
        premiumRatePct: rate(premiumActive),
      },
      features7d: {
        salonJoins: salonJoins7d,
        refugesStarted: refugesStarted7d,
        bottlesSent: bottlesSent7d,
        cardGamesStarted: cardGamesStarted7d,
        duelsCreated: duelsCreated7d,
      },
      retention: {
        day1: retentionMetric(rr?.eligible1, rr?.retained1),
        day7: retentionMetric(rr?.eligible7, rr?.retained7),
        day30: retentionMetric(rr?.eligible30, rr?.retained30),
      },
    },
  };
}
