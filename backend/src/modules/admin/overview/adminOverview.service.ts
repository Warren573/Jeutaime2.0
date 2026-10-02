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
}

export async function getOverview(): Promise<AdminOverviewDto> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
  ]);

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
  };
}
