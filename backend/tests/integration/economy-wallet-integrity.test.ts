import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { listCatalog as offeringsCatalog, sendOffering } from "../../src/modules/offerings/offerings.service";
import { listCatalog as magicCatalog, castSpell } from "../../src/modules/magies/magies.service";

const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const ids: string[] = [];

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
  await prisma.offeringCatalog.deleteMany({where:{id:"off_biere"}});
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
    const attempts = await Promise.allSettled([
      sendOffering(sender,{offeringId:"off_biere",toUserId:target}),
      sendOffering(sender,{offeringId:"off_biere",toUserId:target}),
    ]);
    expect(attempts.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect((await prisma.wallet.findUniqueOrThrow({where:{userId:sender}})).coins).toBe(0);
    expect(await prisma.coinTransaction.count({where:{walletId:sender,amount:-5,type:"OFFERING_SENT"}})).toBe(1);
  });

  test("casts approved magic for 20 coins despite an obsolete stored cost", async () => {
    const sender=await makeUser("wizard",20);
    await prisma.magieCatalog.create({data:{
      id:"mag_grenouille",name:"Grenouille",emoji:"🐸",cost:60,
      durationSec:60,type:"TRANSFORMATION",enabled:true,
    }});
    const listing=await magicCatalog();
    expect(listing.spells.find(s=>s.id==="mag_grenouille")?.cost).toBe(20);
    await castSpell(sender,{magieId:"mag_grenouille",toUserId:sender});
    expect((await prisma.wallet.findUniqueOrThrow({where:{userId:sender}})).coins).toBe(0);
    expect(await prisma.coinTransaction.count({where:{walletId:sender,amount:-20,type:"POWER_USED"}})).toBe(1);
  });
});
