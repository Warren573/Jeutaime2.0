import { describe, it, expect } from "vitest";
import {
  calculateRefugeEndsAt,
  getCurrentDay,
  calculateStartedAtForDay,
  calculateHearts,
  canAttemptTodayForDay,
  todaySubmittedForDay,
  generateRandomDailyActions,
  isRefugeExpired,
  REFUGE_DURATION_DAYS,
} from "../../src/modules/refuge/refuge.utils";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("Refuge utils", () => {
  describe("getCurrentDay", () => {
    const createdAt = new Date("2026-07-01T10:00:00Z");

    it("returns 0 when the session has not started", () => {
      expect(getCurrentDay(createdAt, null)).toBe(0);
    });

    it("returns 1 on the first day", () => {
      const startedAt = new Date("2026-07-02T10:00:00Z");
      const now = new Date(startedAt.getTime() + 2 * 60 * 60 * 1000); // +2h
      expect(getCurrentDay(createdAt, startedAt, now)).toBe(1);
    });

    it("returns 4 after 3 full days", () => {
      const startedAt = new Date("2026-07-02T10:00:00Z");
      const now = new Date(startedAt.getTime() + 3 * DAY_MS + 1000);
      expect(getCurrentDay(createdAt, startedAt, now)).toBe(4);
    });

    it("caps at REFUGE_DURATION_DAYS", () => {
      const startedAt = new Date("2026-07-02T10:00:00Z");
      const now = new Date(startedAt.getTime() + 30 * DAY_MS);
      expect(getCurrentDay(createdAt, startedAt, now)).toBe(REFUGE_DURATION_DAYS);
    });
  });

  describe("calculateStartedAtForDay (DEV time travel)", () => {
    it("produces a startedAt for which the backend observes exactly the target day", () => {
      const now = new Date("2026-07-15T12:00:00Z");
      const createdAt = new Date("2026-07-10T09:00:00Z");
      for (let day = 1; day <= REFUGE_DURATION_DAYS; day++) {
        const startedAt = calculateStartedAtForDay(day, now);
        expect(getCurrentDay(createdAt, startedAt, now)).toBe(day);
      }
    });

    it("rejects out-of-range days", () => {
      expect(() => calculateStartedAtForDay(0)).toThrow();
      expect(() => calculateStartedAtForDay(8)).toThrow();
    });
  });

  describe("calculateRefugeEndsAt", () => {
    it("adds exactly 7 days", () => {
      const start = new Date("2026-07-01T10:00:00Z");
      expect(calculateRefugeEndsAt(start).getTime() - start.getTime()).toBe(7 * DAY_MS);
    });
  });

  describe("isRefugeExpired", () => {
    it("is false with no endsAt and true past endsAt", () => {
      expect(isRefugeExpired(null)).toBe(false);
      expect(isRefugeExpired(new Date(Date.now() - 1000))).toBe(true);
      expect(isRefugeExpired(new Date(Date.now() + 1000))).toBe(false);
    });
  });

  describe("calculateHearts", () => {
    const choice = { dayNumber: 1, action1: "NOURRIR", action2: "JOUER" };

    it("shows 🤍 when nothing was submitted", () => {
      expect(calculateHearts([], [], 1)[0]).toBe("🤍");
    });

    it("shows 🤍 when the daily actions exist but no attempt was made", () => {
      expect(calculateHearts([choice], [], 1)[0]).toBe("🤍");
    });

    it("shows ❤️ when the attempt matches in the same order", () => {
      const guess = { dayNumber: 1, guessedAction1: "NOURRIR", guessedAction2: "JOUER" };
      expect(calculateHearts([choice], [guess], 1)[0]).toBe("❤️");
    });

    it("shows ❤️ when the attempt matches in reverse order", () => {
      const guess = { dayNumber: 1, guessedAction1: "JOUER", guessedAction2: "NOURRIR" };
      expect(calculateHearts([choice], [guess], 1)[0]).toBe("❤️");
    });

    it("shows ❌ when the attempt is wrong", () => {
      const guess = { dayNumber: 1, guessedAction1: "LAVER", guessedAction2: "NOURRIR" };
      expect(calculateHearts([choice], [guess], 1)[0]).toBe("❌");
    });

    it("always returns 7 hearts", () => {
      expect(calculateHearts([], [], 3)).toHaveLength(7);
    });
  });

  describe("canAttemptTodayForDay (based on the Adoptant's attempts)", () => {
    it("is false before the session starts (day 0)", () => {
      expect(canAttemptTodayForDay(0, [])).toBe(false);
    });

    it("is true when no attempt exists for the day", () => {
      expect(canAttemptTodayForDay(2, [{ dayNumber: 1 }])).toBe(true);
    });

    it("is false once the attempt for the day exists", () => {
      expect(canAttemptTodayForDay(2, [{ dayNumber: 2 }])).toBe(false);
    });
  });

  describe("todaySubmittedForDay", () => {
    it("reflects the presence of the day's attempt", () => {
      expect(todaySubmittedForDay(1, [])).toBe(false);
      expect(todaySubmittedForDay(1, [{ dayNumber: 1 }])).toBe(true);
    });
  });

  describe("generateRandomDailyActions", () => {
    it("always returns 2 distinct valid actions", () => {
      const valid = ["NOURRIR", "JOUER", "CARESSER", "LAVER"];
      for (let i = 0; i < 50; i++) {
        const [a1, a2] = generateRandomDailyActions();
        expect(valid).toContain(a1);
        expect(valid).toContain(a2);
        expect(a1).not.toBe(a2);
      }
    });
  });
});
