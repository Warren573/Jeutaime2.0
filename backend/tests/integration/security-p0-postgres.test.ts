import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/config/prisma";
import { listLetters, markLetterRead } from "../../src/modules/letters/letters.service";
import { listMine } from "../../src/modules/reports/reports.service";
import { resolvePhotoForStream } from "../../src/modules/photos/photos.service";
import { deleteAccountPermanently } from "../../src/modules/auth/accountDeletion.service";
import { hashPassword } from "../../src/core/utils/hash";

const enabled = !!process.env.TEST_DATABASE_URL &&
  process.env.DATABASE_URL === process.env.TEST_DATABASE_URL &&
  process.env.NODE_ENV === "test";

describe.skipIf(!enabled)("P0 privacy with real PostgreSQL", () => {
  const suffix = randomUUID().replace(/-/g, "");
  const ids = [`p0a-${suffix}`, `p0b-${suffix}`, `p0c-${suffix}`].sort();
  let matchId: string;
  let letterId: string;
  let photoId: string;
  beforeAll(async () => {
    for (const id of ids) {
      await prisma.user.create({ data: { id, email: `${id}@example.invalid`, passwordHash: "test-only" } });
    }
    const match = await prisma.match.create({
      data: { userAId: ids[0], userBId: ids[1], initiatorId: ids[0], status: "ACTIVE", questionsValidated: true },
    });
    matchId = match.id;
    const letter = await prisma.letter.create({
      data: { matchId, fromUserId: ids[0], toUserId: ids[1], content: "Private integration test" },
    });
    letterId = letter.id;
    const photo = await prisma.photo.create({
      data: { userId: ids[0], originalPath: ids[0] + "/photo.webp", blurredPath: ids[0] + "/blurred.webp" },
    });
    photoId = photo.id;
  });
  afterAll(async () => {
    if (photoId) await prisma.photo.deleteMany({ where: { id: photoId } });
    if (letterId) await prisma.letter.deleteMany({ where: { id: letterId } });
    if (matchId) await prisma.match.deleteMany({ where: { id: matchId } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });
  it("participants can read letters, third parties cannot", async () => {
    const result = await listLetters(matchId, ids[0], { page: 1, pageSize: 20 } as any);
    expect(result.data.some(letter => letter.id === letterId)).toBe(true);
    await expect(listLetters(matchId, ids[2], { page: 1, pageSize: 20 } as any))
      .rejects.toThrow("Tu ne fais pas partie de ce match");
  });
  it("only letter recipient can mark it read", async () => {
    await expect(markLetterRead(letterId, ids[2])).rejects.toThrow("Seul le destinataire");
    await expect(markLetterRead(letterId, ids[0])).rejects.toThrow("Seul le destinataire");
    const result = await markLetterRead(letterId, ids[1]);
    expect(result.status).toBe("READ");
  });
  it("denies unmatched user access to original photo", async () => {
    await expect(resolvePhotoForStream({ viewerId: ids[2], viewerIsPremium: false, photoId, variant: "original" }))
      .rejects.toThrow("Aucune relation");
  });
  it("denies matched user below threshold, then permits unlocked access", async () => {
    await expect(resolvePhotoForStream({ viewerId: ids[1], viewerIsPremium: false, photoId, variant: "original" }))
      .rejects.toThrow("Aperçu non disponible");
    await prisma.match.update({ where: { id: matchId }, data: { letterCountA: 5, letterCountB: 5 } });
    const granted = await resolvePhotoForStream({ viewerId: ids[1], viewerIsPremium: false, photoId, variant: "original" });
    expect(granted.ownerId).toBe(ids[0]);
    expect(granted.absolutePath.endsWith("photo.webp")).toBe(true);
  });
  it("blocks photo stream despite unlocked letters", async () => {
    const block = await prisma.block.create({ data: { fromId: ids[0], toId: ids[1] } });
    try {
      await expect(resolvePhotoForStream({ viewerId: ids[1], viewerIsPremium: true, photoId, variant: "original" }))
        .rejects.toThrow("Accès interdit");
    } finally {
      await prisma.block.delete({ where: { id: block.id } });
    }
  });
  it("denies photo hidden by moderation", async () => {
    await prisma.photo.update({ where: { id: photoId }, data: { moderationStatus: "HIDDEN" } });
    await expect(resolvePhotoForStream({ viewerId: ids[0], viewerIsPremium: false, photoId, variant: "original" }))
      .rejects.toThrow("Photo masquée");
  });
  it("rejects account deletion with an incorrect password, leaving user intact", async () => {
    const accountId = "deletion-" + randomUUID().replace(/-/g, "");
    await prisma.user.create({ data: {
      id: accountId, email: accountId + "@example.invalid",
      passwordHash: await hashPassword("correct-strong-password"),
    } });
    try {
      await expect(deleteAccountPermanently(accountId, "incorrect-password")).rejects.toThrow("Mot de passe incorrect");
      expect(await prisma.user.findUnique({ where: { id: accountId } })).not.toBeNull();
    } finally {
      await prisma.user.deleteMany({ where: { id: accountId } });
    }
  });
  it("report list is restricted to requesting reporter", async () => {
    const result = await listMine(ids[2], { page: 1, pageSize: 20 } as any);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });
});
