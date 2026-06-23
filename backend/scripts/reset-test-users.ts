/**
 * Reset Test Users Script
 *
 * STAGING & DEVELOPMENT ONLY
 *
 * Mission:
 * 1. Supprimer tous les comptes test temporaires (test-mutual-a/b)
 * 2. Conserver: TestUser (test@jeutaime.com) et Doudou (doudou453@hotmail.fr)
 * 3. Créer 10 nouveaux comptes de test avec profils complets
 */

import { PrismaClient, Gender } from "@prisma/client";
import { hashPassword } from "../src/core/utils/hash";

const prisma = new PrismaClient();

const PRESERVE_USERS = [
  "test@jeutaime.com",
  "doudou453@hotmail.fr",
];

const NEW_TEST_USERS = [
  {
    email: "testuser2@jeutaime.test",
    password: "Test2024!",
    pseudo: "testuser2",
    gender: Gender.HOMME,
    city: "Lyon",
    bio: "Passionné par les voyages et les rencontres authentiques",
  },
  {
    email: "testuser3@jeutaime.test",
    password: "Test2024!",
    pseudo: "testuser3",
    gender: Gender.FEMME,
    city: "Marseille",
    bio: "Amoureuse de musique, de culture et de belles discussions",
  },
  {
    email: "testuser4@jeutaime.test",
    password: "Test2024!",
    pseudo: "testuser4",
    gender: Gender.HOMME,
    city: "Toulouse",
    bio: "Sportif, aventurier, j'aime les gens authentiques",
  },
  {
    email: "testuser5@jeutaime.test",
    password: "Test2024!",
    pseudo: "testuser5",
    gender: Gender.FEMME,
    city: "Bordeaux",
    bio: "Créative, artiste, toujours en quête d'inspiration",
  },
  {
    email: "testuser6@jeutaime.test",
    password: "Test2024!",
    pseudo: "testuser6",
    gender: Gender.HOMME,
    city: "Nice",
    bio: "Entrepreneur passionné, aimant discuter de projets et rêves",
  },
  {
    email: "testuser7@jeutaime.test",
    password: "Test2024!",
    pseudo: "testuser7",
    gender: Gender.FEMME,
    city: "Nantes",
    bio: "Professionnelle dynamique cherchant une relation sérieuse",
  },
  {
    email: "testuser8@jeutaime.test",
    password: "Test2024!",
    pseudo: "testuser8",
    gender: Gender.HOMME,
    city: "Strasbourg",
    bio: "Curieux de nature, j'aime apprendre et partager",
  },
  {
    email: "testuser9@jeutaime.test",
    password: "Test2024!",
    pseudo: "testuser9",
    gender: Gender.FEMME,
    city: "Lille",
    bio: "Optimiste, rieuse, amie sincère avant tout",
  },
  {
    email: "testuser10@jeutaime.test",
    password: "Test2024!",
    pseudo: "testuser10",
    gender: Gender.HOMME,
    city: "Rennes",
    bio: "Amoureux de la nature et des rencontres sincères",
  },
  {
    email: "testuser11@jeutaime.test",
    password: "Test2024!",
    pseudo: "testuser11",
    gender: Gender.FEMME,
    city: "Montpellier",
    bio: "Passionnée par la vie, toujours souriante et enthousiaste",
  },
];

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║     RESET TEST USERS - STAGING/DEV ONLY               ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // Step 1: Find test users to delete
  console.log("📋 Étape 1: Identification des comptes à supprimer...\n");

  const testMutualUsers = await prisma.user.findMany({
    where: {
      OR: [
        { id: { startsWith: "test-mutual-a-" } },
        { id: { startsWith: "test-mutual-b-" } },
      ],
    },
    select: { id: true, email: true },
  });

  console.log(`   Trouvés: ${testMutualUsers.length} comptes test-mutual-*`);
  testMutualUsers.forEach((u) => {
    console.log(`   - ${u.email} (${u.id})`);
  });

  const userIdsToDelete = testMutualUsers.map((u) => u.id);

  // Step 2: Verify preservation users exist
  console.log("\n🔒 Étape 2: Vérification des comptes à conserver...\n");

  const preservedUsers = await prisma.user.findMany({
    where: { email: { in: PRESERVE_USERS } },
    select: { id: true, email: true },
  });

  console.log(`   Conservés: ${preservedUsers.length}/${PRESERVE_USERS.length}`);
  preservedUsers.forEach((u) => {
    console.log(`   ✅ ${u.email}`);
  });

  // Safety check
  if (preservedUsers.length !== PRESERVE_USERS.length) {
    const missing = PRESERVE_USERS.filter(
      (email) => !preservedUsers.find((u) => u.email === email)
    );
    throw new Error(`❌ ERREUR: Comptes à conserver manquants: ${missing.join(", ")}`);
  }

  // Step 3: Show deletion summary
  console.log("\n🗑️  Étape 3: Résumé des suppressions\n");

  if (userIdsToDelete.length > 0) {
    console.log(`   ${userIdsToDelete.length} compte(s) à supprimer:`);
    testMutualUsers.forEach((u) => {
      console.log(`   - ${u.email}`);
    });

    // Delete in correct order (respecting FK constraints)
    console.log("\n   Suppression en cours...");

    await prisma.reaction.deleteMany({
      where: { OR: [{ fromId: { in: userIdsToDelete } }, { toId: { in: userIdsToDelete } }] },
    });
    console.log("   ✓ Reactions supprimées");

    await prisma.match.deleteMany({
      where: {
        OR: [{ userAId: { in: userIdsToDelete } }, { userBId: { in: userIdsToDelete } }],
      },
    });
    console.log("   ✓ Matches supprimés");

    await prisma.letter.deleteMany({
      where: {
        OR: [{ fromUserId: { in: userIdsToDelete } }, { toUserId: { in: userIdsToDelete } }],
      },
    });
    console.log("   ✓ Letters supprimées");

    await prisma.offeringSent.deleteMany({
      where: {
        OR: [{ fromUserId: { in: userIdsToDelete } }, { toUserId: { in: userIdsToDelete } }],
      },
    });
    console.log("   ✓ OfferingsSent supprimées");

    await prisma.block.deleteMany({
      where: {
        OR: [{ fromId: { in: userIdsToDelete } }, { toId: { in: userIdsToDelete } }],
      },
    });
    console.log("   ✓ Blocks supprimés");

    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIdsToDelete } },
    });
    console.log("   ✓ RefreshTokens supprimés");

    await prisma.photo.deleteMany({
      where: { userId: { in: userIdsToDelete } },
    });
    console.log("   ✓ Photos supprimées");

    await prisma.pet.deleteMany({
      where: { userId: { in: userIdsToDelete } },
    });
    console.log("   ✓ Pets supprimés");

    await prisma.wallet.deleteMany({
      where: { userId: { in: userIdsToDelete } },
    });
    console.log("   ✓ Wallets supprimés");

    await prisma.userSettings.deleteMany({
      where: { userId: { in: userIdsToDelete } },
    });
    console.log("   ✓ UserSettings supprimés");

    await prisma.profile.deleteMany({
      where: { userId: { in: userIdsToDelete } },
    });
    console.log("   ✓ Profiles supprimés");

    await prisma.user.deleteMany({
      where: { id: { in: userIdsToDelete } },
    });
    console.log("   ✓ Users supprimés");

    console.log(`\n   ✅ ${userIdsToDelete.length} compte(s) supprimé(s)`);
  } else {
    console.log("   Aucun compte à supprimer");
  }

  // Step 4: Create new test users
  console.log("\n✨ Étape 4: Création des 10 nouveaux comptes de test\n");

  const created = [];

  for (const testUser of NEW_TEST_USERS) {
    const passwordHash = await hashPassword(testUser.password);

    const newUser = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash,
        isVerified: true,
        role: "USER",
        profile: {
          create: {
            pseudo: testUser.pseudo,
            gender: testUser.gender,
            birthDate: new Date("1990-01-01"),
            city: testUser.city,
            bio: testUser.bio,
            interestedIn: ["FEMME", "HOMME", "AUTRE"],
            lookingFor: ["RELATION"],
            interests: [],
            physicalDesc: "moyenne",
            avatarConfig: {},
          },
        },
        settings: {
          create: {
            showInDiscovery: true,
            showPhotoByDefault: true,
          },
        },
        wallet: {
          create: {
            coins: 100,
          },
        },
      },
      include: { profile: true },
    }) as any;

    created.push({
      email: newUser.email,
      pseudo: (newUser as any).profile?.pseudo,
      userId: newUser.id,
    });

    console.log(`   ✅ ${testUser.pseudo} (${testUser.email})`);
  }

  // Step 5: Final summary
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║              RÉSUMÉ FINAL                              ║");
  console.log("╠════════════════════════════════════════════════════════╣");

  console.log(`║ ✅ Comptes supprimés: ${userIdsToDelete.length}`);
  console.log(`║ ✅ Comptes conservés: ${preservedUsers.length}`);
  console.log(`║ ✅ Comptes créés: ${created.length}`);

  const totalUsers = preservedUsers.length + created.length;
  console.log(`║ 📊 Total utilisateurs test: ${totalUsers}`);

  console.log("╠════════════════════════════════════════════════════════╣");
  console.log("║ UTILISATEURS FINAUX:                                   ║");
  console.log("╠════════════════════════════════════════════════════════╣");

  console.log("║ Conservés:                                             ║");
  preservedUsers.forEach((u) => {
    console.log(`║   • ${u.email}`);
  });

  console.log("║                                                        ║");
  console.log("║ Créés:                                                 ║");
  created.forEach((u) => {
    console.log(`║   • ${u.pseudo} (${u.email})`);
  });

  console.log("╚════════════════════════════════════════════════════════╝\n");

  return { deleted: userIdsToDelete.length, created: created.length, preserved: preservedUsers.length };
}

main()
  .catch((e) => {
    console.error("\n❌ ERREUR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
