import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import * as game from "../../src/modules/card-game/card-game.service";

const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const users: string[] = [];
async function player() {
  const id = "card-concurrency-" + Date.now() + "-" + Math.random().toString(36).slice(2,9);
  users.push(id);
  await prisma.user.create({data:{id,email:id+"@test.local",passwordHash:"test",role:"USER",isVerified:true,premiumTier:"FREE"}});
  await prisma.wallet.create({data:{userId:id,coins:20}});
  return id;
}
afterEach(async () => {
  await prisma.cardGameSession.deleteMany({where:{userId:{in:users}}});
  await prisma.coinTransaction.deleteMany({where:{walletId:{in:users}}});
  await prisma.wallet.deleteMany({where:{userId:{in:users}}});
  await prisma.user.deleteMany({where:{id:{in:users}}});
  users.length = 0;
});
describe("Card game PostgreSQL concurrency", () => {
  test("simultaneous starts buy only one session and debit exactly 20", async () => {
    const id=await player();
    const res=await Promise.allSettled([game.start(id),game.start(id),game.start(id)]);
    const sessions=await prisma.cardGameSession.findMany({where:{userId:id}});
    expect(sessions).toHaveLength(1);
    expect((await prisma.wallet.findUniqueOrThrow({where:{userId:id}})).coins).toBe(0);
    expect(await prisma.coinTransaction.count({where:{walletId:id,type:"GAME_ENTRY"}})).toBe(1);
    for(const outcome of res) if(outcome.status==="fulfilled") expect(outcome.value.sessionId).toBe(sessions[0]!.id);
  });
  test("simultaneous claim and bet pay winning session at most once", async () => {
    const id=await player();
    const {sessionId}=await game.start(id);
    await prisma.cardGameSession.update({where:{id:sessionId},data:{gainsCurrent:35}});
    const results=await Promise.allSettled([game.claim(id,sessionId),game.claim(id,sessionId)]);
    expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect((await prisma.wallet.findUniqueOrThrow({where:{userId:id}})).coins).toBe(35);
    expect(await prisma.coinTransaction.count({where:{walletId:id,type:"GAME_WIN"}})).toBe(1);
  });
});
