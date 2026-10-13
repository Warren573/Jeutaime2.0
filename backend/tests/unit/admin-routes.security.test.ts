import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

// Replace only token authentication with a deterministic test identity.
// The real requireRole middleware and the real administrative router are used.
vi.mock("../../src/core/middleware/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/core/middleware/auth")>();
  return {
    ...actual,
    requireAuth: (req: any, _res: any, next: any) => {
      const role = req.header("x-test-role");
      if (!role) return _res.status(401).json({ error: "Unauthorized" });
      req.user = { userId: "actor", role, isPremium: false };
      next();
    },
  };
});
vi.mock("../../src/modules/admin/users/adminUsers.controller", () => {
  const ok = async (_req: any, res: any) => { res.status(200).json({ ok: true }); };
  return {
    handleListUsers: ok, handleGetUserDetail: ok, handleAdjustCoins: ok,
    handleGrantPremium: ok, handleResetSalons: ok, handleResetRefuge: ok,
    handleResetBottles: ok, handleRepairLetters: ok, handleUpdateRole: ok,
    handleBan: ok, handleUnban: ok, handleWarn: ok,
  };
});

import adminUsersRoutes from "../../src/modules/admin/users/adminUsers.routes";
import { errorHandler } from "../../src/core/middleware/errorHandler";

const app = express();
app.use(express.json());
app.use("/api/admin/users", adminUsersRoutes);
app.use(errorHandler);

describe("real admin route authorization over HTTP", () => {
  it.each([
    ["USER", 403],
    ["MODERATOR", 403],
    ["ADMIN", 200],
    ["OWNER", 200],
  ])("GET /admin/users as %s => %i", async (role, status) => {
    const res = await request(app).get("/api/admin/users").set("x-test-role", role);
    expect(res.status).toBe(status);
  });

  it.each([
    ["USER", 403],
    ["MODERATOR", 403],
    ["ADMIN", 403],
    ["OWNER", 200],
  ])("POST owner-only reset as %s => %i", async (role, status) => {
    const res = await request(app).post("/api/admin/users/target/reset-salons")
      .set("x-test-role", role).send({ reason: "Automated authorization check" });
    expect(res.status).toBe(status);
  });

  it("rejects unauthenticated admin access", async () => {
    expect((await request(app).get("/api/admin/users")).status).toBe(401);
  });

  it("rejects promotion to OWNER in the request schema", async () => {
    const res = await request(app).patch("/api/admin/users/target/role")
      .set("x-test-role", "OWNER").send({ role: "OWNER" });
    expect(res.status).toBe(400);
  });
});
