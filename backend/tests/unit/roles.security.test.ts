import { describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import { requireRole } from "../../src/core/middleware/auth";

describe("role access matrix", () => {
  const cases: Array<[Role, Role[], boolean]> = [
    [Role.USER, [Role.ADMIN], false],
    [Role.USER, [Role.MODERATOR], false],
    [Role.MODERATOR, [Role.ADMIN], false],
    [Role.MODERATOR, [Role.MODERATOR], true],
    [Role.ADMIN, [Role.MODERATOR], false],
    [Role.ADMIN, [Role.ADMIN], true],
    [Role.OWNER, [Role.ADMIN], true],
    [Role.OWNER, [Role.MODERATOR], true],
    [Role.OWNER, [Role.OWNER], true],
    [Role.ADMIN, [Role.OWNER], false],
  ];
  it.each(cases)("%s accessing %s: allowed=%s", (role, allowedRoles, allowed) => {
    const next = vi.fn();
    const middleware = requireRole(...allowedRoles);
    if (allowed) {
      middleware({ user: { userId: "test", role, isPremium: false } } as any, {} as any, next);
      expect(next).toHaveBeenCalledOnce();
    } else {
      expect(() => middleware({ user: { userId: "test", role, isPremium: false } } as any, {} as any, next)).toThrow();
      expect(next).not.toHaveBeenCalled();
    }
  });
});
