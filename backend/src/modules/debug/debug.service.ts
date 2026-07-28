import { prisma } from "../../config/prisma";
import { execSync } from "child_process";
import { Prisma } from "@prisma/client";
import { SalonKind, OfferingCategory, MagieType } from "@prisma/client";

function getCommitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch {
    return "unknown";
  }
}

// Exact same data as in seed.ts (must match exactly)
const salonsData = [
  {
    kind: SalonKind.PISCINE,
    name: "La Piscine",
    description: "Un espace aquatique pour des rencontres rafraîchissantes",
    magicAction: "plonger",
    gradient: { start: "#4FACFE", end: "#00F2FE" },
  },
  {
    kind: SalonKind.CAFE_DE_PARIS,
    name: "Café de Paris",
    description: "L'élégance parisienne pour des discussions raffinées",
    magicAction: "trinquer",
    gradient: { start: "#F093FB", end: "#F5576C" },
  },
  {
    kind: SalonKind.ILE_PIRATES,
    name: "Île des Pirates",
    description: "L'aventure et le mystère au bout des flots",
    magicAction: "embarquer",
    gradient: { start: "#4E54C8", end: "#8F94FB" },
  },
  {
    kind: SalonKind.THEATRE,
    name: "Le Théâtre",
    description: "Le grand spectacle de la vie et des émotions",
    magicAction: "monter sur scène",
    gradient: { start: "#667EEA", end: "#764BA2" },
  },
  {
    kind: SalonKind.BAR_COCKTAILS,
    name: "Bar à Cocktails",
    description: "Des saveurs et des bulles pour une ambiance festive",
    magicAction: "shaker",
    gradient: { start: "#FA709A", end: "#FEE140" },
  },
  {
    kind: SalonKind.METAL,
    name: "Le Métal",
    description: "Pour les âmes rebelles et les esprits libres",
    magicAction: "headbanger",
    gradient: { start: "#434343", end: "#000000" },
  },
];

const magiesData = [
  { id: "mag_grenouille", emoji: "🐸", name: "Transformation Grenouille", cost: 100, durationSec: 120, type: MagieType.TRANSFORMATION, breakConditionId: "kiss" },
  { id: "mag_ane", emoji: "🫏", name: "Transformation Âne", cost: 80, durationSec: 90, type: MagieType.TRANSFORMATION, breakConditionId: "compliment" },
  { id: "mag_fantome", emoji: "👻", name: "Transformation Fantôme", cost: 120, durationSec: 60, type: MagieType.TRANSFORMATION, breakConditionId: "water" },
  { id: "mag_pirate", emoji: "🏴‍☠️", name: "Transformation Pirate", cost: 90, durationSec: 90, type: MagieType.TRANSFORMATION, breakConditionId: "dance" },
  { id: "mag_statue", emoji: "🗿", name: "Transformation Statue", cost: 110, durationSec: 120, type: MagieType.TRANSFORMATION, breakConditionId: "compliment" },
  { id: "mag_poule", emoji: "🐔", name: "Transformation Poule", cost: 70, durationSec: 60, type: MagieType.TRANSFORMATION, breakConditionId: "laughter" },
  { id: "mag_invisibilite", emoji: "🫥", name: "Invisibilité", cost: 150, durationSec: 120, type: MagieType.VISUAL_EFFECT, breakConditionId: "laughter" },
  { id: "mag_rockstar", emoji: "🎸", name: "Rockstar", cost: 130, durationSec: 90, type: MagieType.VISUAL_EFFECT, breakConditionId: "music" },
  { id: "mag_bisou", emoji: "💋", name: "Bisou (anti-grenouille)", cost: 20, durationSec: 0, type: MagieType.TRANSFORMATION, breakConditionId: null },
  { id: "mag_compliment", emoji: "👏", name: "Compliment", cost: 30, durationSec: 0, type: MagieType.TRANSFORMATION, breakConditionId: null },
  { id: "mag_eau", emoji: "💧", name: "Eau bénite", cost: 20, durationSec: 0, type: MagieType.TRANSFORMATION, breakConditionId: null },
  { id: "mag_danse", emoji: "💃", name: "Danse", cost: 25, durationSec: 0, type: MagieType.TRANSFORMATION, breakConditionId: null },
  { id: "mag_rire", emoji: "😂", name: "Fou rire", cost: 20, durationSec: 0, type: MagieType.TRANSFORMATION, breakConditionId: null },
  { id: "mag_musique", emoji: "🎵", name: "Mélodie apaisante", cost: 25, durationSec: 0, type: MagieType.VISUAL_EFFECT, breakConditionId: null },
];

const petsData = [
  { id: "pet_chat", name: "Chat", emoji: "🐱", cost: 300 },
  { id: "pet_chien", name: "Chien", emoji: "🐶", cost: 400 },
  { id: "pet_lapin", name: "Lapin", emoji: "🐰", cost: 350 },
  { id: "pet_renard", name: "Renard", emoji: "🦊", cost: 600 },
  { id: "pet_ours", name: "Ours", emoji: "🐻", cost: 800 },
  { id: "pet_dragon", name: "Dragon", emoji: "🐲", cost: 2000 },
  { id: "pet_licorne", name: "Licorne", emoji: "🦄", cost: 5000 },
  { id: "pet_pingouin", name: "Pingouin", emoji: "🐧", cost: 500 },
  { id: "pet_tigre", name: "Tigre", emoji: "🐯", cost: 1200 },
  { id: "pet_koala", name: "Koala", emoji: "🐨", cost: 700 },
];

export async function getStagingStatus() {
  const [salonCount, tableCheck, migrationsInfo] = await Promise.all([
    prisma.salon.count(),
    prisma.$queryRaw<Array<{ tablename: string }>>(
      Prisma.sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('WeeklyProfileDuel', 'WeeklyProfileVote')`
    ),
    // Check if _prisma_migrations exists and count rows
    (async () => {
      try {
        const result = await prisma.$queryRaw<Array<{ count: bigint }>>(
          Prisma.sql`SELECT COUNT(*) as count FROM "_prisma_migrations"`
        );
        return {
          exists: result.length > 0,
          count: result.length > 0 ? Number(result[0]!.count) : 0,
        };
      } catch {
        // Table does not exist
        return {
          exists: false,
          count: null as unknown as number,
        };
      }
    })(),
  ]);

  const commitSha = getCommitSha();
  const existingTables = new Set(tableCheck.map((t) => t.tablename));

  return {
    commit: commitSha,
    salons_count: salonCount,
    tables: {
      WeeklyProfileDuel: existingTables.has("WeeklyProfileDuel"),
      WeeklyProfileVote: existingTables.has("WeeklyProfileVote"),
    },
    migrations_table_exists: migrationsInfo.exists,
    migrations_count: migrationsInfo.exists ? migrationsInfo.count : null,
    timestamp: new Date().toISOString(),
  };
}

export async function getSeedSource() {
  return {
    seedDefinition: {
      salons: {
        count: salonsData.length,
        records: salonsData.map((s) => ({ kind: s.kind, name: s.name })),
      },
      magies: {
        count: magiesData.length,
        records: magiesData.map((m) => ({ id: m.id, name: m.name })),
      },
      pets: {
        count: petsData.length,
        records: petsData.map((p) => ({ id: p.id, name: p.name })),
      },
    },
    seedExecution: {
      seedFilePath: "/app/prisma/seed.ts or ./prisma/seed.ts",
      seedCommand: "prisma db seed",
      prismaSeedScript: "ts-node prisma/seed.ts",
      packageJsonSeed: { seed: "ts-node prisma/seed.ts" },
    },
    notes: {
      critical: "If seedDefinition counts don't match database counts, seed didn't execute.",
      issue: "migrations.count = 1 suggests DB never received full migration. Check if prisma migrate deploy completed.",
    },
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// Reset Test Users
// ============================================================
export async function resetTestUsers() {
  const preservedEmails = [
    "test@jeutaime.com",
    "doudou453@hotmail.fr",
  ];

  // Delete test users EXCEPT preserved ones
  const testUserEmails = [
    "testuser2@jeutaime.test",
    "testuser3@jeutaime.test",
    "testuser4@jeutaime.test",
    "testuser5@jeutaime.test",
    "testuser6@jeutaime.test",
    "testuser7@jeutaime.test",
    "testuser8@jeutaime.test",
    "testuser9@jeutaime.test",
    "testuser10@jeutaime.test",
    "testuser11@jeutaime.test",
  ];

  // Delete old test users
  await prisma.user.deleteMany({
    where: {
      email: { in: testUserEmails },
    },
  });

  // Recreate test users testuser2-testuser11
  const createdUsers = [];
  for (let i = 2; i <= 11; i++) {
    const email = `testuser${i}@jeutaime.test`;
    const pseudo = `testuser${i}`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: "$2b$10$YourHashedPasswordHere", // Dummy hash
        isVerified: true,
        profile: {
          create: {
            pseudo,
            birthDate: new Date("1995-01-01"),
            gender: "HOMME",
            city: "Paris",
          },
        },
        wallet: {
          create: {
            coins: 1000,
          },
        },
      },
    });
    createdUsers.push({ id: user.id, email, pseudo });
  }

  return {
    success: true,
    message: "Test users reset",
    preserved: preservedEmails,
    created: createdUsers,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// Reset Test Matches
// ============================================================
export async function resetTestMatches() {
  // Get test user IDs
  const testUsers = await prisma.user.findMany({
    where: {
      email: { endsWith: "@jeutaime.test" },
    },
    select: { id: true },
  });

  const testUserIds = testUsers.map((u) => u.id);

  if (testUserIds.length === 0) {
    return {
      success: true,
      message: "No test users found",
      matchesDeleted: 0,
      reactionsDeleted: 0,
      lettersDeleted: 0,
    };
  }

  // Delete matches involving test users
  const matchesDeleted = await prisma.match.deleteMany({
    where: {
      OR: [
        { userAId: { in: testUserIds } },
        { userBId: { in: testUserIds } },
      ],
    },
  });

  // Delete reactions involving test users
  const reactionsDeleted = await prisma.reaction.deleteMany({
    where: {
      OR: [
        { fromId: { in: testUserIds } },
        { toId: { in: testUserIds } },
      ],
    },
  });

  return {
    success: true,
    message: "Test matches reset",
    matchesDeleted: matchesDeleted.count,
    reactionsDeleted: reactionsDeleted.count,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// Reset Test Salons
// ============================================================
export async function resetTestSalons() {
  // Delete all session data
  const sessionsDeleted = await prisma.salonSession.deleteMany({});

  // Delete all messages in salons
  const messagesDeleted = await prisma.salonMessage.deleteMany({});

  // Delete all offerings sent (but keep catalog)
  const offeringsSent = await prisma.offeringSent.deleteMany({});

  // Delete all magies cast
  const magiesCast = await prisma.magieCast.deleteMany({});

  // Delete all encounters
  const encountersDeleted = await prisma.salonEncounter.deleteMany({});

  return {
    success: true,
    message: "Test salons reset",
    sessionsDeleted: sessionsDeleted.count,
    messagesDeleted: messagesDeleted.count,
    offeringsSentDeleted: offeringsSent.count,
    magiesCastDeleted: magiesCast.count,
    encountersDeleted: encountersDeleted.count,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// Reset Test Coins
// ============================================================
export async function resetTestCoins() {
  const testAccounts = [
    "test@jeutaime.com",
    "doudou453@hotmail.fr",
    "testuser2@jeutaime.test",
    "testuser3@jeutaime.test",
    "testuser4@jeutaime.test",
    "testuser5@jeutaime.test",
    "testuser6@jeutaime.test",
    "testuser7@jeutaime.test",
    "testuser8@jeutaime.test",
    "testuser9@jeutaime.test",
    "testuser10@jeutaime.test",
    "testuser11@jeutaime.test",
  ];

  // Find all test users
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: testAccounts } },
        { email: { contains: "test_mutual_" } },
        { email: { endsWith: "@jeutaime.test" } },
      ],
    },
    select: { id: true, email: true },
  });

  const userIds = testUsers.map((u) => u.id);
  const updatedCount = userIds.length;

  // Reset all wallets to exactly 1000 coins
  for (const userId of userIds) {
    await prisma.wallet.upsert({
      where: { userId },
      create: {
        userId,
        coins: 1000,
      },
      update: {
        coins: 1000,
      },
    });
  }

  return {
    success: true,
    message: "Test coins reset to 1000",
    accountsUpdated: updatedCount,
    accounts: testUsers.map((u) => u.email),
    timestamp: new Date().toISOString(),
  };
}

