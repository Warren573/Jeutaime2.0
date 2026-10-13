/**
 * Synchronisation idempotente des prix validés du 13 octobre 2026.
 * Exécution MANUELLE après validation sur une copie de la base.
 * Ne change ni les portefeuilles, ni les transactions, ni les cadeaux déjà envoyés.
 *
 * Usage dans backend : npx tsx scripts/sync-approved-economy-prices.ts --dry-run
 * Puis : npx tsx scripts/sync-approved-economy-prices.ts --apply
 */
import { PrismaClient, OfferingCategory } from "@prisma/client";

const prisma = new PrismaClient();
const SALON_OFFERING_IDS = [
  "off_biere", "off_fraises", "off_bonbons", "off_cafe", "off_cocktail", "off_cookie",
  "off_glace", "off_pizza", "off_coupechampagne", "off_verrevin", "off_sushismakis", "off_the",
] as const;
const DRINK = 5;
const FOOD = 10;
const MAGIC_IDS = [
  "mag_grenouille", "mag_ane", "mag_poule", "mag_fantome",
  "mag_pirate", "mag_statue", "mag_rockstar", "mag_invisibilite",
] as const;

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && process.argv.includes("--dry-run")) throw new Error("Choisir un seul mode.");
  const offerings = await prisma.offeringCatalog.findMany({
    where: { id: { in: [...SALON_OFFERING_IDS] }, category: { in: [OfferingCategory.BOISSON, OfferingCategory.NOURRITURE] } },
    select: { id: true, category: true, cost: true },
  });
  const magies = await prisma.magieCatalog.findMany({
    where: { id: { in: [...MAGIC_IDS] } },
    select: { id: true, cost: true },
  });
  const missing = MAGIC_IDS.filter(id => !magies.some(m => m.id === id));
  if (missing.length) throw new Error("Magies absentes : " + missing.join(", "));
  const missingOfferings = SALON_OFFERING_IDS.filter(id => !offerings.some(o => o.id === id));
  if (missingOfferings.length) throw new Error("Offrandes absentes ou mauvaise catégorie : " + missingOfferings.join(", "));

  const changedOfferings = offerings
    .map(o => ({ ...o, target: o.category === OfferingCategory.BOISSON ? DRINK : FOOD }))
    .filter(o => o.cost !== o.target);
  const changedMagies = magies.filter(m => m.cost !== 20);
  console.log(JSON.stringify({
    mode: apply ? "APPLY" : "DRY_RUN",
    offerings: changedOfferings,
    magies: changedMagies.map(m => ({ ...m, target: 20 })),
    untouchedHistoricalOfferings: true,
    untouchedWallets: true,
  }, null, 2));
  if (!apply) return;

  await prisma.$transaction(async tx => {
    // Toutes les lignes d'une même catégorie sont tarifées identiquement.
    await tx.offeringCatalog.updateMany({
      where: { id: { in: [...SALON_OFFERING_IDS] }, category: OfferingCategory.BOISSON },
      data: { cost: DRINK },
    });
    await tx.offeringCatalog.updateMany({
      where: { id: { in: [...SALON_OFFERING_IDS] }, category: OfferingCategory.NOURRITURE },
      data: { cost: FOOD },
    });
    await tx.magieCatalog.updateMany({
      where: { id: { in: [...MAGIC_IDS] } },
      data: { cost: 20 },
    });
  });
  console.log("Synchronisation effectuée. Historique et solde des portefeuilles inchangés.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
