import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/core/middleware/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/core/middleware/auth")>();
  return {
    ...actual,
    requireAuth: (req: any, res: any, next: any) => {
      const role = req.header("x-test-role");
      if (!role) return res.status(401).json({ error: "Unauthorized" });
      req.user = { userId: "actor", role, isPremium: false };
      next();
    },
  };
});
vi.mock("../../src/modules/admin/reports/adminReports.controller", () => ({
  handleList: async (_req: any, res: any) => { res.status(200).json({ data: [] }); },
  handleGetById: async (_req: any, res: any) => { res.status(200).json({ data: {} }); },
  handleUpdate: async (_req: any, res: any) => { res.status(200).json({ data: {} }); },
}));

import adminReportsRoutes from "../../src/modules/admin/reports/adminReports.routes";
import { errorHandler } from "../../src/core/middleware/errorHandler";

const app = express();
app.use(express.json());
app.use("/api/admin/reports", adminReportsRoutes);
app.use(errorHandler);

describe("report moderation HTTP authorization", () => {
  it("rejects anonymous users", async () => {
    expect((await request(app).get("/api/admin/reports")).status).toBe(401);
  });

  it.each([
    ["USER", 403],
    ["MODERATOR", 200],
    ["ADMIN", 200],
    ["OWNER", 200],
  ])("report listing as %s => %s", async (role, expected) => {
    expect((await request(app).get("/api/admin/reports").set("x-test-role", role)).status).toBe(expected);
  });

  it.each([
    ["USER", 403],
    ["MODERATOR", 200],
    ["ADMIN", 200],
    ["OWNER", 200],
  ])("report update as %s => %s", async (role, expected) => {
    expect((await request(app).patch("/api/admin/reports/report-id")
      .set("x-test-role", role).send({ status: "REVIEWING" })).status).toBe(expected);
  });
});
