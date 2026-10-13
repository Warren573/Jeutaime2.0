import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma";
import { RefugeService } from "../../src/modules/refuge/refuge.service";

const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const createdUsers: string[] = [];

async function user(role: string) {
  const id = "refuge-credit-" + role + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  createdUsers.push(id);
  await prisma.user.create({data:{id,email:id+"@test.local",passwordHash:"test_hash",role:"USER",isVerified:true,premiumTier:"FREE"}});
  await prisma.wallet.create({data:{userId:id,coins:0}});
  return id;
}

async function makeCompletedSession(missedDay: number | null = null) {
  const adopteId = await user("adopte");
  const adoptantId = await user("adoptant");
  const startedAt = new Date(Date.now() - 9 * 86400000);
  const session = await prisma.refugeSession.create({
    data: {
      adopteId, adoptantId, animalType:"CHAT",animalCategory:"SIMPLE",
      animalSexe:"FEMELLE",animalAgeMonths:24,acceptedSexe:"HOMME_FEMME",
      status:"COMPLETED",startedAt,endsAt:new Date(Date.now()-2*86400000),
    },
  });
  for (let dayNumber=1;dayNumber<=7;dayNumber++) {
    await prisma.refugeDailyChoice.create({
      data:{refugeSessionId:session.id,dayNumber,action1:"JOUER",action2:"CARESSER"},
    });
    if(dayNumber !== missedDay) {
      await prisma.refugeGuess.create({
        data:{refugeSessionId:session.id,dayNumber,guessedAction1:"JOUER",guessedAction2:"CARESSER"},
      });
    }
    await prisma.refugeDayResult.create({
      data:{
        refugeSessionId:session.id,dayNumber,
        status:dayNumber===missedDay?"INCOMPLETE_ADOPTANT_MISSING":"PERFECT",
        matchCount:dayNumber===missedDay?null:2,
        adopteCoinsDelta:0,adoptantCoinsDelta:0,
      },
    });
  }
  return {id:session.id,adopteId,adoptantId};
}

afterEach(async()=> {
  if (!createdUsers.length) return;
  await prisma.user.deleteMany({where:{id:{in:createdUsers}}});
  createdUsers.length=0;
});

describe("Refuge final wallet credits in PostgreSQL",()=>{
  test("four simultaneous closures issue one +100 reward per player", async()=>{
    const session=await makeCompletedSession();
    await Promise.all(Array.from({length:4},()=>RefugeService.closePastDays(session.id)));
    for(const id of [session.adopteId,session.adoptantId]) {
      expect((await prisma.wallet.findUniqueOrThrow({where:{userId:id}})).coins).toBe(100);
      expect(await prisma.coinTransaction.count({where:{walletId:id,type:"REFUGE_PARTICIPATION_REWARD"}})).toBe(1);
    }
  });
  test("missing a day prevents the absent player's final reward",async()=>{
    const session=await makeCompletedSession(4);
    await RefugeService.closePastDays(session.id);
    expect((await prisma.wallet.findUniqueOrThrow({where:{userId:session.adopteId}})).coins).toBe(50);
    expect((await prisma.wallet.findUniqueOrThrow({where:{userId:session.adoptantId}})).coins).toBe(0);
  });
});
