import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { getWeeklyProfileWinners } from "../../src/modules/weekly-profile/weekly-profile.service";
import { awardPreviousWeekWinners } from "../../src/modules/weekly-profile/weekly-profile.rewards";

vi.mock("../../src/modules/weekly-profile/weekly-profile.service", () => ({
  getWeeklyProfileWinners: vi.fn(),
}));
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const ids: string[] = [];

async function createParticipant(suffix: string) {
  const id = `weekly-reward-test-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  ids.push(id);
  await prisma.user.create({ data: {
    id, email: `${id}@example.test`, passwordHash: "test-hash",
    role: "USER", isVerified: true, premiumTier: "FREE",
  } });
  await prisma.wallet.create({ data: { userId: id, coins: 0 } });
  return id;
}

afterEach(async () => {
  vi.resetAllMocks();
  if (!ids.length) return;
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  ids.length = 0;
});
describe("Weekly H/F winner payouts (PostgreSQL)", () => {
  test("awards +50 each exactly once across repeated job executions", async () => {
    const maleId = await createParticipant("m");
    const femaleId = await createParticipant("f");
    const winner = (id: string) => ({ id, totalVotes: 8 });
    vi.mocked(getWeeklyProfileWinners).mockResolvedValue({
      weekKey: "2026-W40", male: winner(maleId), female: winner(femaleId),
    } as Awaited<ReturnType<typeof getWeeklyProfileWinners>>);
    expect(await awardPreviousWeekWinners()).toBe(2);
    expect(await awardPreviousWeekWinners()).toBe(0);
    for (const id of [maleId, femaleId]) {
      expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: id } })).coins).toBe(50);
      expect(await prisma.coinTransaction.count({where:{ walletId:id, type:"ADMIN_ADJUST"}})).toBe(1);
    }
  });
  test("concurrent payouts remain idempotent", async () => {
    const maleId = await createParticipant("concurrent-m");
    const femaleId = await createParticipant("concurrent-f");
    const winner = (id: string) => ({ id, totalVotes: 9 });
    vi.mocked(getWeeklyProfileWinners).mockResolvedValue({
      weekKey: "2026-W41", male: winner(maleId), female: winner(femaleId),
    } as Awaited<ReturnType<typeof getWeeklyProfileWinners>>);
    const results = await Promise.all(Array.from({ length: 4 }, () => awardPreviousWeekWinners()));
    expect(results.reduce((sum, amount) => sum + amount, 0)).toBe(2);
    for (const id of [maleId, femaleId]) {
      expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: id } })).coins).toBe(50);
      expect(await prisma.coinTransaction.count({ where: { walletId: id, type: "ADMIN_ADJUST" } })).toBe(1);
    }
  });
  test("does not credit a week with no winners", async () => {
    vi.mocked(getWeeklyProfileWinners).mockResolvedValue({
      weekKey: "2026-W40", male: null, female: null,
    });
    expect(await awardPreviousWeekWinners()).toBe(0);
  });
});
