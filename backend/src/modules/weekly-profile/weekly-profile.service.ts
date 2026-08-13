import { CoinTxnType, Gender, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../core/errors";
import { computeProfileStatus } from "../../policies/profiles";

const VOTE_REWARD = 5;
const DAILY_LIMIT_FREE = 10;
const DAILY_LIMIT_PREMIUM = 20;
const DUEL_TTL_MS = 15 * 60 * 1000;

export interface DuelProfileDto { id: string; pseudo: string; age: number; city: string; bio: string | null; avatarConfig: Record<string, unknown> | null; }
export interface DuelDto { duelId: string; candidateA: DuelProfileDto; candidateB: DuelProfileDto; }
export interface WeeklyProfileStateDto { remainingToday: number; dailyLimit: number; limitReached: boolean; notEnoughCandidates: boolean; duel: DuelDto | null; }
export interface WeeklyProfileWinnerDto { id: string; pseudo: string; age: number; city: string; bio: string | null; avatarConfig: Record<string, unknown> | null; gender: Gender; totalVotes: number; weekKey: string; }
export interface WeeklyProfileWinnersDto { weekKey: string; male: WeeklyProfileWinnerDto | null; female: WeeklyProfileWinnerDto | null; }

export function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
function getPreviousWeekKey(now: Date): string { const prev = new Date(now); prev.setUTCDate(prev.getUTCDate() - 7); return getWeekKey(prev); }
function getDayKey(date: Date): string { return date.toISOString().slice(0, 10); }
function computeAge(birthDate: Date): number { const now = new Date(); let age = now.getUTCFullYear() - birthDate.getUTCFullYear(); const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth(); if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birthDate.getUTCDate())) age--; return age; }
function dailyLimitFor(isPremium: boolean): number { return isPremium ? DAILY_LIMIT_PREMIUM : DAILY_LIMIT_FREE; }
function pairKey(a: string, b: string): string { return [a, b].sort().join("::"); }
function otherMainGender(gender: Gender): Gender { return gender === Gender.HOMME ? Gender.FEMME : Gender.HOMME; }

interface EligibleProfile { id: string; pseudo: string; city: string; bio: string | null; gender: Gender; birthDate: Date; avatarConfig: Record<string, unknown> | null; }
const ELIGIBILITY_SELECT = { id: true, isBanned: true, settings: { select: { showInDiscovery: true } }, profile: { select: { pseudo: true, city: true, bio: true, gender: true, birthDate: true, avatarConfig: true, interestedIn: true, lookingFor: true, physicalDesc: true, height: true, vibe: true, quote: true, questions: true } } } satisfies Prisma.UserSelect;
type EligibilityUser = Prisma.UserGetPayload<{ select: typeof ELIGIBILITY_SELECT }>;
type EligibleUser = EligibilityUser & { profile: NonNullable<EligibilityUser["profile"]> };
function isEligible(u: EligibilityUser): u is EligibleUser {
  if (u.isBanned || (u.settings && !u.settings.showInDiscovery) || !u.profile || !u.profile.bio?.trim()) return false;
  return computeProfileStatus({ bio: u.profile.bio, interestedIn: u.profile.interestedIn, lookingFor: u.profile.lookingFor, physicalDesc: u.profile.physicalDesc, city: u.profile.city, height: u.profile.height, vibe: u.profile.vibe, quote: u.profile.quote, questions: u.profile.questions }).isComplete;
}
function toEligibleProfile(u: EligibleUser): EligibleProfile { return { id: u.id, pseudo: u.profile.pseudo, city: u.profile.city, bio: u.profile.bio, gender: u.profile.gender, birthDate: u.profile.birthDate, avatarConfig: (u.profile.avatarConfig || null) as Record<string, unknown> | null }; }
async function getEligibleProfiles(excludeUserId: string): Promise<EligibleProfile[]> {
  const blocks = await prisma.block.findMany({ where: { OR: [{ fromId: excludeUserId }, { toId: excludeUserId }] }, select: { fromId: true, toId: true } });
  const blockedIds = new Set(blocks.flatMap((b) => [b.fromId, b.toId]).filter((id) => id !== excludeUserId));
  const users = await prisma.user.findMany({ where: { id: { not: excludeUserId, notIn: [...blockedIds] } }, select: ELIGIBILITY_SELECT });
  return users.filter(isEligible).map(toEligibleProfile);
}
async function candidatePairIsEligible(voterId: string, a: string, b: string): Promise<boolean> {
  const ids = new Set((await getEligibleProfiles(voterId)).map((p) => p.id));
  return ids.has(a) && ids.has(b);
}
function toDuelProfileDto(p: EligibleProfile): DuelProfileDto { return { id: p.id, pseudo: p.pseudo, age: computeAge(p.birthDate), city: p.city, bio: p.bio, avatarConfig: p.avatarConfig }; }
function rankProfiles(eligible: EligibleProfile[], seenProfileIds: Set<string>, exposure: Map<string, number>): EligibleProfile[] { return [...eligible].sort((a,b) => { const seenDiff=(seenProfileIds.has(a.id)?1:0)-(seenProfileIds.has(b.id)?1:0); if(seenDiff) return seenDiff; const exp=(exposure.get(a.id)??0)-(exposure.get(b.id)??0); return exp || a.id.localeCompare(b.id); }); }
function pickPair(ranked: EligibleProfile[], seenPairs: Set<string>): [EligibleProfile, EligibleProfile] | null {
  for(let i=0;i<ranked.length;i++) for(let j=i+1;j<ranked.length;j++) { const a=ranked[i],b=ranked[j]; if(a&&b&&!seenPairs.has(pairKey(a.id,b.id))) return [a,b]; }
  return null;
}
async function preferredGenderForNextComparison(voterId: string, now: Date): Promise<Gender> {
  const votesToday = await prisma.weeklyProfileDuel.count({ where: { userId: voterId, dayKey: getDayKey(now), usedAt: { not: null } } });
  return votesToday % 2 === 0 ? Gender.HOMME : Gender.FEMME;
}
async function historyForVoter(voterId: string) {
  const past = await prisma.weeklyProfileDuel.findMany({ where: { userId: voterId }, select: { candidateAId: true, candidateBId: true } });
  const seenProfileIds = new Set<string>();
  const seenPairs = new Set<string>();
  for (const d of past) { seenProfileIds.add(d.candidateAId); seenProfileIds.add(d.candidateBId); seenPairs.add(pairKey(d.candidateAId, d.candidateBId)); }
  return { seenProfileIds, seenPairs };
}
async function exposureFor(ids: string[]): Promise<Map<string, number>> {
  const [ea, eb] = await Promise.all([
    prisma.weeklyProfileDuel.groupBy({ by:["candidateAId"], where:{candidateAId:{in:ids}}, _count:{candidateAId:true} }),
    prisma.weeklyProfileDuel.groupBy({ by:["candidateBId"], where:{candidateBId:{in:ids}}, _count:{candidateBId:true} }),
  ]);
  const exposure = new Map<string, number>();
  for(const e of ea) exposure.set(e.candidateAId,(exposure.get(e.candidateAId)??0)+e._count.candidateAId);
  for(const e of eb) exposure.set(e.candidateBId,(exposure.get(e.candidateBId)??0)+e._count.candidateBId);
  return exposure;
}
async function buildDuelCandidates(voterId: string, targetGender: Gender): Promise<[EligibleProfile, EligibleProfile] | null> {
  const eligible=(await getEligibleProfiles(voterId)).filter((p) => p.gender === targetGender);
  if(eligible.length<2) return null;
  const { seenProfileIds, seenPairs } = await historyForVoter(voterId);
  return pickPair(rankProfiles(eligible, seenProfileIds, await exposureFor(eligible.map(p=>p.id))), seenPairs);
}
async function buildMixedCandidates(voterId: string): Promise<[EligibleProfile, EligibleProfile] | null> {
  const eligible = await getEligibleProfiles(voterId);
  const men = eligible.filter((p) => p.gender === Gender.HOMME);
  const women = eligible.filter((p) => p.gender === Gender.FEMME);
  if (!men.length || !women.length) return null;
  const { seenProfileIds, seenPairs } = await historyForVoter(voterId);
  const exposure = await exposureFor(eligible.map((p) => p.id));
  const rankedMen = rankProfiles(men, seenProfileIds, exposure);
  const rankedWomen = rankProfiles(women, seenProfileIds, exposure);
  for (const man of rankedMen) {
    for (const woman of rankedWomen) {
      if (!seenPairs.has(pairKey(man.id, woman.id))) return [man, woman];
    }
  }
  return null;
}
async function getOrCreateDuel(voterId:string):Promise<DuelDto|null>{
  const now=new Date();
  const preferredGender = await preferredGenderForNextComparison(voterId, now);
  const pending=await prisma.weeklyProfileDuel.findFirst({where:{userId:voterId,usedAt:null,expiresAt:{gt:now}},orderBy:{createdAt:"desc"}});
  if(pending){
    if(await candidatePairIsEligible(voterId,pending.candidateAId,pending.candidateBId)) return {duelId:pending.id,candidateA:await profileDtoFor(pending.candidateAId),candidateB:await profileDtoFor(pending.candidateBId)};
    await prisma.weeklyProfileDuel.updateMany({where:{id:pending.id,usedAt:null},data:{expiresAt:now}});
  }
  let pair=await buildDuelCandidates(voterId, preferredGender);
  if(!pair) pair=await buildDuelCandidates(voterId, otherMainGender(preferredGender));
  if(!pair) pair=await buildMixedCandidates(voterId);
  if(!pair) return null;
  const [a,b]=pair; const created=await prisma.weeklyProfileDuel.create({data:{userId:voterId,candidateAId:a.id,candidateBId:b.id,expiresAt:new Date(now.getTime()+DUEL_TTL_MS)}}); return {duelId:created.id,candidateA:toDuelProfileDto(a),candidateB:toDuelProfileDto(b)};
}
async function profileDtoFor(userId:string):Promise<DuelProfileDto>{const user=await prisma.user.findUnique({where:{id:userId},select:{profile:{select:{pseudo:true,city:true,bio:true,birthDate:true,avatarConfig:true}}}});if(!user?.profile)return{id:userId,pseudo:"Profil supprimé",age:0,city:"",bio:null,avatarConfig:null};return{id:userId,pseudo:user.profile.pseudo,age:computeAge(user.profile.birthDate),city:user.profile.city,bio:user.profile.bio,avatarConfig:user.profile.avatarConfig as Record<string,unknown>|null};}
export async function getWeeklyProfileState(voterId:string,isPremium:boolean):Promise<WeeklyProfileStateDto>{const now=new Date(),dayKey=getDayKey(now),dailyLimit=dailyLimitFor(isPremium);const votesToday=await prisma.weeklyProfileDuel.count({where:{userId:voterId,dayKey,usedAt:{not:null}}});const remainingToday=Math.max(0,dailyLimit-votesToday);if(remainingToday<=0)return{remainingToday:0,dailyLimit,limitReached:true,notEnoughCandidates:false,duel:null};const duel=await getOrCreateDuel(voterId);return{remainingToday,dailyLimit,limitReached:false,notEnoughCandidates:duel===null,duel};}
export async function voteForDuel(voterId:string,isPremium:boolean,duelId:string,chosenId:string):Promise<WeeklyProfileStateDto>{
  const duel=await prisma.weeklyProfileDuel.findUnique({where:{id:duelId}});if(!duel)throw new NotFoundError("Duel");if(duel.userId!==voterId)throw new ForbiddenError("Ce duel ne t'appartient pas");if(duel.usedAt)throw new ConflictError("Ce duel a déjà été utilisé");const now=new Date();if(duel.expiresAt<=now)throw new ConflictError("Ce duel a expiré");if(chosenId!==duel.candidateAId&&chosenId!==duel.candidateBId)throw new BadRequestError("Le profil choisi ne fait pas partie de ce duel");
  if(!await candidatePairIsEligible(voterId,duel.candidateAId,duel.candidateBId)){await prisma.weeklyProfileDuel.updateMany({where:{id:duelId,usedAt:null},data:{expiresAt:now}});throw new ConflictError("Cette comparaison n'est plus disponible");}
  const dayKey=getDayKey(now),weekKey=getWeekKey(now),dailyLimit=dailyLimitFor(isPremium);const votesToday=await prisma.weeklyProfileDuel.count({where:{userId:voterId,dayKey,usedAt:{not:null}}});if(votesToday>=dailyLimit)throw new ConflictError("Limite quotidienne de votes atteinte");
  await prisma.$transaction(async(tx)=>{const claimed=await tx.weeklyProfileDuel.updateMany({where:{id:duelId,usedAt:null},data:{usedAt:now,chosenId,weekKey,dayKey}});if(claimed.count!==1)throw new ConflictError("Ce duel a déjà été utilisé");const wallet=await tx.wallet.findUnique({where:{userId:voterId},select:{userId:true}});if(!wallet)throw new NotFoundError("Wallet");const updated=await tx.wallet.update({where:{userId:voterId},data:{coins:{increment:VOTE_REWARD}},select:{coins:true}});await tx.coinTransaction.create({data:{walletId:voterId,type:CoinTxnType.WEEKLY_PROFILE_VOTE,amount:VOTE_REWARD,balance:updated.coins,meta:{duelId,candidateAId:duel.candidateAId,candidateBId:duel.candidateBId,chosenId,weekKey} as Prisma.InputJsonValue}});});
  return getWeeklyProfileState(voterId,isPremium);
}

interface WinnerVoteRow{chosenId:string;candidateAId:string;candidateBId:string;usedAt:Date;}
function pickWinnerAmong(candidateIds:string[],totalsById:Map<string,number>,votesById:Map<string,Date[]>,votesForGender:WinnerVoteRow[]):string|null{if(!candidateIds.length)return null;if(candidateIds.length===1){const id=candidateIds[0]!;return(totalsById.get(id)??0)>0?id:null;}const max=Math.max(...candidateIds.map(id=>totalsById.get(id)??0));if(max===0)return null;let tied=candidateIds.filter(id=>(totalsById.get(id)??0)===max);if(tied.length===1)return tied[0]!;const set=new Set(tied),h=new Map<string,number>(tied.map(id=>[id,0]));for(const v of votesForGender){if(!set.has(v.chosenId))continue;const other=v.candidateAId===v.chosenId?v.candidateBId:v.candidateAId;if(set.has(other))h.set(v.chosenId,(h.get(v.chosenId)??0)+1);}const mh=Math.max(...tied.map(id=>h.get(id)??0));tied=tied.filter(id=>(h.get(id)??0)===mh);if(tied.length===1)return tied[0]!;const reached=new Map<string,number>(tied.map(id=>[id,Math.max(...(votesById.get(id)??[]).map(d=>d.getTime()))]));const min=Math.min(...tied.map(id=>reached.get(id)!));tied=tied.filter(id=>reached.get(id)===min);return tied.length===1?tied[0]!:([...tied].sort()[0]??null);}
export async function getWeeklyProfileWinners():Promise<WeeklyProfileWinnersDto>{const weekKey=getPreviousWeekKey(new Date());const votes=await prisma.weeklyProfileDuel.findMany({where:{weekKey,usedAt:{not:null}},select:{chosenId:true,candidateAId:true,candidateBId:true,usedAt:true}});if(!votes.length)return{weekKey,male:null,female:null};const participantIds=new Set<string>();for(const v of votes){participantIds.add(v.candidateAId);participantIds.add(v.candidateBId);}const users=await prisma.user.findMany({where:{id:{in:[...participantIds]}},select:ELIGIBILITY_SELECT});const profileById=new Map(users.filter(isEligible).map(u=>[u.id,toEligibleProfile(u)]));const used:WinnerVoteRow[]=votes.filter((v):v is typeof v&{chosenId:string}=>v.chosenId!==null).map(v=>({chosenId:v.chosenId,candidateAId:v.candidateAId,candidateBId:v.candidateBId,usedAt:v.usedAt!}));const totals=new Map<string,number>(),dates=new Map<string,Date[]>();for(const v of used){if(!profileById.has(v.chosenId))continue;totals.set(v.chosenId,(totals.get(v.chosenId)??0)+1);const a=dates.get(v.chosenId)??[];a.push(v.usedAt);dates.set(v.chosenId,a);}function winner(gender:Gender):WeeklyProfileWinnerDto|null{const ids=[...participantIds].filter(id=>profileById.get(id)?.gender===gender);const id=pickWinnerAmong(ids,totals,dates,used);if(!id)return null;const p=profileById.get(id)!;return{id,pseudo:p.pseudo,age:computeAge(p.birthDate),city:p.city,bio:p.bio,avatarConfig:p.avatarConfig,gender,totalVotes:totals.get(id)??0,weekKey};}return{weekKey,male:winner(Gender.HOMME),female:winner(Gender.FEMME)};}
