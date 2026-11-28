import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { listCatalog as offeringsCatalog, sendOffering } from "../../src/modules/offerings/offerings.service";
import { listCatalog as magicCatalog, castSpell } from "../../src/modules/magies/magies.service";

const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const ids: string[] = [];
const sessionIds: string[] = [];

/**
 * Depuis la phase « sécurité salons », une offrande de salon ou un sort exige un salon ET une session
 * ouverte commune : on place donc les utilisateurs dans une même session (prix et concurrence inchangés).
 */
async function shareSession(userIds: string[]) {
  const salon = await prisma.salon.upsert({
    where: { kind: "PISCINE" },
    update: {},
    create: { kind: "PISCINE", name: "La Piscine (test)", isActive: true },
  });
  const session = await prisma.salonSession.create({
    data: {
      salonKind: "PISCINE",
      expiresAt: new Date(Date.now() + 3_600_000),
      participants: { create: [...new Set(userIds)].map((userId) => ({ userId, status: "ACTIVE" as const })) },
    },
  });
  sessionIds.push(session.id);
  return { salonId: salon.id, sessionId: session.id };
}

async function makeUser(role: string, coins: number) {
  const id = `economy-wallet-${role}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  ids.push(id);
  await prisma.user.create({data:{id,email:id+"@test.local",passwordHash:"test",role:"USER",isVerified:true,premiumTier:"FREE"}});
  await prisma.wallet.create({data:{userId:id,coins}});
  return id;
}
afterEach(async () => {
  await prisma.offeringSent.deleteMany({where:{fromUserId:{in:ids}}});
  await prisma.magieCast.deleteMany({where:{fromUserId:{in:ids}}});
  await prisma.coinTransaction.deleteMany({where:{walletId:{in:ids}}});
  await prisma.wallet.deleteMany({where:{userId:{in:ids}}});
  await prisma.user.deleteMany({where:{id:{in:ids}}});
  await prisma.salonSession.deleteMany({where:{id:{in:sessionIds}}});
  sessionIds.length = 0;
  await prisma.offeringCatalog.deleteMany({where:{id:{in:["off_biere","desk_rose"]}}});
  await prisma.magieCatalog.deleteMany({where:{id:"mag_grenouille"}});
  ids.length = 0;
});

describe("Canonical economy wallet debits (PostgreSQL)", () => {
  test("offers drink for 5 coins despite stale database price and never overdrafts concurrently", async () => {
    const sender = await makeUser("sender",5), target=await makeUser("target",0);
    await prisma.offeringCatalog.create({data:{
      id:"off_biere",name:"Bière ancienne",emoji:"🍺",cost:30,category:"BOISSON",
      durationMs:null,stackPriority:1,enabled:true,consumptionMode:"SHARED",
    }});
    const listing = await offeringsCatalog();
    expect(listing.find(o=>o.id==="off_biere")?.cost).toBe(5);
    const room = await shareSession([sender, target]);
    const attempts = await Promise.allSettled([
      sendOffering(sender,{offeringId:"off_biere",toUserId:target,...room}),
      sendOffering(sender,{offeringId:"off_biere",toUserId:target,...room}),
    ]);
    expect(attempts.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect((await prisma.wallet.findUniqueOrThrow({where:{userId:sender}})).coins).toBe(0);
    expect(await prisma.coinTransaction.count({where:{walletId:sender,amount:-5,type:"OFFERING_SENT"}})).toBe(1);
  });

  test("concurrent personal gifts: only one succeeds, expired gift can be sent again", async () => {
    const senderA = await makeUser("desk-a", 300);
    const senderB = await makeUser("desk-b", 300);
    const recipient = await makeUser("desk-recipient", 0);
    await prisma.offeringCatalog.create({ data: {
      id: "desk_rose", name: "Rose éternelle", emoji: "🌹", cost: 120,
      category: "SYMBOLIQUE", durationMs: 6 * 24 * 60 * 60 * 1000,
      stackPriority: 1, enabled: true, consumptionMode: "PRIVATE",
    } });
    const attempts = await Promise.allSettled([
      sendOffering(senderA, { offeringId: "desk_rose", toUserId: recipient }),
      sendOffering(senderB, { offeringId: "desk_rose", toUserId: recipient }),
    ]);
    expect(attempts.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.offeringSent.count({ where: { toUserId: recipient, offeringId: "desk_rose" } })).toBe(1);
    const balances = await Promise.all([senderA, senderB].map(userId =>
      prisma.wallet.findUniqueOrThrow({ where: { userId } })));
    expect(balances.map(w => w.coins).sort((a,b) => a-b)).toEqual([180, 300]);
    expect(await prisma.coinTransaction.count({ where: {
      walletId: { in: [senderA, senderB] }, type: "OFFERING_SENT",
    } })).toBe(1);

    await prisma.offeringSent.updateMany({
      where: { toUserId: recipient, offeringId: "desk_rose" },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const previouslyRejected = attempts[0].status === "rejected" ? senderA : senderB;
    await sendOffering(previouslyRejected, { offeringId: "desk_rose", toUserId: recipient });
    expect(await prisma.offeringSent.count({ where: { toUserId: recipient, offeringId: "desk_rose" } })).toBe(2);
  });

  test("casts approved magic for 20 coins despite an obsolete stored cost", async () => {
    const sender=await makeUser("wizard",20);
    await prisma.magieCatalog.create({data:{
      id:"mag_grenouille",name:"Grenouille",emoji:"🐸",cost:60,
      durationSec:60,type:"TRANSFORMATION",enabled:true,
    }});
    const listing=await magicCatalog();
    expect(listing.spells.find(s=>s.id==="mag_grenouille")?.cost).toBe(20);
    const room = await shareSession([sender]);
    await castSpell(sender,{magieId:"mag_grenouille",toUserId:sender,salonId:room.salonId});
    expect((await prisma.wallet.findUniqueOrThrow({where:{userId:sender}})).coins).toBe(0);
    expect(await prisma.coinTransaction.count({where:{walletId:sender,amount:-20,type:"POWER_USED"}})).toBe(1);
  });
});
