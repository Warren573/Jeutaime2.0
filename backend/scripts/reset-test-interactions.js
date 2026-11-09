/**
 * Remise à zéro des interactions des COMPTES DE TEST uniquement.
 *
 * Comptes de test = e-mail se terminant par "@jeutaime.test" + "test@jeutaime.com".
 * Aucun autre compte n'est touché. Les comptes eux-mêmes sont conservés
 * (profil, avatar, photos, pièces, offrandes, magies, salons, compagnon).
 *
 * Ce qui est effacé (uniquement quand TOUS les participants sont des comptes de test) :
 *   - Sourires / grimaces (Reaction)
 *   - Matchs (Match) + leurs lettres et réponses au jeu des questions (suppression en cascade)
 *   - Bouteilles envoyées par un compte de test (MessageInABottle) + réceptions,
 *     messages anonymes et demandes de dévoilement (cascade)
 *   - Sessions du refuge (RefugeSession) + choix, devinettes, résultats (cascade)
 *
 * Par défaut : AUCUNE suppression, le script affiche seulement ce qu'il effacerait.
 * Pour supprimer réellement :  node scripts/reset-test-interactions.js --confirm
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: "@jeutaime.test" } },
        { email: "test@jeutaime.com" },
      ],
    },
    select: { id: true, email: true, profile: { select: { pseudo: true } } },
    orderBy: { email: "asc" },
  });
  const ids = testUsers.map((u) => u.id);

  console.log(`\nComptes de test trouvés : ${testUsers.length}`);
  for (const u of testUsers) console.log(`  - ${(u.profile && u.profile.pseudo) || "(sans pseudo)"}`);
  if (ids.length === 0) {
    console.log("\nAucun compte de test : rien à faire.");
    return;
  }

  const reactionWhere = { fromId: { in: ids }, toId: { in: ids } };
  const matchWhere = { userAId: { in: ids }, userBId: { in: ids } };
  const bottleWhere = {
    senderId: { in: ids },
    OR: [{ acceptedById: null }, { acceptedById: { in: ids } }],
  };
  const refugeWhere = {
    adopteId: { in: ids },
    OR: [{ adoptantId: null }, { adoptantId: { in: ids } }],
  };

  const counts = {
    "Sourires / grimaces": await prisma.reaction.count({ where: reactionWhere }),
    "Matchs": await prisma.match.count({ where: matchWhere }),
    "  dont lettres": await prisma.letter.count({ where: { match: matchWhere } }),
    "  dont réponses au jeu des questions": await prisma.matchQuestionAttempt.count({ where: { match: matchWhere } }),
    "Bouteilles": await prisma.messageInABottle.count({ where: bottleWhere }),
    "Sessions du refuge": await prisma.refugeSession.count({ where: refugeWhere }),
  };

  console.log("\nÉléments concernés :");
  for (const [label, n] of Object.entries(counts)) console.log(`  ${label} : ${n}`);

  if (!CONFIRM) {
    console.log("\nMODE APERÇU : rien n'a été supprimé.");
    console.log("Pour supprimer réellement : node scripts/reset-test-interactions.js --confirm\n");
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    // Les bouteilles d'abord (elles peuvent pointer vers un match).
    const bottles = await tx.messageInABottle.deleteMany({ where: bottleWhere });
    const matches = await tx.match.deleteMany({ where: matchWhere });
    const reactions = await tx.reaction.deleteMany({ where: reactionWhere });
    const refuge = await tx.refugeSession.deleteMany({ where: refugeWhere });
    return { bottles: bottles.count, matches: matches.count, reactions: reactions.count, refuge: refuge.count };
  });

  console.log("\nSUPPRIMÉ :");
  console.log(`  Bouteilles : ${result.bottles}`);
  console.log(`  Matchs (avec lettres et jeu des questions) : ${result.matches}`);
  console.log(`  Sourires / grimaces : ${result.reactions}`);
  console.log(`  Sessions du refuge : ${result.refuge}\n`);
}

main()
  .catch((err) => {
    console.error("Erreur :", err && err.message ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
