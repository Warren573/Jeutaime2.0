import { describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import { requireRole } from "./auth";

const roleAccess = (actual: Role, allowed: Role[]) => {
  const req = { user: { userId: "test-user", role: actual } } as any;
  const next = vi.fn();
  try {
    requireRole(...allowed)(req, {} as any, next);
    return { allowed: next.mock.calls.length === 1, failed: false };
  } catch {
    return { allowed: false, failed: true };
  }
};

describe("admin role boundaries", () => {
  it("rejects normal users from administrative routes", () => {
    expect(roleAccess(Role.USER, [Role.ADMIN]).allowed).toBe(false);
    expect(roleAccess(Role.USER, [Role.MODERATOR]).allowed).toBe(false);
    expect(roleAccess(Role.USER, [Role.OWNER]).allowed).toBe(false);
  });
  it("prevents moderators from accessing admin and owner routes", () => {
    expect(roleAccess(Role.MODERATOR, [Role.ADMIN]).allowed).toBe(false);
    expect(roleAccess(Role.MODERATOR, [Role.OWNER]).allowed).toBe(false);
  });
  it("prevents admins from accessing owner-only routes", () => {
    expect(roleAccess(Role.ADMIN, [Role.OWNER]).allowed).toBe(false);
  });
  it("grants moderators their permitted routes", () => {
    expect(roleAccess(Role.MODERATOR, [Role.MODERATOR]).allowed).toBe(true);
  });
  it("grants owners staff routes and owner-only routes", () => {
    expect(roleAccess(Role.OWNER, [Role.ADMIN]).allowed).toBe(true);
    expect(roleAccess(Role.OWNER, [Role.MODERATOR]).allowed).toBe(true);
    expect(roleAccess(Role.OWNER, [Role.OWNER]).allowed).toBe(true);
  });
  it("does not allow a missing identity", () => {
    const next = vi.fn();
    expect(() => requireRole(Role.ADMIN)({} as any, {} as any, next)).toThrow();
    expect(next).not.toHaveBeenCalled();
  });
});
