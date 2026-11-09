/**
 * Remise à zéro des interactions des COMPTES DE TEST uniquement.
 *
 * Comptes de test = e-mail se terminant par "@jeutaime.test" + "test@jeutaime.com".
 * Tout autre compte est considéré comme un UTILISATEUR RÉEL et rien de ce qui
 * le concerne n'est supprimé ni modifié.
 *
 * Conservés dans tous les cas : comptes, profils, avatars, photos, pièces,
 * offrandes, magies, salons, compagnons (aucune de ces tables n'est touchée).
 *
 * Un élément n'est supprimé que si TOUTES les personnes qui y apparaissent
 * (participants principaux ET données rattachées) sont des comptes de test :
 *   - Sourire/grimace : émetteur et destinataire.
 *   - Match : les deux membres, l'expéditeur et le destinataire de chaque lettre,
 *     l'auteur de chaque réponse au jeu des questions ; et toute bouteille
 *     rattachée au match doit elle-même être supprimée (sinon la suppression
 *     du match modifierait cette bouteille).
 *   - Bouteille : l'envoyeur, le preneur, CHAQUE destinataire de réception
 *     (quel que soit son statut, y compris « en attente »), l'auteur de chaque
 *     message anonyme, le demandeur et le destinataire de chaque demande de
 *     dévoilement.
 *   - Session du refuge : l'adopté et l'adoptant (les choix, devinettes et
 *     résultats rattachés ne contiennent aucun autre utilisateur).
 *
 * Les tables rattachées sont supprimées EXPLICITEMENT (sans compter sur les
 * suppressions en cascade de la base).
 *
 * Utilisation :
 *   node scripts/reset-test-interactions.js
 *       → APERÇU : n'efface rien ; affiche les suppressions prévues, les
 *         éléments exclus pour protéger les utilisateurs réels, et un CODE.
 *   node scripts/reset-test-interactions.js --confirm=CODE
 *       → recalcule tout dans une transaction « serializable » ; si le plan
 *         ne correspond plus exactement au CODE de l'aperçu, ou si une
 *         vérification de sécurité échoue, REFUSE et n'efface rien.
 */
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const TEST_EMAIL_SUFFIX = "@jeutaime.test";
const TEST_EMAIL_EXACT = "test@jeutaime.com";

class SafetyError extends Error {}

function isTestEmail(email) {
  if (typeof email !== "string") return false;
  const e = email.toLowerCase();
  return e === TEST_EMAIL_EXACT || e.endsWith(TEST_EMAIL_SUFFIX);
}

async function loadTestUsers(db) {
  const users = await db.user.findMany({
    where: {
      OR: [
        { email: { endsWith: TEST_EMAIL_SUFFIX, mode: "insensitive" } },
        { email: { equals: TEST_EMAIL_EXACT, mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true, profile: { select: { pseudo: true } } },
    orderBy: { email: "asc" },
  });
  // Double contrôle côté script : aucun compte retenu ne doit échapper au filtre.
  for (const u of users) {
    if (!isTestEmail(u.email)) throw new SafetyError(`Compte inattendu dans la liste des comptes de test.`);
  }
  return users;
}

const allTest = (ids, testSet) => ids.every((id) => id == null || testSet.has(id));

/**
 * Calcule le plan : ce qui serait supprimé et ce qui est exclu.
 * Ne modifie rien.
 */
async function buildPlan(db) {
  const testUsers = await loadTestUsers(db);
  const testIds = testUsers.map((u) => u.id);
  const testSet = new Set(testIds);

  const plan = {
    testUsers: testUsers.map((u) => (u.profile && u.profile.pseudo) || "(sans pseudo)"),
    delete: { reactions: [], matches: [], letters: [], questionAttempts: [], bottles: [], receipts: [], anonymousMessages: [], revealRequests: [], refugeSessions: [], refugeDailyChoices: [], refugeGuesses: [], refugeDayResults: [] },
    excluded: { reactions: 0, matches: 0, bottles: 0, refugeSessions: 0, bottleReceiptsOfTestUsersOnRealBottles: 0 },
  };
  if (testIds.length === 0) return plan;

  // ── Sourires / grimaces ──
  const reactions = await db.reaction.findMany({
    where: { OR: [{ fromId: { in: testIds } }, { toId: { in: testIds } }] },
    select: { id: true, fromId: true, toId: true },
  });
  for (const r of reactions) {
    if (allTest([r.fromId, r.toId], testSet)) plan.delete.reactions.push(r.id);
    else plan.excluded.reactions++;
  }

  // ── Bouteilles (+ réceptions, messages anonymes, demandes de dévoilement) ──
  const bottles = await db.messageInABottle.findMany({
    where: {
      OR: [
        { senderId: { in: testIds } },
        { acceptedById: { in: testIds } },
        { receipts: { some: { recipientId: { in: testIds } } } },
        { messages: { some: { senderId: { in: testIds } } } },
      ],
    },
    select: {
      id: true, senderId: true, acceptedById: true,
      receipts: { select: { id: true, recipientId: true } },
      messages: { select: { id: true, senderId: true } },
      revealRequests: { select: { id: true, requestedById: true, respondentId: true } },
    },
  });
  for (const b of bottles) {
    const people = [b.senderId, b.acceptedById];
    for (const r of b.receipts) people.push(r.recipientId);
    for (const am of b.messages) people.push(am.senderId);
    for (const rr of b.revealRequests) people.push(rr.requestedById, rr.respondentId);
    if (testSet.has(b.senderId) && allTest(people, testSet)) {
      plan.delete.bottles.push(b.id);
      for (const r of b.receipts) plan.delete.receipts.push(r.id);
      for (const am of b.messages) plan.delete.anonymousMessages.push(am.id);
      for (const rr of b.revealRequests) plan.delete.revealRequests.push(rr.id);
    } else if (testSet.has(b.senderId)) {
      plan.excluded.bottles++;
    } else {
      // Bouteille d'un utilisateur réel reçue par un compte de test : on ne touche à rien.
      plan.excluded.bottleReceiptsOfTestUsersOnRealBottles += b.receipts.filter((r) => testSet.has(r.recipientId)).length;
      if (b.receipts.every((r) => !testSet.has(r.recipientId))) plan.excluded.bottles++;
    }
  }

  const bottleDeleteSet = new Set(plan.delete.bottles);

  // ── Matchs (+ lettres, jeu des questions, bouteilles rattachées) ──
  const matches = await db.match.findMany({
    where: { OR: [{ userAId: { in: testIds } }, { userBId: { in: testIds } }] },
    select: {
      id: true, userAId: true, userBId: true, initiatorId: true,
      letters: { select: { id: true, fromUserId: true, toUserId: true } },
      questionAttempts: { select: { id: true, responderId: true } },
      messageInABottles: { select: { id: true, senderId: true, acceptedById: true } },
    },
  });
  for (const m of matches) {
    const people = [m.userAId, m.userBId, m.initiatorId];
    for (const l of m.letters) people.push(l.fromUserId, l.toUserId);
    for (const q of m.questionAttempts) people.push(q.responderId);
    for (const b of m.messageInABottles) people.push(b.senderId, b.acceptedById);
    // Une bouteille rattachée qui n'est pas elle-même supprimée serait modifiée
    // (matchId remis à vide) : dans ce cas, on garde le match.
    const linkedBottlesDeleted = m.messageInABottles.every((b) => bottleDeleteSet.has(b.id));
    if (allTest(people, testSet) && linkedBottlesDeleted) {
      plan.delete.matches.push(m.id);
      for (const l of m.letters) plan.delete.letters.push(l.id);
      for (const q of m.questionAttempts) plan.delete.questionAttempts.push(q.id);
    } else {
      plan.excluded.matches++;
    }
  }

  // ── Sessions du refuge (+ choix, devinettes, résultats) ──
  const sessions = await db.refugeSession.findMany({
    where: { OR: [{ adopteId: { in: testIds } }, { adoptantId: { in: testIds } }] },
    select: {
      id: true, adopteId: true, adoptantId: true,
      dailyChoices: { select: { id: true } },
      guesses: { select: { id: true } },
      dayResults: { select: { id: true } },
    },
  });
  for (const s of sessions) {
    if (allTest([s.adopteId, s.adoptantId], testSet)) {
      plan.delete.refugeSessions.push(s.id);
      for (const c of s.dailyChoices) plan.delete.refugeDailyChoices.push(c.id);
      for (const g of s.guesses) plan.delete.refugeGuesses.push(g.id);
      for (const d of s.dayResults) plan.delete.refugeDayResults.push(d.id);
    } else {
      plan.excluded.refugeSessions++;
    }
  }

  for (const k of Object.keys(plan.delete)) plan.delete[k].sort();
  return plan;
}

function planCode(plan) {
  const h = crypto.createHash("sha256").update(JSON.stringify(plan.delete)).digest("hex");
  return h.slice(0, 10).toUpperCase();
}

/**
 * Empreinte des données des utilisateurs RÉELS dans les tables touchées :
 * nombre de lignes où apparaît au moins un compte qui n'est pas un compte de
 * test, + bouteilles réelles rattachées à un match. Doit être identique avant
 * et après la suppression.
 */
async function realUsersFingerprint(db, testIds) {
  const notTest = { notIn: testIds };
  return {
    reactions: await db.reaction.count({ where: { OR: [{ fromId: notTest }, { toId: notTest }] } }),
    matches: await db.match.count({ where: { OR: [{ userAId: notTest }, { userBId: notTest }] } }),
    letters: await db.letter.count({ where: { OR: [{ fromUserId: notTest }, { toUserId: notTest }] } }),
    questionAttempts: await db.matchQuestionAttempt.count({ where: { responderId: notTest } }),
    bottles: await db.messageInABottle.count({ where: { OR: [{ senderId: notTest }, { acceptedById: notTest }] } }),
    bottlesWithMatch: await db.messageInABottle.count({ where: { matchId: { not: null }, OR: [{ senderId: notTest }, { acceptedById: notTest }] } }),
    receipts: await db.bottleReceipt.count({ where: { recipientId: notTest } }),
    anonymousMessages: await db.anonymousMessage.count({ where: { senderId: notTest } }),
    revealRequests: await db.bottleRevealRequest.count({ where: { OR: [{ requestedById: notTest }, { respondentId: notTest }] } }),
    refugeSessions: await db.refugeSession.count({ where: { OR: [{ adopteId: notTest }, { adoptantId: notTest }] } }),
  };
}

async function deleteExactly(model, ids, label) {
  if (ids.length === 0) return 0;
  const res = await model.deleteMany({ where: { id: { in: ids } } });
  if (res.count !== ids.length) {
    throw new SafetyError(`${label} : ${res.count} supprimé(s) au lieu de ${ids.length} prévus.`);
  }
  return res.count;
}

/**
 * Exécute la suppression. Tout se passe dans UNE transaction serializable :
 * en cas d'écart ou de doute, une erreur est levée et RIEN n'est supprimé.
 */
async function executeReset(prisma, expectedCode) {
  return prisma.$transaction(async (tx) => {
    const plan = await buildPlan(tx);
    const code = planCode(plan);
    if (!expectedCode || code !== expectedCode) {
      throw new SafetyError(`Le plan a changé depuis l'aperçu (code attendu ${expectedCode || "absent"}, code actuel ${code}). Relancez l'aperçu.`);
    }
    const testIds = (await loadTestUsers(tx)).map((u) => u.id);
    if (testIds.length === 0) throw new SafetyError("Aucun compte de test trouvé.");

    const before = await realUsersFingerprint(tx, testIds);
    const d = plan.delete;
    const done = {};
    // Enfants d'abord, explicitement, puis parents.
    done.letters = await deleteExactly(tx.letter, d.letters, "Lettres");
    done.questionAttempts = await deleteExactly(tx.matchQuestionAttempt, d.questionAttempts, "Réponses au jeu des questions");
    done.receipts = await deleteExactly(tx.bottleReceipt, d.receipts, "Réceptions de bouteilles");
    done.anonymousMessages = await deleteExactly(tx.anonymousMessage, d.anonymousMessages, "Messages de bouteilles");
    done.revealRequests = await deleteExactly(tx.bottleRevealRequest, d.revealRequests, "Demandes de dévoilement");
    done.bottles = await deleteExactly(tx.messageInABottle, d.bottles, "Bouteilles");
    done.matches = await deleteExactly(tx.match, d.matches, "Matchs");
    done.reactions = await deleteExactly(tx.reaction, d.reactions, "Sourires / grimaces");
    done.refugeDailyChoices = await deleteExactly(tx.refugeDailyChoice, d.refugeDailyChoices, "Choix du refuge");
    done.refugeGuesses = await deleteExactly(tx.refugeGuess, d.refugeGuesses, "Devinettes du refuge");
    done.refugeDayResults = await deleteExactly(tx.refugeDayResult, d.refugeDayResults, "Résultats du refuge");
    done.refugeSessions = await deleteExactly(tx.refugeSession, d.refugeSessions, "Sessions du refuge");

    const after = await realUsersFingerprint(tx, testIds);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new SafetyError("Des données d'utilisateurs réels auraient été modifiées. Opération annulée.");
    }
    return { code, done, realUsers: after };
  }, { isolationLevel: "Serializable", timeout: 120000, maxWait: 10000 });
}

function printPlan(plan, code) {
  const d = plan.delete, x = plan.excluded;
  console.log(`\nComptes de test trouvés : ${plan.testUsers.length}`);
  for (const p of plan.testUsers) console.log(`  - ${p}`);
  console.log("\nSUPPRESSIONS PRÉVUES (uniquement entre comptes de test) :");
  console.log(`  Sourires / grimaces : ${d.reactions.length}`);
  console.log(`  Matchs : ${d.matches.length}  (lettres : ${d.letters.length}, réponses au jeu des questions : ${d.questionAttempts.length})`);
  console.log(`  Bouteilles : ${d.bottles.length}  (réceptions : ${d.receipts.length}, messages : ${d.anonymousMessages.length}, demandes de dévoilement : ${d.revealRequests.length})`);
  console.log(`  Sessions du refuge : ${d.refugeSessions.length}  (choix : ${d.refugeDailyChoices.length}, devinettes : ${d.refugeGuesses.length}, résultats : ${d.refugeDayResults.length})`);
  console.log("\nEXCLUS pour protéger les utilisateurs réels (conservés tels quels) :");
  console.log(`  Sourires / grimaces avec un utilisateur réel : ${x.reactions}`);
  console.log(`  Matchs avec un utilisateur réel : ${x.matches}`);
  console.log(`  Bouteilles impliquant un utilisateur réel (dont distribuées sans réponse) : ${x.bottles}`);
  console.log(`  Réceptions de comptes de test sur des bouteilles d'utilisateurs réels : ${x.bottleReceiptsOfTestUsersOnRealBottles}`);
  console.log(`  Sessions du refuge avec un utilisateur réel : ${x.refugeSessions}`);
  console.log(`\nCODE DE CONFIRMATION : ${code}`);
}

async function main() {
  const prisma = new PrismaClient();
  const arg = process.argv.find((a) => a.startsWith("--confirm"));
  try {
    if (!arg) {
      const plan = await buildPlan(prisma);
      const code = planCode(plan);
      printPlan(plan, code);
      console.log("\nMODE APERÇU : rien n'a été supprimé.");
      console.log(`Pour supprimer exactement ce qui est listé : node scripts/reset-test-interactions.js --confirm=${code}\n`);
      return;
    }
    const expected = arg.includes("=") ? arg.split("=")[1].trim().toUpperCase() : "";
    if (!expected) throw new SafetyError("Il faut indiquer le code de l'aperçu : --confirm=CODE");
    const res = await executeReset(prisma, expected);
    console.log("\nSUPPRIMÉ (transaction validée) :");
    for (const [k, n] of Object.entries(res.done)) console.log(`  ${k} : ${n}`);
    console.log("Données des utilisateurs réels : inchangées (vérifié avant validation).\n");
  } catch (err) {
    console.error(`\nREFUSÉ — rien n'a été supprimé. ${err && err.message ? err.message : err}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { buildPlan, planCode, executeReset, realUsersFingerprint, isTestEmail, SafetyError };

if (require.main === module) main();
