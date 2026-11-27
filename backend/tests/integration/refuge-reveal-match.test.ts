import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "../../src/events/handlers"; // branche les notifications de match (comme en production)
import { prisma } from "../../src/config/prisma";
import { RefugeService } from "../../src/modules/refuge/refuge.service";

/**
 * Fin automatique (168 h) → dévoilement + sourires réciproques + match (système de match existant), PostgreSQL réel.
 * Deux rôles, lectures simultanées, match existant, blocage, compte banni, aventures existantes (aucune rétroactivité).
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
const DAY = 86400000, HOUR = 3600000;
const created: string[] = [];
const settle = () => new Promise((r) => setTimeout(r, 500));
const AVATAR = { body: "body_default", hair: "hair_01", mouth: "mouth_01" };

async function pair(tag: string) {
  const mk = async (suffix: string, g: "HOMME" | "FEMME") => {
    const id = `rm-${tag}-${suffix}-${run}`;
    await prisma.user.create({ data: { id, email: `${id}@example.test`, passwordHash: "x", wallet: { create: { coins: 0 } }, settings: { create: {} }, profile: { create: { pseudo: id.slice(0, 28), birthDate: new Date("1994-06-01"), gender: g, city: "Paris", bio: `Bio de ${suffix}`, avatarConfig: AVATAR } } } });
    created.push(id);
    return id;
  };
  const c = await mk("c", "HOMME"), s = await mk("s", "FEMME");
  const proposal = await RefugeService.proposeAsAdopte(c, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never);
  await RefugeService.adoptRefuge(s, proposal.id);
  return { c, s, sid: proposal.id };
}
/** Sept jours écoulés (168 h) : la première lecture clôture la session et la dévoile automatiquement. */
async function expire(x: { c: string; s: string; sid: string }) {
  const startedAt = new Date(Date.now() - 7 * DAY - HOUR);
  await prisma.refugeSession.update({ where: { id: x.sid }, data: { startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY) } });
}
async function endAdventure(x: { c: string; s: string; sid: string }) {
  await expire(x);
  await RefugeService.getRefugeSession(x.sid, x.c);
}
const reactions = (x: { c: string; s: string }) => prisma.reaction.findMany({ where: { OR: [{ fromId: x.c, toId: x.s }, { fromId: x.s, toId: x.c }] }, orderBy: { fromId: "asc" } });
const matches = (x: { c: string; s: string }) => prisma.match.findMany({ where: { OR: [{ userAId: x.c, userBId: x.s }, { userAId: x.s, userBId: x.c }] } });
const matchNotifs = async (u: string) => prisma.notification.count({ where: { userId: u, type: "MATCH_CREATED" as never } });

beforeAll(() => undefined);
afterAll(async () => {
  // Les matchs ne se suppriment pas en cascade avec les comptes : nettoyage explicite.
  await prisma.match.deleteMany({ where: { OR: [{ userAId: { in: created } }, { userBId: { in: created } }] } });
  await prisma.reaction.deleteMany({ where: { OR: [{ fromId: { in: created } }, { toId: { in: created } }] } });
  await prisma.block.deleteMany({ where: { OR: [{ fromId: { in: created } }, { toId: { in: created } }] } });
  await prisma.user.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
});

describe("Refuge — fin automatique : dévoilement, sourires et match", () => {
  test("168 h écoulées : profils dévoilés, deux sourires, UN match, annonce une fois chacun, avatar et match visibles des deux côtés", async () => {
    const x = await pair("auto");
    const early: any = await RefugeService.getRefugeSession(x.sid, x.c);
    expect(early.status).toBe("ACTIVE"); // jamais avant 168 h
    expect(early.otherProfile).toBeUndefined();
    expect(await reactions(x)).toHaveLength(0);
    await endAdventure(x);
    await settle();
    const rs = await reactions(x);
    expect(rs.map((r) => r.type)).toEqual(["SMILE", "SMILE"]);
    const ms = await matches(x);
    expect(ms).toHaveLength(1);
    expect(ms[0]!.status).toBe("ACTIVE");
    expect([await matchNotifs(x.c), await matchNotifs(x.s)]).toEqual([1, 1]); // annonce du match, une fois chacun
    for (const [viewer, other] of [[x.c, x.s], [x.s, x.c]] as const) {
      const v: any = await RefugeService.getRefugeSession(x.sid, viewer);
      expect(v.status).toBe("REVEALED");
      expect(v.otherProfile).toMatchObject({ userId: other, avatarConfig: AVATAR, bio: expect.stringMatching(/^Bio de/) });
      expect(typeof v.otherProfile.age).toBe("number");
      expect(v.revealMatch).toEqual({ matchId: ms[0]!.id, status: "ACTIVE", questionsValidated: false, discussionOpen: false });
    }
  }, 60000);

  test("lectures SIMULTANÉES des deux rôles (et accueil) : exactement 2 sourires, 1 match, 1 annonce par personne, même après relectures", async () => {
    const x = await pair("race");
    await expire(x);
    await Promise.all([
      ...Array.from({ length: 6 }, () => RefugeService.getRefugeSession(x.sid, x.c)),
      ...Array.from({ length: 6 }, () => RefugeService.getRefugeSession(x.sid, x.s)),
      ...Array.from({ length: 4 }, () => RefugeService.getActiveRefugeSession(x.c)),
      ...Array.from({ length: 4 }, () => RefugeService.getActiveRefugeSession(x.s)),
    ]);
    await settle();
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id: x.sid } })).status).toBe("REVEALED");
    expect(await reactions(x)).toHaveLength(2);
    expect(await matches(x)).toHaveLength(1);
    expect([await matchNotifs(x.c), await matchNotifs(x.s)]).toEqual([1, 1]);
    await RefugeService.getRefugeSession(x.sid, x.c); // relecture tardive
    await RefugeService.getActiveRefugeSession(x.s);
    await settle();
    expect(await matches(x)).toHaveLength(1);
    expect(await reactions(x)).toHaveLength(2);
    expect([await matchNotifs(x.c), await matchNotifs(x.s)]).toEqual([1, 1]);
  }, 60000);

  test("match déjà existant : aucun doublon, aucune seconde annonce, match antérieur réutilisé (même identifiant)", async () => {
    const x = await pair("existing");
    const [a, b] = [x.c, x.s].sort();
    const old = await prisma.match.create({ data: { userAId: a!, userBId: b!, initiatorId: x.c, status: "ACTIVE", activatedAt: new Date(), letterCountA: 2, letterCountB: 1, questionsValidated: true } });
    await endAdventure(x);
    await settle();
    expect(await matches(x)).toHaveLength(1);
    expect(await matchNotifs(x.c) + await matchNotifs(x.s)).toBe(0); // pas de nouvelle annonce : le match existait
    const v: any = await RefugeService.getRefugeSession(x.sid, x.s);
    expect(v.revealMatch).toEqual({ matchId: old.id, status: "ACTIVE", questionsValidated: true, discussionOpen: true });
  }, 60000);

  test("match antérieur ROMPU : jamais recréé ni réactivé ; l'état est exposé (l'écran n'annonce pas de match)", async () => {
    const x = await pair("broken");
    const [a, b] = [x.c, x.s].sort();
    const old = await prisma.match.create({ data: { userAId: a!, userBId: b!, initiatorId: x.c, status: "BROKEN" } });
    await endAdventure(x);
    expect(await matches(x)).toHaveLength(1);
    expect((await prisma.match.findUniqueOrThrow({ where: { id: old.id } })).status).toBe("BROKEN");
    const v: any = await RefugeService.getRefugeSession(x.sid, x.c);
    expect(v.revealMatch.status).toBe("BROKEN");
  }, 60000);

  test("blocage entre les deux : aventure terminée SANS dévoilement, aucun sourire, aucun match, aucune erreur, aucune identité", async () => {
    const x = await pair("blocked");
    await prisma.block.create({ data: { fromId: x.c, toId: x.s } });
    await endAdventure(x);
    const v: any = await RefugeService.getRefugeSession(x.sid, x.s);
    expect(v.status).toBe("COMPLETED");
    expect(v.otherProfile).toBeUndefined();
    expect(v.finalReport).toBeTruthy(); // le bilan et les récompenses restent acquis
    expect(await reactions(x)).toHaveLength(0);
    expect(await matches(x)).toHaveLength(0);
  }, 60000);

  test("compte banni : aventure terminée sans dévoilement ni match", async () => {
    const x = await pair("banned");
    await prisma.user.update({ where: { id: x.s }, data: { isBanned: true } });
    await endAdventure(x);
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id: x.sid } })).status).toBe("COMPLETED");
    expect(await reactions(x)).toHaveLength(0);
    expect(await matches(x)).toHaveLength(0);
  }, 60000);

  test("sourire déjà envoyé d'un côté : le match est créé sans doublon de réaction", async () => {
    const x = await pair("oneside");
    await prisma.reaction.create({ data: { fromId: x.s, toId: x.c, type: "SMILE" } });
    await endAdventure(x);
    await settle();
    expect(await reactions(x)).toHaveLength(2);
    expect(await matches(x)).toHaveLength(1);
  }, 60000);

  test("aventures EXISTANTES : aucun match rétroactif, aucune modification (ancienne attente de décision, ancienne aventure dévoilée)", async () => {
    // Ancienne aventure déjà en attente de décision (ancien flux) : la lecture ne la dévoile pas, ne crée ni sourire ni match.
    const y = await pair("legacy-awaiting");
    await expire(y);
    await prisma.refugeSession.update({ where: { id: y.sid }, data: { status: "AWAITING_REVEAL_CONSENT", finalizedAt: new Date() } });
    await RefugeService.getRefugeSession(y.sid, y.c);
    await RefugeService.getActiveRefugeSession(y.s);
    await settle();
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id: y.sid } })).status).toBe("AWAITING_REVEAL_CONSENT");
    expect(await reactions(y)).toHaveLength(0);
    expect(await matches(y)).toHaveLength(0);
    // Ancienne aventure déjà dévoilée (par consentement, avant ce changement) : intacte, sans match créé après coup.
    const x = await pair("legacy");
    await expire(x);
    await prisma.refugeSession.update({ where: { id: x.sid }, data: { status: "REVEALED", adopteRevealDecision: "ACCEPT", adoptantRevealDecision: "ACCEPT", revealedAt: new Date() } });
    await RefugeService.getRefugeSession(x.sid, x.c);
    await RefugeService.submitRevealConsent(x.sid, x.c, "ACCEPT").catch(() => undefined);
    await settle();
    expect(await reactions(x)).toHaveLength(0);
    expect(await matches(x)).toHaveLength(0);
  }, 60000);
});
