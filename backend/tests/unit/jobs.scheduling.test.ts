import { describe, it, expect } from "vitest";
import { ALL_JOBS, buildScheduledJobs, closeRefugeDaysJob } from "../../src/jobs";

// ============================================================
// buildScheduledJobs est la SOURCE DE VÉRITÉ de server.ts :
// le job de clôture des journées de Refuge doit y figurer,
// exactement une fois, sans doublon d'aucun job.
// ============================================================

describe("buildScheduledJobs", () => {
  const jobs = buildScheduledJobs({ refreshTokenPurgeGraceMs: 3_600_000 });

  it("schedules closeRefugeDays exactly once", () => {
    const refugeJobs = jobs.filter((j) => j.name === closeRefugeDaysJob.name);
    expect(refugeJobs).toHaveLength(1);
  });

  it("has no duplicated job names (no double scheduling)", () => {
    const names = jobs.map((j) => j.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("schedules every maintenance job declared in ALL_JOBS", () => {
    const scheduledNames = new Set(jobs.map((j) => j.name));
    for (const job of ALL_JOBS) {
      expect(scheduledNames.has(job.name)).toBe(true);
    }
  });
});
