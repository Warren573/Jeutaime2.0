import { describe, expect, it } from "vitest";
import { assertCanRelance } from "../../src/policies/antiGhosting";

const now = new Date("2026-10-13T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000);
const base = {
  lastLetterBy: "bob", relancingUserId: "alice",
  ghostRelanceUsedBy: null, now,
};
describe("P0 anti-ghosting reminder policy", () => {
  it("refuses a reminder before five days", () => {
    expect(() => assertCanRelance({ ...base, lastLetterAt: daysAgo(4) })).toThrow();
  });
  it("allows one reminder between five and seven days", () => {
    expect(() => assertCanRelance({ ...base, lastLetterAt: daysAgo(5) })).not.toThrow();
    expect(() => assertCanRelance({ ...base, lastLetterAt: daysAgo(7) })).not.toThrow();
  });
  it("refuses a reminder after seven days", () => {
    expect(() => assertCanRelance({ ...base, lastLetterAt: daysAgo(8) })).toThrow();
  });
  it("refuses a reminder to the person who sent the last letter", () => {
    expect(() => assertCanRelance({ ...base, lastLetterAt: daysAgo(5), relancingUserId: "bob" })).toThrow();
  });
  it("prevents repeated reminders", () => {
    expect(() => assertCanRelance({ ...base, lastLetterAt: daysAgo(5), ghostRelanceUsedBy: "alice" })).toThrow();
  });
});
