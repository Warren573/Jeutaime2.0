import { afterAll, describe, expect, it } from "vitest";
import "../../src/events/handlers";
import { prisma } from "../../src/config/prisma";
import { RefugeService } from "../../src/modules/refuge/refuge.service";

/**
 * Sortie de l'écran de fin : archivage PAR PARTICIPANT, libération indépendante, nouvelle aventure, bilan conservé.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
const DAY = 86400000, HOUR = 3600000;
const created: string[] = [];
const settle = () => new Promise((r) => setTimeout(r, 400));
const AVATAR = { body: "body_default", hair: "hair_01", mouth: "mouth_01" };

async function pair(tag: string) {
  const mk = async (suffix: string, g: "HOMME" | "FEMME") => {
    const id = `ra-${tag}-${suffix}-${run}`;
    await prisma.user.create({ data: { id, email: `${id}@example.test`, passwordHash: "x", wallet: { create: { coins: 0 } }, settings: { create: {} }, profile: { create: { pseudo: id.slice(0, 28), birthDate: new Date("1994-06-01"), gender: g, city: "Paris", bio: `Bio de ${suffix}`, avatarConfig: AVATAR } } } });
    created.push(id);
    return id;
  };
  const c = await mk("c", "HOMME"), s = await mk("s", "FEMME");
  const proposal = await RefugeService.proposeAsAdopte(c, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never);
  await RefugeService.adoptRefuge(s, proposal.id);
  return { c, s, sid: proposal.id };
}
async function endAdventure(x: { c: string; s: string; sid: string }) {
  const startedAt = new Date(Date.now() - 7 * DAY - HOUR);
  await prisma.refugeSession.update({ where: { id: x.sid }, data: { startedAt, endsAt: new Date(startedAt.getTime() + 7 * DAY) } });
  await RefugeService.getRefugeSession(x.sid, x.c);
}
const coins = async (u: string) => (await prisma.wallet.findUniqueOrThrow({ where: { userId: u } })).coins;
const attempt = async (f: () => Promise<unknown>) => { try { await f(); return "OK"; } catch (e: any) { return `${e.statusCode ?? ""} ${e.message}`; } };

afterAll(async () => {
  await prisma.match.deleteMany({ where: { OR: [{ userAId: { in: created } }, { userBId: { in: created } }] } });
  await prisma.reaction.deleteMany({ where: { OR: [{ fromId: { in: created } }, { toId: { in: created } }] } });
  await prisma.block.deleteMany({ where: { OR: [{ fromId: { in: created } }, { toId: { in: created } }] } });
  await prisma.user.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
});

describe("Refuge — archivage à la sortie de l'écran de fin", () => {
  test("chaque participant libère SA place indépendamment ; l'aventure, le bilan, les pièces et le match restent intacts", async () => {
    const x = await pair("indep");
    await endAdventure(x);
    await settle();
    const snapshot = async () => ({
      status: (await prisma.refugeSession.findUniqueOrThrow({ where: { id: x.sid } })).status,
      coins: [await coins(x.c), await coins(x.s)],
      matches: await prisma.match.count({ where: { OR: [{ userAId: x.c, userBId: x.s }, { userAId: x.s, userBId: x.c }] } }),
      results: await prisma.refugeDayResult.count({ where: { refugeSessionId: x.sid } }),
    });
    const before = await snapshot();
    expect(before.status).toBe("REVEALED");
    expect(before.matches).toBe(1);
    // Avant la sortie : l'aventure terminée reste affichée pour les deux.
    expect(((await RefugeService.getActiveRefugeSession(x.c)) as any)?.id).toBe(x.sid);
    expect(((await RefugeService.getActiveRefugeSession(x.s)) as any)?.id).toBe(x.sid);

    // Le compagnon quitte l'écran de fin : SA place est libérée, celle du parrain / de la marraine non.
    expect(await RefugeService.archiveSession(x.sid, x.c)).toEqual({ archived: true });
    expect(await RefugeService.getActiveRefugeSession(x.c)).toBeNull();
    expect(((await RefugeService.getActiveRefugeSession(x.s)) as any)?.id).toBe(x.sid);
    // Idempotent : un second appui (ou un rejeu réseau) ne change rien.
    const first = (await prisma.refugeSession.findUniqueOrThrow({ where: { id: x.sid } })).adopteArchivedAt;
    await RefugeService.archiveSession(x.sid, x.c);
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id: x.sid } })).adopteArchivedAt).toEqual(first);

    await RefugeService.archiveSession(x.sid, x.s);
    expect(await RefugeService.getActiveRefugeSession(x.s)).toBeNull();

    // Rien n'a été modifié : statut, pièces, match, résultats des jours ; le bilan reste consultable.
    expect(await snapshot()).toEqual(before);
    const kept: any = await RefugeService.getRefugeSession(x.sid, x.c);
    expect(kept.finalReport?.days).toHaveLength(7);
    expect(kept.otherProfile).toMatchObject({ userId: x.s, avatarConfig: AVATAR });
    expect(kept.revealMatch?.status).toBe("ACTIVE");
    const hist: any = await RefugeService.getRefugeHistory(x.c, 1, 20);
    expect(JSON.stringify(hist)).toContain(x.sid);
  }, 60000);

  test("après sa sortie, chacun peut commencer une NOUVELLE aventure, sans attendre l'autre", async () => {
    const x = await pair("again");
    await endAdventure(x);
    await RefugeService.archiveSession(x.sid, x.c);
    // Le compagnon propose un nouveau refuge alors que le parrain n'a pas encore quitté l'écran de fin.
    const again = await RefugeService.proposeAsAdopte(x.c, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never);
    expect(((await RefugeService.getActiveRefugeSession(x.c)) as any)?.id).toBe(again.id);
    // Le parrain / la marraine adopte un autre compagnon, sans avoir archivé : sa place n'est pas bloquée non plus.
    const z = await pair("other-companion");
    expect(z.sid).toBeTruthy();
    await RefugeService.archiveSession(x.sid, x.s);
    expect(await attempt(() => RefugeService.proposeAsAdopte(x.s, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never))).toBe("OK");
  }, 60000);

  test("refus tant que l'aventure n'est pas terminée ; refus pour un tiers ; session inconnue", async () => {
    const x = await pair("guards");
    expect(await attempt(() => RefugeService.archiveSession(x.sid, x.c))).toMatch(/^409/);
    await endAdventure(x);
    const stranger = await pair("stranger");
    expect(await attempt(() => RefugeService.archiveSession(x.sid, stranger.c))).toMatch(/^403/);
    expect(await attempt(() => RefugeService.archiveSession("00000000-0000-0000-0000-000000000000", x.c))).toMatch(/^404/);
    expect(await attempt(() => RefugeService.archiveSession(x.sid, x.c))).toBe("OK");
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id: x.sid } })).adoptantArchivedAt).toBeNull(); // l'autre n'est pas touché
  }, 60000);

  test("fin sans dévoilement (blocage) : affichée une fois, puis libérée à la sortie", async () => {
    const x = await pair("blocked");
    await prisma.block.create({ data: { fromId: x.s, toId: x.c } });
    await endAdventure(x);
    expect(((await RefugeService.getActiveRefugeSession(x.c)) as any)?.status).toBe("COMPLETED");
    await RefugeService.archiveSession(x.sid, x.c);
    expect(await RefugeService.getActiveRefugeSession(x.c)).toBeNull();
  }, 60000);

  test("aventures existantes : une ancienne fin sans dévoilement (COMPLETED / ABANDONED) ne réapparaît jamais ; une ancienne attente (ancien flux) peut être quittée", async () => {
    const x = await pair("old-completed");
    await endAdventure(x);
    // Simule une session terminée AVANT ce changement, archivée par la migration.
    await prisma.refugeSession.update({ where: { id: x.sid }, data: { status: "COMPLETED", adopteArchivedAt: new Date(), adoptantArchivedAt: new Date() } });
    expect(await RefugeService.getActiveRefugeSession(x.c)).toBeNull();
    expect(await RefugeService.getActiveRefugeSession(x.s)).toBeNull();
    const y = await pair("old-awaiting");
    await endAdventure(y);
    await prisma.refugeSession.update({ where: { id: y.sid }, data: { status: "AWAITING_REVEAL_CONSENT", revealedAt: null } });
    expect(((await RefugeService.getActiveRefugeSession(y.c)) as any)?.id).toBe(y.sid);
    await RefugeService.archiveSession(y.sid, y.c);
    expect(await RefugeService.getActiveRefugeSession(y.c)).toBeNull();
    expect((await prisma.refugeSession.findUniqueOrThrow({ where: { id: y.sid } })).status).toBe("AWAITING_REVEAL_CONSENT"); // jamais modifiée
  }, 60000);
});

describe("Refuge — GET /active : rôle du parrain / de la marraine (titre de la case d'accueil)", () => {
  test("le compagnon reçoit « marraine » ou « parrain » selon le genre ; le parrain / la marraine et une proposition en attente : rien", async () => {
    const x = await pair("role-f"); // parrain/marraine = FEMME
    const forCompanion: any = await RefugeService.getActiveRefugeSession(x.c);
    expect(forCompanion.sponsorRole).toBe("marraine");
    const forSponsor: any = await RefugeService.getActiveRefugeSession(x.s);
    expect(forSponsor.sponsorRole).toBeUndefined();

    await prisma.profile.update({ where: { userId: x.s }, data: { gender: "HOMME" } });
    expect(((await RefugeService.getActiveRefugeSession(x.c)) as any).sponsorRole).toBe("parrain");

    // Fin automatique non archivée : le rôle reste connu ; après archivage : plus de session (retour à « Refuge »).
    await endAdventure(x);
    expect(((await RefugeService.getActiveRefugeSession(x.c)) as any).sponsorRole).toBe("parrain");
    await RefugeService.archiveSession(x.sid, x.c);
    expect(await RefugeService.getActiveRefugeSession(x.c)).toBeNull();

    // Proposition en attente (personne n'a encore adopté) : aucun rôle.
    const waiting = await RefugeService.proposeAsAdopte(x.c, { animalType: "CHAT", acceptedSexe: "HOMME_FEMME" } as never);
    const w: any = await RefugeService.getActiveRefugeSession(x.c);
    expect(w.id).toBe(waiting.id);
    expect(w.sponsorRole).toBeUndefined();
  }, 60000);
});
