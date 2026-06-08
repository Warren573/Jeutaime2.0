import { prisma } from "../../config/prisma";
import { NotFoundError, BadRequestError, ConflictError } from "../../core/errors";
import type {
  GetActiveSessionsResponse,
  GetSessionDetailResponse,
  JoinSessionResponse,
  LeaveSessionResponse,
  GetPreviousEncountersResponse,
} from "./salonSessions.schemas";

// Helper: Validate salonKind
function validateSalonKind(salonKind: string): void {
  const validKinds = ["PISCINE", "CAFE_DE_PARIS", "ILE_PIRATES", "THEATRE", "BAR_COCKTAILS", "METAL", "PSY"];
  if (!validKinds.includes(salonKind)) {
    throw new BadRequestError(`Invalid salonKind: ${salonKind}`);
  }
}

// ============================================================
// Get active sessions for a salon
// ============================================================
export async function getActiveSessionsForSalon(
  salonKind: string,
): Promise<GetActiveSessionsResponse> {
  validateSalonKind(salonKind);
  const now = new Date();

  const sessions = await prisma.salonSession.findMany({
    where: {
      salonKind: salonKind as any,
      status: "ACTIVE",
      expiresAt: {
        gt: now,
      },
    },
    include: {
      participants: {
        where: { status: "ACTIVE" },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  pseudo: true,
                  gender: true,
                  avatarConfig: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { startedAt: "asc" },
  });

  return {
    sessions: sessions.map((s) => ({
      id: s.id,
      participantCount: s.participants.length,
      participants: s.participants.map((p) => ({
        userId: p.userId,
        pseudo: p.user.profile?.pseudo || "Unknown",
        gender: p.user.profile?.gender,
        avatarConfig: p.user.profile?.avatarConfig,
      })),
      isFull: s.participants.length >= 4,
      startedAt: s.startedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    })),
  };
}

// ============================================================
// Get participant counts for all salon kinds
// ============================================================
export async function getSalonCountersForAllKinds(): Promise<Record<string, number>> {
  const now = new Date();
  const salonKinds = ["PISCINE", "CAFE_DE_PARIS", "ILE_PIRATES", "THEATRE", "BAR_COCKTAILS", "METAL", "PSY"] as const;

  // Query all salons at once for efficiency
  const sessions = await prisma.salonSession.findMany({
    where: {
      salonKind: { in: salonKinds as any[] },
      status: "ACTIVE",
      expiresAt: { gt: now },
    },
    include: {
      participants: {
        where: { status: "ACTIVE" },
        select: { userId: true },
      },
    },
  });

  // Aggregate counts by salonKind
  const counters: Record<string, number> = {};
  for (const kind of salonKinds) {
    counters[kind] = 0;
  }

  for (const session of sessions) {
    counters[session.salonKind] += session.participants.length;
  }

  return counters;
}

// ============================================================
// Get session detail
// ============================================================
export async function getSessionDetail(
  sessionId: string,
): Promise<GetSessionDetailResponse> {
  const session = await prisma.salonSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: {
        where: { status: "ACTIVE" },
        select: {
          userId: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  pseudo: true,
                  gender: true,
                  avatarConfig: true,
                },
              },
            },
          },
        },
      },
      salon: {
        select: {
          kind: true,
          name: true,
        },
      },
    },
  });

  if (!session) {
    throw new NotFoundError("SalonSession");
  }

  return {
    id: session.id,
    salonKind: session.salonKind,
    salonName: session.salon.name,
    status: session.status,
    participantCount: session.participants.length,
    participants: session.participants.map((p) => ({
      userId: p.userId,
      pseudo: p.user.profile?.pseudo || "Unknown",
      gender: p.user.profile?.gender,
      avatarConfig: p.user.profile?.avatarConfig,
      joinedAt: p.joinedAt.toISOString(),
    })),
    startedAt: session.startedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

// ============================================================
// Join session (FIFO logic)
// ============================================================
export async function joinSession(
  userId: string,
  salonKind: string,
): Promise<JoinSessionResponse> {
  validateSalonKind(salonKind);
  const now = new Date();

  // Verify Salon exists
  const salon = await prisma.salon.findUnique({
    where: { kind: salonKind as any },
  });

  if (!salon) {
    throw new NotFoundError(`Salon not found for kind: ${salonKind}`);
  }

  // Check if user already in an active session for this salon
  const existingParticipation = await prisma.salonSessionParticipant.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      session: {
        salonKind: salonKind as any,
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
    },
    select: { sessionId: true },
  });

  if (existingParticipation) {
    // User already in this salon — return session detail instead of error
    // (idempotent behavior: rejoin returns same session)
    return getSessionDetail(existingParticipation.sessionId);
  }

  // Enforce rule: User cannot be in more than one salon at a time
  // Check if user is in an active session for a DIFFERENT salon
  const differentSalonParticipation = await prisma.salonSessionParticipant.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      session: {
        status: "ACTIVE",
        expiresAt: { gt: now },
        NOT: {
          salonKind: salonKind as any,
        },
      },
    },
  });

  if (differentSalonParticipation) {
    throw new ConflictError(
      "Vous êtes déjà dans un salon. Quittez-le avant d'en rejoindre un autre."
    );
  }

  // Find first active session with < 4 participants
  const availableSession = await prisma.salonSession.findFirst({
    where: {
      salonKind: salonKind as any,
      status: "ACTIVE",
      expiresAt: { gt: now },
    },
    include: {
      participants: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
    orderBy: { startedAt: "asc" },
  });

  let sessionId: string;

  if (availableSession && availableSession.participants.length < 4) {
    // Join existing session
    sessionId = availableSession.id;
  } else {
    // Create new session (7 days from now)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const newSession = await prisma.salonSession.create({
      data: {
        salonKind: salonKind as any,
        expiresAt: sevenDaysFromNow,
        status: "ACTIVE",
      },
    });
    sessionId = newSession.id;
  }

  // Add participant
  await prisma.salonSessionParticipant.create({
    data: {
      sessionId,
      userId,
      status: "ACTIVE",
    },
  });

  // Return session detail
  return getSessionDetail(sessionId);
}

// ============================================================
// Leave session
// ============================================================
export async function leaveSession(
  sessionId: string,
  userId: string,
): Promise<LeaveSessionResponse> {
  const participant = await prisma.salonSessionParticipant.findUnique({
    where: {
      sessionId_userId: { sessionId, userId },
    },
  });

  if (!participant) {
    throw new NotFoundError("SalonSessionParticipant");
  }

  if (participant.status === "LEFT") {
    throw new BadRequestError("User already left this session");
  }

  // Mark as left
  await prisma.salonSessionParticipant.update({
    where: {
      sessionId_userId: { sessionId, userId },
    },
    data: {
      status: "LEFT",
      leftAt: new Date(),
    },
  });

  return { success: true };
}

// ============================================================
// Get current session (helper)
// ============================================================
export async function getCurrentSession(
  userId: string,
  salonKind: string,
): Promise<string | null> {
  validateSalonKind(salonKind);
  const now = new Date();

  const participant = await prisma.salonSessionParticipant.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      session: {
        salonKind: salonKind as any,
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
    },
    select: { sessionId: true },
  });

  return participant?.sessionId ?? null;
}

// ============================================================
// Get current active session (any salon)
// ============================================================
export interface CurrentActiveSessionResponse {
  sessionId: string;
  salonKind: string;
  salonId: string;
  salonName: string;
}

export async function getCurrentActiveSession(
  userId: string,
): Promise<CurrentActiveSessionResponse | null> {
  const now = new Date();

  const participant = await prisma.salonSessionParticipant.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      session: {
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
    },
    include: {
      session: {
        select: {
          id: true,
          salonKind: true,
          salon: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!participant) {
    return null;
  }

  return {
    sessionId: participant.session.id,
    salonKind: participant.session.salonKind,
    salonId: participant.session.salon.id,
    salonName: participant.session.salon.name,
  };
}

// ============================================================
// Get previous encounters (meeting memory)
// ============================================================
export async function getPreviousEncounters(
  userId: string,
  salonKind: string,
): Promise<GetPreviousEncountersResponse> {
  validateSalonKind(salonKind);
  const encounters = await prisma.salonEncounter.findMany({
    where: {
      session: {
        salonKind: salonKind as any,
      },
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: {
        select: {
          id: true,
          profile: {
            select: {
              pseudo: true,
              gender: true,
              avatarConfig: true,
            },
          },
        },
      },
      user2: {
        select: {
          id: true,
          profile: {
            select: {
              pseudo: true,
              gender: true,
              avatarConfig: true,
            },
          },
        },
      },
    },
    orderBy: { metAt: "desc" },
  });

  const otherUsers = encounters.map((e) => {
    const other = e.user1Id === userId ? e.user2 : e.user1;
    return {
      userId: other.id,
      pseudo: other.profile?.pseudo || "Unknown",
      gender: other.profile?.gender,
      avatarConfig: other.profile?.avatarConfig,
      metAt: (e.user1Id === userId ? e.metAt : e.metAt).toISOString(),
    };
  });

  return {
    encounters: otherUsers,
  };
}

// ============================================================
// Record encounter (tracking pairs)
// ============================================================
export async function recordEncounter(
  sessionId: string,
  user1Id: string,
  user2Id: string,
): Promise<void> {
  // Ensure consistent ordering (user1Id < user2Id)
  const [orderedUser1, orderedUser2] =
    user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

  // Upsert to handle idempotency
  await prisma.salonEncounter.upsert({
    where: {
      sessionId_user1Id_user2Id: {
        sessionId,
        user1Id: orderedUser1,
        user2Id: orderedUser2,
      },
    },
    update: {}, // Do nothing if already exists
    create: {
      sessionId,
      user1Id: orderedUser1,
      user2Id: orderedUser2,
    },
  });
}

// ============================================================
// Expire old sessions (cron job)
// ============================================================
export async function expireOldSessions(): Promise<{ expired: number }> {
  const now = new Date();

  const result = await prisma.salonSession.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
    data: {
      status: "EXPIRED",
    },
  });

  return { expired: result.count };
}
