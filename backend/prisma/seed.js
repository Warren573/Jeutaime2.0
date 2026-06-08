/**
 * JeuTaime — Seed Script (JavaScript version for production runtime)
 * This is a pure JS version that doesn't require ts-node
 * It's executed by: node prisma/seed.js
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// ============================================================
// TEST USER
// ============================================================
const TEST_USER = {
  email: "test@jeutaime.com",
  password: "Test1234!",
  pseudo: "TestUser",
  birthDate: new Date("1995-06-15T00:00:00.000Z"),
  gender: "HOMME",
  city: "Paris",
};

// ============================================================
// SALONS (6 salons)
// ============================================================
const salons = [
  {
    kind: "PISCINE",
    name: "La Piscine",
    description: "Un espace aquatique pour des rencontres rafraîchissantes",
    magicAction: "plonger",
    gradient: { start: "#4FACFE", end: "#00F2FE" },
  },
  {
    kind: "CAFE_DE_PARIS",
    name: "Café de Paris",
    description: "L'élégance parisienne pour des discussions raffinées",
    magicAction: "trinquer",
    gradient: { start: "#F093FB", end: "#F5576C" },
  },
  {
    kind: "ILE_PIRATES",
    name: "Île des Pirates",
    description: "L'aventure et le mystère au bout des flots",
    magicAction: "embarquer",
    gradient: { start: "#4E54C8", end: "#8F94FB" },
  },
  {
    kind: "THEATRE",
    name: "Le Théâtre",
    description: "Le grand spectacle de la vie et des émotions",
    magicAction: "monter sur scène",
    gradient: { start: "#667EEA", end: "#764BA2" },
  },
  {
    kind: "BAR_COCKTAILS",
    name: "Bar à Cocktails",
    description: "Des saveurs et des bulles pour une ambiance festive",
    magicAction: "shaker",
    gradient: { start: "#FA709A", end: "#FEE140" },
  },
  {
    kind: "METAL",
    name: "Le Métal",
    description: "Pour les âmes rebelles et les esprits libres",
    magicAction: "headbanger",
    gradient: { start: "#434343", end: "#000000" },
  },
];

// ============================================================
// OFFERINGS (3 MVP items)
// ============================================================
const offeringCatalog = [
  { id: "off_biere", emoji: "🍺", name: "Bière pression", cost: 30, category: "BOISSON", durationMs: null, stackPriority: 1, salonOnly: null, consumptionMode: "SHARED" },
  { id: "off_fraises", emoji: "🍓", name: "Fraises", cost: 35, category: "NOURRITURE", durationMs: null, stackPriority: 1, salonOnly: null, consumptionMode: "SHARED" },
  { id: "off_bonbons", emoji: "🍬", name: "Bonbons", cost: 20, category: "NOURRITURE", durationMs: null, stackPriority: 1, salonOnly: null, consumptionMode: "SHARED" },
];

// ============================================================
// MAGIES (14 items)
// ============================================================
const magieCatalog = [
  { id: "mag_grenouille", emoji: "🐸", name: "Transformation Grenouille", cost: 100, durationSec: 120, type: "TRANSFORMATION", breakConditionId: "kiss" },
  { id: "mag_ane", emoji: "🫏", name: "Transformation Âne", cost: 80, durationSec: 90, type: "TRANSFORMATION", breakConditionId: "compliment" },
  { id: "mag_fantome", emoji: "👻", name: "Transformation Fantôme", cost: 120, durationSec: 60, type: "TRANSFORMATION", breakConditionId: "water" },
  { id: "mag_pirate", emoji: "🏴‍☠️", name: "Transformation Pirate", cost: 90, durationSec: 90, type: "TRANSFORMATION", breakConditionId: "dance" },
  { id: "mag_statue", emoji: "🗿", name: "Transformation Statue", cost: 110, durationSec: 120, type: "TRANSFORMATION", breakConditionId: "compliment" },
  { id: "mag_poule", emoji: "🐔", name: "Transformation Poule", cost: 70, durationSec: 60, type: "TRANSFORMATION", breakConditionId: "laughter" },
  { id: "mag_invisibilite", emoji: "🫥", name: "Invisibilité", cost: 150, durationSec: 120, type: "VISUAL_EFFECT", breakConditionId: "laughter" },
  { id: "mag_rockstar", emoji: "🎸", name: "Rockstar", cost: 130, durationSec: 90, type: "VISUAL_EFFECT", breakConditionId: "music" },
  { id: "mag_bisou", emoji: "💋", name: "Bisou (anti-grenouille)", cost: 20, durationSec: 0, type: "TRANSFORMATION", breakConditionId: null },
  { id: "mag_compliment", emoji: "👏", name: "Compliment", cost: 30, durationSec: 0, type: "TRANSFORMATION", breakConditionId: null },
  { id: "mag_eau", emoji: "💧", name: "Eau bénite", cost: 20, durationSec: 0, type: "TRANSFORMATION", breakConditionId: null },
  { id: "mag_danse", emoji: "💃", name: "Danse", cost: 25, durationSec: 0, type: "TRANSFORMATION", breakConditionId: null },
  { id: "mag_rire", emoji: "😂", name: "Fou rire", cost: 20, durationSec: 0, type: "TRANSFORMATION", breakConditionId: null },
  { id: "mag_musique", emoji: "🎵", name: "Mélodie apaisante", cost: 25, durationSec: 0, type: "VISUAL_EFFECT", breakConditionId: null },
];

// ============================================================
// PETS (10 items)
// ============================================================
const petCatalog = [
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

async function main() {
  try {
    console.log("[SEED] start");
    console.log("🌱 [SEED-START] Démarrage du seed JeuTaime...\n");

    // -- Salons --
    console.log("[SEED] seeding salons");
    for (let i = 0; i < salons.length; i++) {
      const salon = salons[i];
      await prisma.salon.upsert({
        where: { kind: salon.kind },
        update: {
          name: salon.name,
          description: salon.description,
          magicAction: salon.magicAction,
          gradient: salon.gradient,
          order: i,
        },
        create: {
          kind: salon.kind,
          name: salon.name,
          description: salon.description,
          magicAction: salon.magicAction,
          gradient: salon.gradient,
          order: i,
          primaryColor: salon.gradient.start,
          secondaryColor: salon.gradient.end,
        },
      });
    }
    console.log(`✅ [SEED-SALONS] ${salons.length} salons seedés`);

    // -- Offerings --
    console.log("[SEED] seeding offerings");
    for (const off of offeringCatalog) {
      await prisma.offeringCatalog.upsert({
        where: { id: off.id },
        update: {
          emoji: off.emoji,
          name: off.name,
          cost: off.cost,
          category: off.category,
          durationMs: off.durationMs,
          stackPriority: off.stackPriority,
          salonOnly: off.salonOnly,
          consumptionMode: off.consumptionMode,
        },
        create: {
          id: off.id,
          emoji: off.emoji,
          name: off.name,
          cost: off.cost,
          category: off.category,
          durationMs: off.durationMs,
          stackPriority: off.stackPriority,
          salonOnly: off.salonOnly,
          consumptionMode: off.consumptionMode,
        },
      });
    }
    console.log(`✅ [SEED-OFFERINGS] ${offeringCatalog.length} offrandes seedées (MVP)`);

    // -- Magies --
    console.log("[SEED] seeding magies");
    for (const mag of magieCatalog) {
      await prisma.magieCatalog.upsert({
        where: { id: mag.id },
        update: {
          emoji: mag.emoji,
          name: mag.name,
          cost: mag.cost,
          durationSec: mag.durationSec,
          type: mag.type,
          breakConditionId: mag.breakConditionId,
        },
        create: {
          id: mag.id,
          emoji: mag.emoji,
          name: mag.name,
          cost: mag.cost,
          durationSec: mag.durationSec,
          type: mag.type,
          breakConditionId: mag.breakConditionId,
        },
      });
    }
    console.log(`✅ [SEED-MAGIES] ${magieCatalog.length} magies seedées`);

    // -- Pets --
    console.log("[SEED] seeding pets");
    for (const pet of petCatalog) {
      await prisma.petCatalog.upsert({
        where: { id: pet.id },
        update: {
          name: pet.name,
          emoji: pet.emoji,
          cost: pet.cost,
        },
        create: {
          id: pet.id,
          name: pet.name,
          emoji: pet.emoji,
          cost: pet.cost,
        },
      });
    }
    console.log(`✅ [SEED-PETS] ${petCatalog.length} animaux seedés`);

    // -- Test account --
    const existingTest = await prisma.user.findUnique({
      where: { email: TEST_USER.email },
      select: { id: true },
    });

    if (existingTest) {
      console.log(`ℹ️  [SEED-TEST] Compte test déjà existant (${TEST_USER.email})`);
    } else {
      const passwordHash = await bcrypt.hash(TEST_USER.password, 10);
      await prisma.$transaction(async (tx) => {
        const testUser = await tx.user.create({
          data: { email: TEST_USER.email, passwordHash, isVerified: true },
        });

        await tx.profile.create({
          data: {
            userId: testUser.id,
            pseudo: TEST_USER.pseudo,
            birthDate: TEST_USER.birthDate,
            gender: TEST_USER.gender,
            city: TEST_USER.city,
            interestedIn: [],
            lookingFor: [],
            interests: [],
            bio: "Compte de test JeuTaime 🧪",
          },
        });

        await tx.wallet.create({
          data: { userId: testUser.id, coins: 9999 },
        });

        await tx.userSettings.create({
          data: { userId: testUser.id },
        });
      });

      console.log(`✅ [SEED-TEST] Compte test créé → ${TEST_USER.email} / ${TEST_USER.password}`);
    }

    console.log("[SEED] completed");
    console.log("\n🎉 [SEED-SUCCESS] Seed terminé avec succès !");
    process.exit(0);
  } catch (err) {
    console.error("❌ [SEED-ERROR] Erreur seed :", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
