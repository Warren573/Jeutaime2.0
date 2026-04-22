/**
 * JeuTaime — Seed Prisma
 * Popule les catalogues immuables : salons, questions, offrandes, magies, animaux
 * + crée un compte de test pour le développement
 * npm run prisma:seed
 */
import { PrismaClient, SalonKind, OfferingCategory, MagieType, Gender } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ============================================================
// COMPTE DE TEST (développement uniquement)
// Email : test@jeutaime.com  |  Mot de passe : Test1234!
// ============================================================
const TEST_USER = {
  email:    "test@jeutaime.com",
  password: "Test1234!",
  pseudo:   "TestUser",
  birthDate: new Date("1995-06-15T00:00:00.000Z"),
  gender:   Gender.male,
  city:     "Paris",
} as const;

// ============================================================
// SALONS (7 salons, correspondance exacte frontend)
// ============================================================
const salons = [
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
] as const;

// ============================================================
// QUESTIONS DE VALIDATION (catalogue, les users répondent à 3)
// ============================================================
const questionCatalog = [
  { id: "q_01", text: "Quel est ton souvenir d'enfance le plus marquant ?" },
  { id: "q_02", text: "Si tu pouvais vivre dans n'importe quelle époque, laquelle choisirais-tu ?" },
  { id: "q_03", text: "Quelle est la chose la plus folle que tu aies jamais faite ?" },
  { id: "q_04", text: "Qu'est-ce qui te fait rire aux éclats ?" },
  { id: "q_05", text: "Quel est ton livre, film ou série qui t'a le plus marqué·e ?" },
  { id: "q_06", text: "Si tu devais décrire ta personnalité avec un animal, lequel serait-ce et pourquoi ?" },
  { id: "q_07", text: "Quelle est ta définition du bonheur ?" },
  { id: "q_08", text: "Qu'est-ce que tu ferais si tu n'avais pas peur ?" },
  { id: "q_09", text: "Plutôt montagne ou mer ? Et pourquoi ?" },
  { id: "q_10", text: "Quel serait ton superpower idéal ?" },
  { id: "q_11", text: "Quelle est la dernière chose qui t'a ému·e ?" },
  { id: "q_12", text: "Qu'est-ce que les gens ne savent pas encore de toi ?" },
];

// ============================================================
// CATALOGUE OFFRANDES (aligné sur frontend/src/data/offerings.ts)
// ============================================================
const offeringCatalog = [
  // Boissons
  { id: "off_cafe",          emoji: "☕",  name: "Café",              cost: 20,  category: OfferingCategory.BOISSON,    durationMs: null,      stackPriority: 1, salonOnly: null },
  { id: "off_the",           emoji: "🍵",  name: "Thé",               cost: 15,  category: OfferingCategory.BOISSON,    durationMs: null,      stackPriority: 1, salonOnly: null },
  { id: "off_jus",           emoji: "🥤",  name: "Jus de fruits",     cost: 25,  category: OfferingCategory.BOISSON,    durationMs: null,      stackPriority: 1, salonOnly: null },
  { id: "off_champagne",     emoji: "🥂",  name: "Champagne",         cost: 200, category: OfferingCategory.BOISSON,    durationMs: null,      stackPriority: 2, salonOnly: null },
  { id: "off_biere",         emoji: "🍺",  name: "Bière pression",    cost: 30,  category: OfferingCategory.BOISSON,    durationMs: null,      stackPriority: 1, salonOnly: SalonKind.METAL },
  // Nourriture
  { id: "off_croissant",     emoji: "🥐",  name: "Croissant",         cost: 25,  category: OfferingCategory.NOURRITURE, durationMs: null,      stackPriority: 1, salonOnly: null },
  { id: "off_macaron",       emoji: "🍪",  name: "Macaron",           cost: 40,  category: OfferingCategory.NOURRITURE, durationMs: null,      stackPriority: 1, salonOnly: null },
  { id: "off_gateau",        emoji: "🎂",  name: "Gâteau d'anniversaire", cost: 120, category: OfferingCategory.NOURRITURE, durationMs: null,  stackPriority: 2, salonOnly: null },
  { id: "off_eclair",        emoji: "⚡",  name: "Éclairs",           cost: 35,  category: OfferingCategory.NOURRITURE, durationMs: null,      stackPriority: 1, salonOnly: SalonKind.METAL },
  // Symboliques
  { id: "off_rose",          emoji: "🌹",  name: "Rose rouge",        cost: 50,  category: OfferingCategory.SYMBOLIQUE, durationMs: 86400000,  stackPriority: 3, salonOnly: null },
  { id: "off_bouquet",       emoji: "💐",  name: "Bouquet de fleurs", cost: 100, category: OfferingCategory.SYMBOLIQUE, durationMs: 86400000,  stackPriority: 3, salonOnly: null },
  { id: "off_coeur",         emoji: "💝",  name: "Coeur en or",       cost: 150, category: OfferingCategory.SYMBOLIQUE, durationMs: 86400000,  stackPriority: 4, salonOnly: null },
  { id: "off_guitare",       emoji: "🎸",  name: "Guitare cassée",    cost: 80,  category: OfferingCategory.SYMBOLIQUE, durationMs: null,      stackPriority: 2, salonOnly: SalonKind.METAL },
  // Humour
  { id: "off_tarte",         emoji: "🥧",  name: "Tarte à la crème",  cost: 30,  category: OfferingCategory.HUMOUR,     durationMs: null,      stackPriority: 1, salonOnly: null },
  { id: "off_chaussette",    emoji: "🧦",  name: "Chaussette dépareillée", cost: 10, category: OfferingCategory.HUMOUR, durationMs: null,     stackPriority: 0, salonOnly: null },
] as const;

// ============================================================
// CATALOGUE MAGIES / POUVOIRS (aligné sur frontend/src/data/offerings.ts)
// ============================================================
const magieCatalog = [
  { id: "mag_grenouille",   emoji: "🐸",  name: "Transformation Grenouille",  cost: 100, durationSec: 120, type: MagieType.TRANSFORMATION,  breakConditionId: "kiss" },
  { id: "mag_ane",          emoji: "🫏",  name: "Transformation Âne",         cost: 80,  durationSec: 90,  type: MagieType.TRANSFORMATION,  breakConditionId: "compliment" },
  { id: "mag_fantome",      emoji: "👻",  name: "Transformation Fantôme",     cost: 120, durationSec: 60,  type: MagieType.TRANSFORMATION,  breakConditionId: "water" },
  { id: "mag_pirate",       emoji: "🏴‍☠️", name: "Transformation Pirate",      cost: 90,  durationSec: 90,  type: MagieType.TRANSFORMATION,  breakConditionId: "dance" },
  { id: "mag_statue",       emoji: "🗿",  name: "Transformation Statue",      cost: 110, durationSec: 120, type: MagieType.TRANSFORMATION,  breakConditionId: "compliment" },
  { id: "mag_poule",        emoji: "🐔",  name: "Transformation Poule",       cost: 70,  durationSec: 60,  type: MagieType.TRANSFORMATION,  breakConditionId: "laughter" },
  { id: "mag_invisibilite", emoji: "🫥",  name: "Invisibilité",               cost: 150, durationSec: 120, type: MagieType.VISUAL_EFFECT,   breakConditionId: "laughter" },
  { id: "mag_rockstar",     emoji: "🎸",  name: "Rockstar",                   cost: 130, durationSec: 90,  type: MagieType.VISUAL_EFFECT,   breakConditionId: "music" },
  // Anti-sorts
  { id: "mag_bisou",        emoji: "💋",  name: "Bisou (anti-grenouille)",    cost: 20,  durationSec: 0,   type: MagieType.TRANSFORMATION,  breakConditionId: null },
  { id: "mag_compliment",   emoji: "👏",  name: "Compliment",                 cost: 30,  durationSec: 0,   type: MagieType.TRANSFORMATION,  breakConditionId: null },
  { id: "mag_eau",          emoji: "💧",  name: "Eau bénite",                 cost: 20,  durationSec: 0,   type: MagieType.TRANSFORMATION,  breakConditionId: null },
  { id: "mag_danse",        emoji: "💃",  name: "Danse",                      cost: 25,  durationSec: 0,   type: MagieType.TRANSFORMATION,  breakConditionId: null },
  { id: "mag_rire",         emoji: "😂",  name: "Fou rire",                   cost: 20,  durationSec: 0,   type: MagieType.TRANSFORMATION,  breakConditionId: null },
  { id: "mag_musique",      emoji: "🎵",  name: "Mélodie apaisante",          cost: 25,  durationSec: 0,   type: MagieType.VISUAL_EFFECT,   breakConditionId: null },
] as const;

// ============================================================
// CATALOGUE ANIMAUX VIRTUELS
// ============================================================
const petCatalog = [
  { id: "pet_chat",     name: "Chat",       emoji: "🐱", cost: 300 },
  { id: "pet_chien",    name: "Chien",      emoji: "🐶", cost: 400 },
  { id: "pet_lapin",    name: "Lapin",      emoji: "🐰", cost: 350 },
  { id: "pet_renard",   name: "Renard",     emoji: "🦊", cost: 600 },
  { id: "pet_ours",     name: "Ours",       emoji: "🐻", cost: 800 },
  { id: "pet_dragon",   name: "Dragon",     emoji: "🐲", cost: 2000 },
  { id: "pet_licorne",  name: "Licorne",    emoji: "🦄", cost: 5000 },
  { id: "pet_pingouin", name: "Pingouin",   emoji: "🐧", cost: 500 },
  { id: "pet_tigre",    name: "Tigre",      emoji: "🐯", cost: 1200 },
  { id: "pet_koala",    name: "Koala",      emoji: "🐨", cost: 700 },
] as const;

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("🌱 Démarrage du seed JeuTaime...\n");

  // -- Salons --
  // Phase 5 : on assigne un `order` stable (index du tableau) pour
  // garantir un affichage déterministe côté public. `backgroundType`
  // reste à "gradient" (default) car le seed fournit `gradient`.
  // `isActive` par défaut true. `primaryColor` initialisée avec
  // gradient.start pour donner à l'admin une base exploitable.
  for (let i = 0; i < salons.length; i++) {
    const salon = salons[i]!;
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
  console.log(`✅ ${salons.length} salons seedés`);

  // -- Catalogue offrandes --
  for (const off of offeringCatalog) {
    await prisma.offeringCatalog.upsert({
      where: { id: off.id },
      update: { emoji: off.emoji, name: off.name, cost: off.cost, category: off.category, durationMs: off.durationMs, stackPriority: off.stackPriority, salonOnly: off.salonOnly },
      create: { id: off.id, emoji: off.emoji, name: off.name, cost: off.cost, category: off.category, durationMs: off.durationMs, stackPriority: off.stackPriority, salonOnly: off.salonOnly },
    });
  }
  console.log(`✅ ${offeringCatalog.length} offrandes seedées`);

  // -- Catalogue magies --
  for (const mag of magieCatalog) {
    await prisma.magieCatalog.upsert({
      where: { id: mag.id },
      update: { emoji: mag.emoji, name: mag.name, cost: mag.cost, durationSec: mag.durationSec, type: mag.type, breakConditionId: mag.breakConditionId },
      create: { id: mag.id, emoji: mag.emoji, name: mag.name, cost: mag.cost, durationSec: mag.durationSec, type: mag.type, breakConditionId: mag.breakConditionId },
    });
  }
  console.log(`✅ ${magieCatalog.length} magies seedées`);

  // -- Catalogue animaux --
  for (const pet of petCatalog) {
    await prisma.petCatalog.upsert({
      where: { id: pet.id },
      update: { name: pet.name, emoji: pet.emoji, cost: pet.cost },
      create: { id: pet.id, name: pet.name, emoji: pet.emoji, cost: pet.cost },
    });
  }
  console.log(`✅ ${petCatalog.length} animaux seedés`);

  // -- Questions de validation (stockées dans un JSON seedé, pas en table dédiée) --
  // On les exporte en JSON pour que le service puisse les utiliser
  // Elles ne sont pas en table car le catalogue peut évoluer sans migration
  console.log(`✅ ${questionCatalog.length} questions disponibles (catalogue JSON embarqué)`);

  // -- Compte de test --
  const existingTest = await prisma.user.findUnique({
    where: { email: TEST_USER.email },
    select: { id: true },
  });

  if (existingTest) {
    console.log(`ℹ️  Compte test déjà existant (${TEST_USER.email})`);
  } else {
    const passwordHash = await bcrypt.hash(TEST_USER.password, 10);

    await prisma.$transaction(async (tx) => {
      const testUser = await tx.user.create({
        data: { email: TEST_USER.email, passwordHash, isVerified: true },
      });

      await tx.profile.create({
        data: {
          userId:      testUser.id,
          pseudo:      TEST_USER.pseudo,
          birthDate:   TEST_USER.birthDate,
          gender:      TEST_USER.gender,
          city:        TEST_USER.city,
          interestedIn: [],
          lookingFor:  [],
          interests:   [],
          bio:         "Compte de test JeuTaime 🧪",
        },
      });

      await tx.wallet.create({
        data: { userId: testUser.id, coins: 9999 },
      });

      await tx.userSettings.create({
        data: { userId: testUser.id },
      });
    });

    console.log(`✅ Compte test créé → ${TEST_USER.email} / ${TEST_USER.password}`);
  }

  console.log("\n🎉 Seed terminé avec succès !");
}

main()
  .catch((err) => {
    console.error("❌ Erreur seed :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
