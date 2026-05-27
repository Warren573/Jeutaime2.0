import { prisma } from "../backend/src/config/prisma";

/**
 * Diagnostic script to identify exactly what's in the orphan profiles
 * Usage: npm run diagnose-orphans
 */
async function diagnoseOrphanProfiles() {
  const profileIds = [
    "cmp6wyz62000111ip6f7t8uge",
    "cmp6yvp0h000511ip6beq6xqr",
    "cmpdrwja80001iy9qc9sb1vkh",
  ];

  console.log("🔍 DIAGNOSTIC: Analyzing 3 orphan profiles\n");
  console.log("Profile IDs:", profileIds);
  console.log("=" + "=".repeat(79) + "\n");

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

  console.log(`Found ${profiles.length} profiles in DB\n`);

  const results = [];

  for (const profile of profiles) {
    console.log(`\n📋 PROFILE: ${profile.pseudo} (ID: ${profile.id})`);
    console.log("─".repeat(80));

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

    if (!user) {
      console.log("❌ USER NOT FOUND!");
      continue;
    }

    console.log(`  userId:           ${user.id}`);
    console.log(`  email:            ${user.email}`);
    console.log(`  pseudo:           ${profile.pseudo}`);
    console.log(`  showInDiscovery:  ${user.settings?.showInDiscovery}`);
    console.log(`  createdAt:        ${user.createdAt.toISOString()}`);
    console.log(`  bio:              ${profile.bio || "(empty)"}`);
    console.log(`  city:             ${profile.city || "(empty)"}`);
    console.log(`  isBanned:         ${user.isBanned}`);

    // Check for reactions/matches
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

    console.log(`  reactionCount:    ${reactionCount}`);
    console.log(`  matchCount:       ${matchCount}`);

    // Determine if test account
    const isTestEmail = user.email?.includes(".test");
    const isTestBio = profile.bio?.toLowerCase().includes("test");
    const isTestPseudo = profile.pseudo?.toLowerCase().includes("test");
    const isTestUserId = user.id.toLowerCase().includes("test");

    const isTestAccount = isTestEmail || isTestBio || isTestPseudo || isTestUserId;

    console.log(`\n  🔍 PATTERN ANALYSIS:`);
    console.log(`    isTestEmail:  ${isTestEmail} (contains ".test")`);
    console.log(`    isTestBio:    ${isTestBio} (contains "test")`);
    console.log(`    isTestPseudo: ${isTestPseudo} (contains "test")`);
    console.log(`    isTestUserId: ${isTestUserId} (contains "test")`);
    console.log(`    ➜ IS TEST ACCOUNT: ${isTestAccount ? "✅ YES" : "❌ NO"}`);

    results.push({
      profileId: profile.id,
      userId: user.id,
      email: user.email,
      pseudo: profile.pseudo,
      showInDiscovery: user.settings?.showInDiscovery,
      createdAt: user.createdAt.toISOString(),
      isTestAccount,
      reason: isTestAccount
        ? [
            isTestEmail && "email has .test",
            isTestBio && "bio contains test",
            isTestPseudo && "pseudo contains test",
            isTestUserId && "userId contains test",
          ]
            .filter(Boolean)
            .join(", ")
        : "no test patterns found",
    });
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n📊 SUMMARY:\n");

  const testAccounts = results.filter((r) => r.isTestAccount);
  const realAccounts = results.filter((r) => !r.isTestAccount);

  console.log(`Test Accounts (should be deleted): ${testAccounts.length}`);
  testAccounts.forEach((r) => {
    console.log(
      `  - ${r.userId} | ${r.email} | ${r.pseudo} | Reason: ${r.reason}`
    );
  });

  console.log(`\nReal Accounts (should NOT be deleted): ${realAccounts.length}`);
  realAccounts.forEach((r) => {
    console.log(`  - ${r.userId} | ${r.email} | ${r.pseudo}`);
  });

  // Output deletion strategy
  console.log("\n" + "=".repeat(80));
  console.log("\n🛠️  DELETION STRATEGY:\n");

  if (testAccounts.length > 0) {
    console.log("Test accounts to delete (userIds):");
    const testUserIds = testAccounts.map((r) => r.userId);
    console.log(`  [${testUserIds.map((id) => `"${id}"`).join(", ")}]`);

    console.log("\nSuggested Prisma deletion:");
    console.log(`
await prisma.user.deleteMany({
  where: { id: { in: ${JSON.stringify(testUserIds)} } }
});
    `);
  }

  if (realAccounts.length > 0) {
    console.log("\n⚠️  WARNING: Found real accounts mixed in!");
    console.log("These should NOT be deleted!");
    realAccounts.forEach((r) => {
      console.log(`  - ${r.userId}`);
    });
  }
}

diagnoseOrphanProfiles()
  .then(() => {
    console.log("\n✅ Diagnostic complete!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
