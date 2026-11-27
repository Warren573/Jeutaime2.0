import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchStatus } from "@prisma/client";

// vi.mock est hissé avant les imports : le mock doit être créé via vi.hoisted pour exister à ce moment-là.
const prismaMock = vi.hoisted(() => ({
  match: { findUnique: vi.fn() },
  offeringSent: { findFirst: vi.fn() },
}));
vi.mock("../../src/config/prisma", () => ({ prisma: prismaMock }));

import { assertPersonalOfferingAllowed } from "../../src/modules/offerings/personalOfferings.policy";

describe("personal offerings: active ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.match.findUnique.mockResolvedValue({ status: MatchStatus.ACTIVE });
  });

  it("ignores expired offerings by filtering the query to active records", async () => {
    prismaMock.offeringSent.findFirst.mockResolvedValue(null);
    await expect(assertPersonalOfferingAllowed("sender", "recipient", "desk_rose")).resolves.toBeUndefined();
    expect(prismaMock.offeringSent.findFirst).toHaveBeenCalledWith({
      where: {
        toUserId: "recipient",
        offeringId: "desk_rose",
        OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
      },
      select: { id: true },
    });
  });

  it("rejects an offering already active on the recipient's desk", async () => {
    prismaMock.offeringSent.findFirst.mockResolvedValue({ id: "active-offering" });
    await expect(assertPersonalOfferingAllowed("sender", "recipient", "desk_rose"))
      .rejects.toThrow("Cette offrande est déjà présente sur son bureau");
  });

  it("rejects a personal offering outside an active contact", async () => {
    prismaMock.match.findUnique.mockResolvedValue(null);
    await expect(assertPersonalOfferingAllowed("sender", "recipient", "desk_rose"))
      .rejects.toThrow("Les offrandes de bureau sont réservées à tes contacts");
    expect(prismaMock.offeringSent.findFirst).not.toHaveBeenCalled();
  });
});
