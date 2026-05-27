import { prisma } from "../backend/src/config/prisma";

/**
 * Identify mysterious profiles that are still visible in discovery
 * Usage: npx ts-node scripts/identify-orphan-profiles.ts
 */
async function identifyOrphanProfiles() {
  const profileIds = [
    "cmp6wyz62000111ip6f7t8uge",
    "cmp6yvp0h000511ip6beq6xqr",
    "cmpdrwja80001iy9qc9sb1vkh",
  ];

  console.log("🔍 Identifying orphan profiles...\n");

  const profiles = await prisma.profile.findMany({
    where: { id: { in: profileIds } },
    select: {
      id: true,
      userId: true,
      pseudo: true,
      gender: true,
      city: true,
      birthDate: true,
      bio: true,
    },
  });

  for (const profile of profiles) {
    console.log(`\n📋 Profile: ${profile.pseudo} (${profile.id})`);
    console.log(`   User ID: ${profile.userId}`);
    console.log(`   Bio: ${profile.bio || "(empty)"}`);

    const user = await prisma.user.findUnique({
      where: { id: profile.userId },
      select: {
        id: true,
        email: true,
        isBanned: true,
        createdAt: true,
        settings: { select: { showInDiscovery: true } },
      },
    });

    if (user) {
      console.log(`   Email: ${user.email}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log(`   Banned: ${user.isBanned}`);
      console.log(`   Show in Discovery: ${user.settings?.showInDiscovery}`);
    }

    const reactionCount = await prisma.reaction.count({
      where: {
        OR: [{ fromId: profile.userId }, { toId: profile.userId }],
      },
    });

    const matchCount = await prisma.match.count({
      where: {
        OR: [{ userAId: profile.userId }, { userBId: profile.userId }],
      },
    });

    console.log(`   Reactions: ${reactionCount}`);
    console.log(`   Matches: ${matchCount}`);

    const isTestAccount =
      profile.pseudo?.startsWith("test_") || profile.userId?.startsWith("test-");
    console.log(`   ✓ Is Test Account: ${isTestAccount}`);
  }

  // Check if any test-pattern profiles exist
  console.log("\n\n📊 Summary of all staging profiles with test patterns:");
  const testPatterns = await prisma.profile.findMany({
    where: {
      OR: [{ pseudo: { startsWith: "test_" } }, { pseudo: { startsWith: "test-" } }],
    },
    select: { id: true, pseudo: true, userId: true },
  });

  console.log(`Found ${testPatterns.length} profiles with test patterns:`, testPatterns);

  // Also check for users with test- prefix
  const testUsers = await prisma.user.findMany({
    where: { id: { startsWith: "test-" } },
    select: { id: true },
  });

  console.log(`Found ${testUsers.length} users with test- prefix:`, testUsers);

  console.log("\n\n✅ Diagnosis complete. Review above to determine if profiles should be cleaned.");
}

identifyOrphanProfiles()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
