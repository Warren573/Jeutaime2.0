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
      salonKind: { in: [...salonKinds] },
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
    const salonKind = session.salonKind;
    if (salonKind && counters[salonKind] !== undefined) {
      counters[salonKind]! += session.participants.length;
    }
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
          id: true,
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
    salonId: session.salon.id,
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
  console.log(`[JOIN-SESSION-START] userId: ${userId}, salonKind: ${salonKind}`);

  validateSalonKind(salonKind);
  const now = new Date();

  // Verify Salon exists
  const salon = await prisma.salon.findUnique({
    where: { kind: salonKind as any },
  });

  console.log(`[JOIN-SESSION] Salon lookup: kind=${salonKind}, found=${!!salon}, name=${salon?.name || 'NOT_FOUND'}`);

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
    console.log(`[JOIN-SESSION] User already in this salon: sessionId=${existingParticipation.sessionId}`);
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
    console.log(`[JOIN-SESSION] User already in different salon, auto-quitting old session`);
    await prisma.salonSessionParticipant.update({
      where: { id: differentSalonParticipation.id },
      data: { status: "LEFT", leftAt: now },
    });
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
    sessionId = availableSession.id;
    console.log(`[JOIN-SESSION] Joining existing session: sessionId=${sessionId}, currentParticipants=${availableSession.participants.length}`);
  } else {
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const newSession = await prisma.salonSession.create({
      data: {
        salonKind: salonKind as any,
        expiresAt: sevenDaysFromNow,
        status: "ACTIVE",
      },
    });
    sessionId = newSession.id;
    console.log(`[JOIN-SESSION] Created new session: sessionId=${sessionId}, salonKind=${salonKind}`);
  }

  // Check if participant exists before upsert
  const existingParticipant = await prisma.salonSessionParticipant.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });

  console.log(
    `[JOIN-SESSION] Existing participant: ${
      existingParticipant
        ? `id=${existingParticipant.id}, status=${existingParticipant.status}`
        : "NONE"
    }`,
  );

  // Determine if we should create a welcome message:
  // - If participant doesn't exist (new join to this session)
  // - If participant exists but status=LEFT (reactivation in this session)
  const shouldCreateWelcome =
    !existingParticipant || existingParticipant.status === "LEFT";

  // Upsert participant: create if not exists, reactivate if LEFT
  console.log(`[JOIN-SESSION] Upserting participant: sessionId=${sessionId}, userId=${userId}`);
  const participant = await prisma.salonSessionParticipant.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    update: {
      status: "ACTIVE",
      leftAt: null,
    },
    create: {
      sessionId,
      userId,
      status: "ACTIVE",
    },
  });
  console.log(
    `[JOIN-SESSION] Participant upserted: id=${participant.id}, status=${participant.status}, shouldCreateWelcome=${shouldCreateWelcome}`,
  );

  // Create welcome system message for new joins or reactivations
  if (shouldCreateWelcome) {
    try {
      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profile: { select: { pseudo: true } } },
      });
      const pseudo = user?.profile?.pseudo || "Unknown";

      // Check if welcome message already exists for this user in this session
      const existingWelcome = await prisma.salonMessage.findFirst({
        where: {
          salonId: salon.id,
          sessionId,
          userId,
          kind: "system",
          meta: { path: ["type"], equals: "welcome" },
        },
      });

      if (existingWelcome) {
        console.log(
          `[WELCOME-MESSAGE] already exists: id=${existingWelcome.id}, sessionId=${sessionId}, userId=${userId}`,
        );
      } else {
        // Create the welcome message
        const hour = new Date().getHours();
        const greeting = hour >= 18 ? "bonsoir" : "bonjour";
        const welcomeContent = `👋 Bienvenue à ${pseudo}, dites-lui ${greeting}`;

        console.log(
          `[WELCOME-MESSAGE] creating: sessionId=${sessionId}, salonId=${salon.id}, userId=${userId}, pseudo=${pseudo}`,
        );

        const msg = await prisma.salonMessage.create({
          data: {
            salonId: salon.id,
            sessionId,
            userId,
            kind: "system",
            content: welcomeContent,
            meta: { type: "welcome", joinedUserId: userId, sessionId },
          },
        });

        console.log(
          `[WELCOME-MESSAGE] created: id=${msg.id}, sessionId=${msg.sessionId}, salonId=${msg.salonId}, kind=${msg.kind}`,
        );
      }
    } catch (err) {
      console.error(
        `[WELCOME-MESSAGE] ERROR:`,
        err instanceof Error ? err.message : err,
      );
      if (err instanceof Error && err.stack) {
        console.error(err.stack);
      }
    }
  } else {
    console.log(
      `[JOIN-SESSION] Skipping welcome message (participant already ACTIVE)`,
    );
  }

  // Return session detail
  const response = await getSessionDetail(sessionId);
  console.log(`[JOIN-SESSION-END] Returning session: id=${response.id}, participants=${response.participants.length}`);
  return response;
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

// ============================================================
// DEBUG: Get all salons
// ============================================================
export async function getAllSalons() {
  const salons = await prisma.salon.findMany({
    orderBy: { order: "asc" },
  });
  return {
    count: salons.length,
    salons: salons.map((s) => ({
      kind: s.kind,
      name: s.name,
      order: s.order,
    })),
  };
}

// ============================================================
// Perform drink action
// ============================================================
export async function performDrinkAction(
  sessionId: string,
  userId: string,
): Promise<{ success: boolean; level: number }> {
  // Verify user is a participant in the session
  const participant = await prisma.salonSessionParticipant.findUnique({
    where: {
      sessionId_userId: { sessionId, userId },
    },
  });

  if (!participant || participant.status !== "ACTIVE") {
    throw new BadRequestError("User is not an active participant in this session");
  }

  // Get session and salon info
  const session = await prisma.salonSession.findUnique({
    where: { id: sessionId },
    select: { salonKind: true, salonId: true },
  });

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  // Get user info for message
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profile: { select: { pseudo: true } } },
  });
  const pseudo = user?.profile?.pseudo || "Unknown";

  // Create system message
  try {
    await prisma.salonMessage.create({
      data: {
        salonId: session.salonId,
        sessionId,
        userId,
        kind: "system",
        content: `Glouglou 🍻 ${pseudo} a bu une boisson`,
      },
    });
  } catch (err) {
    console.error(`[DRINK-ACTION] Error creating message: ${err}`);
    // Don't fail if message creation fails
  }

  return { success: true, level: Date.now() };
}

// ============================================================
// Perform eat action
// ============================================================
export async function performEatAction(
  sessionId: string,
  userId: string,
): Promise<{ success: boolean; level: number }> {
  // Verify user is a participant in the session
  const participant = await prisma.salonSessionParticipant.findUnique({
    where: {
      sessionId_userId: { sessionId, userId },
    },
  });

  if (!participant || participant.status !== "ACTIVE") {
    throw new BadRequestError("User is not an active participant in this session");
  }

  // Get session and salon info
  const session = await prisma.salonSession.findUnique({
    where: { id: sessionId },
    select: { salonKind: true, salonId: true },
  });

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  // Get user info for message
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profile: { select: { pseudo: true } } },
  });
  const pseudo = user?.profile?.pseudo || "Unknown";

  // Create system message
  try {
    await prisma.salonMessage.create({
      data: {
        salonId: session.salonId,
        sessionId,
        userId,
        kind: "system",
        content: `Miam 😋 ${pseudo} a mangé quelque chose`,
      },
    });
  } catch (err) {
    console.error(`[EAT-ACTION] Error creating message: ${err}`);
    // Don't fail if message creation fails
  }

  return { success: true, level: Date.now() };
}

// ============================================================
// DEBUG: Reseed salons (ensure all 7 exist)
// ============================================================
export async function reseedSalons() {
  const salonKinds = ["PISCINE", "CAFE_DE_PARIS", "ILE_PIRATES", "THEATRE", "BAR_COCKTAILS", "METAL", "PSY"] as const;

  const salonData = [
    { kind: "PISCINE", name: "La Piscine", description: "Un espace aquatique pour des rencontres rafraîchissantes", magicAction: "plonger", gradStart: "#4FACFE", gradEnd: "#00F2FE" },
    { kind: "CAFE_DE_PARIS", name: "Café de Paris", description: "L'élégance parisienne pour des discussions raffinées", magicAction: "trinquer", gradStart: "#F093FB", gradEnd: "#F5576C" },
    { kind: "ILE_PIRATES", name: "Île des Pirates", description: "L'aventure et le mystère au bout des flots", magicAction: "embarquer", gradStart: "#4E54C8", gradEnd: "#8F94FB" },
    { kind: "THEATRE", name: "Le Théâtre", description: "Le grand spectacle de la vie et des émotions", magicAction: "monter sur scène", gradStart: "#667EEA", gradEnd: "#764BA2" },
    { kind: "BAR_COCKTAILS", name: "Bar à Cocktails", description: "Des saveurs et des bulles pour une ambiance festive", magicAction: "shaker", gradStart: "#FA709A", gradEnd: "#FEE140" },
    { kind: "METAL", name: "Le Métal", description: "Pour les âmes rebelles et les esprits libres", magicAction: "headbanger", gradStart: "#434343", gradEnd: "#000000" },
    { kind: "PSY", name: "Cabinet du Psy", description: "On y sert des mojitos aussi", magicAction: "analyser", gradStart: "#00BCD4", gradEnd: "#0097A7" },
  ];

  let created = 0;
  for (let i = 0; i < salonData.length; i++) {
    const s = salonData[i]!;
    await prisma.salon.upsert({
      where: { kind: s.kind as any },
      update: {
        name: s.name,
        description: s.description,
        magicAction: s.magicAction,
        primaryColor: s.gradStart,
        secondaryColor: s.gradEnd,
        order: i,
      },
      create: {
        kind: s.kind as any,
        name: s.name,
        description: s.description,
        magicAction: s.magicAction,
        primaryColor: s.gradStart,
        secondaryColor: s.gradEnd,
        gradient: { start: s.gradStart, end: s.gradEnd },
        order: i,
        isActive: true,
      },
    });
    created++;
  }

  return { reseeded: created, salons: salonData.map(s => s.kind) };
}
