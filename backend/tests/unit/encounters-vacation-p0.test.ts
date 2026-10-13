import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  userSettings: { findUnique: vi.fn(), upsert: vi.fn() },
  user: { findUnique: vi.fn() },
  match: { count: vi.fn() },
}));
vi.mock("../../src/config/prisma", () => ({ prisma: db }));
import { getUserSettings, updateUserSettings } from "../../src/modules/profiles/userSettings.service";

beforeEach(() => {
  vi.clearAllMocks();
  db.userSettings.findUnique.mockResolvedValue(null);
  db.userSettings.upsert.mockImplementation(async ({ update }: any) => update);
  db.user.findUnique.mockResolvedValue({ premiumTier: "FREE", premiumUntil: null });
  db.match.count.mockResolvedValue(0);
});
describe("P0 vacation mode settings", () => {
  it("starts with vacation mode disabled", async () => {
    expect((await getUserSettings("alice")).vacationMode).toBe(false);
  });
  it("records when vacation mode starts", async () => {
    const result = await updateUserSettings("alice", { vacationMode: true });
    expect(result.vacationMode).toBe(true);
    expect(db.userSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ vacationStartedAt: expect.any(Date) }) }),
    );
    expect(db.match.count).not.toHaveBeenCalled();
  });
  it("blocks returning from vacation if contact quota would be exceeded", async () => {
    db.match.count.mockResolvedValue(6);
    await expect(updateUserSettings("alice", { vacationMode: false })).rejects.toThrow();
    expect(db.userSettings.upsert).not.toHaveBeenCalled();
  });
  it("allows returning when contact quota is satisfied", async () => {
    db.match.count.mockResolvedValue(3);
    await updateUserSettings("alice", { vacationMode: false });
    expect(db.userSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ vacationStartedAt: null }) }),
    );
  });
});
