import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { RefugeService } from "../../src/modules/refuge/refuge.service";
import { createNotification } from "../../src/modules/notifications/notifications.service";
import { resetTestLettersAndBottles, resetTestMatches } from "../../src/modules/debug/debug.service";
import { deleteAccountPermanently } from "../../src/modules/auth/accountDeletion.service";
import { hashPassword } from "../../src/core/utils/hash";

/**
 * Notifications ↔ relations réelles (PostgreSQL). Vérifie :
 *  - une adoption ne crée QUE « adopté » chez le compagnon ; jamais match / sourire / 3 questions ;
 *  - valider ses actions ne crée aucune notification avant le jour 7 ;
 *  - toute réinitialisation d'une relation supprime ses notifications (aucun orphelin), sans toucher aux autres.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
const created: string[] = [];

async function user(tag: string, domain = "jeutaime.test") {
  const id = `nr-${tag}-${run}`;
  await prisma.user.create({ data: { id, email: `${id}@${domain}`, passwordHash: "x" } });
  await prisma.wallet.create({ data: { userId: id, coins: 100 } });
  created.push(id);
  return id;
}
const notifs = (userId: string) => prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
const types = async (userId: string) => (await notifs(userId)).map((n) => n.type);
async function settle(userId: string, expected: number) {
  for (let i = 0; i < 40; i++) {
    if ((await prisma.notification.count({ where: { userId } })) >= expected) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  await new Promise((r) => setTimeout(r, 150)); // laisse passer une éventuelle notification en trop
}
async function match(a: string, b: string) {
  const [userAId, userBId] = a < b ? [a, b] : [b, a];
  return prisma.match.create({ data: { userAId, userBId, initiatorId: a, status: "ACTIVE", questionsValidated: true } });
}

afterAll(async () => {
  await prisma.match.deleteMany({ where: { OR: [{ userAId: { in: created } }, { userBId: { in: created } }] } });
  await prisma.user.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
});

describe("Notifications du Refuge : événements réellement déclenchés", () => {
  test("adoption + actions : seule « adopté » chez le compagnon ; aucune notification de rencontre ; aucun doublon", async () => {
    const companion = await user("c"), sponsor = await user("s");
    const proposal = await RefugeService.proposeAsAdopte(companion, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never);
    await RefugeService.adoptRefuge(sponsor, proposal.id);
    await settle(companion, 1);
    expect(await types(companion)).toEqual(["REFUGE_ADOPTED"]);
    expect(await types(sponsor)).toEqual([]); // l'auteur de l'adoption n'est jamais notifié
    expect((await notifs(companion))[0]!.meta).toEqual({ refugeSessionId: proposal.id });

    // Actions du jour 1 des deux côtés : aucune notification (événement manquant, à définir).
    await RefugeService.submitDailyChoice(proposal.id, companion, 1, { action1: "NOURRIR", action2: "CARESSER" });
    await RefugeService.submitGuess(proposal.id, sponsor, 1, { guessedAction1: "NOURRIR", guessedAction2: "JOUER", foodChoice: "fish" } as never);
    await settle(companion, 2);
    expect(await types(companion)).toEqual(["REFUGE_ADOPTED"]);
    expect(await types(sponsor)).toEqual([]);

    // Aucun match, sourire, ni jeu des questions n'existe entre eux, et aucune notification de ce type nulle part.
    expect(await prisma.match.count({ where: { OR: [{ userAId: { in: [companion, sponsor] } }, { userBId: { in: [companion, sponsor] } }] } })).toBe(0);
    expect(await prisma.reaction.count({ where: { OR: [{ fromId: { in: [companion, sponsor] } }, { toId: { in: [companion, sponsor] } }] } })).toBe(0);
    const forbidden = ["MATCH_CREATED", "QUESTIONS_PASSED", "QUESTIONS_FAILED", "QUESTIONS_TURN", "LETTER_RECEIVED"];
    expect(await prisma.notification.count({ where: { userId: { in: [companion, sponsor] }, type: { in: forbidden as never } } })).toBe(0);
  }, 30000);
});

describe("Réinitialisation : les notifications d'une relation disparaissent avec elle", () => {
  test("resetTestMatches : match, 3 questions et lettres supprimés chez les DEUX comptes ; autres notifications conservées", async () => {
    const a = await user("ma"), b = await user("mb"), c = await user("mc");
    const m = await match(a, b);
    for (const u of [a, b]) {
      await createNotification({ userId: u, type: "MATCH_CREATED", meta: { matchId: m.id, otherUserId: u === a ? b : a } });
      await createNotification({ userId: u, type: "QUESTIONS_PASSED", meta: { matchId: m.id } });
      await createNotification({ userId: u, type: "LETTER_RECEIVED", meta: { matchId: m.id, fromUserId: u === a ? b : a } });
    }
    const other = await match(a, c); // autre relation, aussi un compte de test : supprimée aussi, mais sa notif propre
    await createNotification({ userId: a, type: "MATCH_CREATED", meta: { matchId: other.id, otherUserId: c } });
    await createNotification({ userId: a, type: "REFUGE_ADOPTED", meta: { refugeSessionId: "keep-me" } }); // autre fonctionnalité
    await createNotification({ userId: a, type: "ADMIN_MESSAGE", meta: null });

    const res = await resetTestMatches();
    expect((res as { notificationsDeleted: number }).notificationsDeleted).toBeGreaterThanOrEqual(7);
    expect(await prisma.match.count({ where: { id: { in: [m.id, other.id] } } })).toBe(0);
    expect(await types(a)).toEqual(["REFUGE_ADOPTED", "ADMIN_MESSAGE"]); // rien d'autre n'a été touché
    expect(await types(b)).toEqual([]);
    expect(await types(c)).toEqual([]);
  });

  test("resetTestLettersAndBottles : seules les notifications de lettres du match conservé sont retirées", async () => {
    const a = await user("la"), b = await user("lb");
    const m = await match(a, b);
    for (const u of [a, b]) {
      await createNotification({ userId: u, type: "MATCH_CREATED", meta: { matchId: m.id, otherUserId: u === a ? b : a } });
      await createNotification({ userId: u, type: "LETTER_RECEIVED", meta: { matchId: m.id, fromUserId: u === a ? b : a } });
    }
    const bottle = await prisma.messageInABottle.create({
      data: { senderId: a, message: "x", senderCity: "Paris", targetGender: "HOMME", ageMin: 18, ageMax: 99, acceptedById: b, expiresAt: new Date(Date.now() + 86400000) },
    });
    await createNotification({ userId: a, type: "BOTTLE_REPLY", meta: { bottleId: bottle.id } });

    await resetTestLettersAndBottles();
    expect(await prisma.match.count({ where: { id: m.id } })).toBe(1); // le parcours du match est conservé
    expect(await types(a)).toEqual(["MATCH_CREATED"]);
    expect(await types(b)).toEqual(["MATCH_CREATED"]);
    expect(await prisma.notification.count({ where: { meta: { path: ["bottleId"], equals: bottle.id } } })).toBe(0);
  });

  test("devResetSession : « adopté » supprimé, et une nouvelle adoption prévient de nouveau (clé d'idempotence libérée)", async () => {
    const companion = await user("rc"), sponsor = await user("rs");
    const proposal = await RefugeService.proposeAsAdopte(companion, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never);
    await RefugeService.adoptRefuge(sponsor, proposal.id);
    await settle(companion, 1);
    expect(await types(companion)).toEqual(["REFUGE_ADOPTED"]);

    await RefugeService.devResetSession(proposal.id, companion, "reset");
    expect(await types(companion)).toEqual([]); // plus d'adoption à signaler

    await RefugeService.adoptRefuge(sponsor, proposal.id);
    await settle(companion, 1);
    expect(await types(companion)).toEqual(["REFUGE_ADOPTED"]); // et non « duplicate » silencieux
  }, 30000);

  test("suppression de compte : la notification « 3 questions » de l'AUTRE participant est supprimée aussi", async () => {
    const a = await user("da", "example.test"), b = await user("db", "example.test");
    await prisma.user.update({ where: { id: a }, data: { passwordHash: await hashPassword("Motdepasse!123") } });
    const m = await match(a, b);
    await createNotification({ userId: b, type: "QUESTIONS_PASSED", meta: { matchId: m.id } }); // meta sans identifiant d'utilisateur
    await createNotification({ userId: b, type: "ADMIN_MESSAGE", meta: null });
    await deleteAccountPermanently(a, "Motdepasse!123");
    expect(await types(b)).toEqual(["ADMIN_MESSAGE"]);
  });
});
