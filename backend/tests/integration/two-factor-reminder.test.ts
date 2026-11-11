import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.TWO_FACTOR_ENCRYPTION_KEY = "cle-de-test-uniquement-0123456789abcdef";
});

import { env } from "../../src/config/env";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/core/utils/hash";
import * as sec from "../../src/modules/auth/security/accountSecurity.core";
import { runTwoFactorGraceReminders } from "../../src/modules/auth/security/twoFactorReminder";
import { totpCodeAt } from "../../src/modules/auth/security/totp";
import { MemoryTransport, setMailTransport } from "../../src/modules/mail/mailer";
import { ALL_JOBS, buildScheduledJobs, sendTwoFactorRemindersJob } from "../../src/jobs";

/**
 * Rappels de sécurité avant l'échéance du délai de 14 jours.
 * L'heure est injectée : aucun test n'attend. Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
vi.setConfig({ testTimeout: 60_000 });

const DAY = 24 * 60 * 60 * 1000;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const PASSWORD = "Depart-" + run + "-Aa1";
const users: string[] = [];
let n = 0;
const mailbox = new MemoryTransport();
// Début d'obligation fixé dans le passé proche : les notifications créées « maintenant » appartiennent au cycle.
const START = new Date(Date.now() - 60 * 60 * 1000);
const at = (days: number) => new Date(START.getTime() + days * DAY);
const setStart = (d: Date | undefined) => {
  (env as { TWO_FACTOR_ENFORCEMENT_START: Date | undefined }).TWO_FACTOR_ENFORCEMENT_START = d;
};

async function account(role: "USER" | "MODERATOR" | "ADMIN" | "OWNER", opts: { since?: Date; banned?: boolean } = {}) {
  const id = `rem-${run}-${++n}`;
  users.push(id);
  await prisma.user.create({
    data: {
      id,
      email: `${id}@test.local`,
      role,
      isBanned: opts.banned ?? false,
      privilegedRoleSince: opts.since ?? null,
      passwordHash: await hashPassword(PASSWORD),
      wallet: { create: {} },
      settings: { create: {} },
    },
  });
  return { id, email: `${id}@test.local` };
}
const reminders = (userId: string) =>
  prisma.notification.findMany({
    where: { userId, type: "SECURITY_ALERT", meta: { path: ["reason"], equals: "two_factor_reminder" } },
    orderBy: { createdAt: "asc" },
  });
const thresholds = async (userId: string) => (await reminders(userId)).map((r) => (r.meta as { threshold: number }).threshold);

beforeAll(() => setMailTransport(mailbox));
afterAll(async () => {
  setStart(undefined);
  if (!process.env.TEST_DATABASE_URL) return;
  await prisma.user.deleteMany({ where: { id: { in: users } } });
});

describe("rappels avant l'échéance (OWNER et ADMIN)", () => {
  test("avant l'activation de l'obligation, ou sans date : aucun rappel", async () => {
    const admin = await account("ADMIN");
    setStart(undefined);
    await runTwoFactorGraceReminders(at(8));
    setStart(new Date(START.getTime() + 30 * DAY));
    await runTwoFactorGraceReminders(at(8));
    expect(await reminders(admin.id)).toHaveLength(0);
  });

  test("à 7, 3 puis 1 jour : un rappel chacun, jamais de doublon, rien après l'échéance", async () => {
    setStart(START);
    const admin = await account("ADMIN");
    const owner = await account("OWNER");
    mailbox.clear();

    await runTwoFactorGraceReminders(at(6)); // 8 jours restants
    expect(await reminders(admin.id)).toHaveLength(0);

    const first = await runTwoFactorGraceReminders(at(7)); // 7 jours restants
    expect(first.sent).toBeGreaterThanOrEqual(2);
    expect(await thresholds(admin.id)).toEqual([7]);
    expect(await thresholds(owner.id)).toEqual([7]);

    await runTwoFactorGraceReminders(at(7));
    await runTwoFactorGraceReminders(at(8));
    expect(await thresholds(admin.id)).toEqual([7]); // jamais deux fois

    await runTwoFactorGraceReminders(at(11)); // 3 jours restants
    await runTwoFactorGraceReminders(at(13)); // 1 jour restant
    await runTwoFactorGraceReminders(at(13.5)); // encore 1 jour (arrondi) : pas de doublon
    expect(await thresholds(admin.id)).toEqual([7, 3, 1]);

    await runTwoFactorGraceReminders(at(14)); // échéance atteinte : bloqué, plus de rappel
    await runTwoFactorGraceReminders(at(20));
    expect(await thresholds(admin.id)).toEqual([7, 3, 1]);

    const rows = await reminders(admin.id);
    expect(rows[0]!.message).toContain("dans 7 jours");
    expect(rows[2]!.message).toContain("dans 1 jour");
    expect(rows[2]!.isRead).toBe(false);
    // e-mail simulé : 3 messages pour cet ADMIN, adressés à lui seul, sans secret
    const mine = mailbox.outbox.filter((m) => m.to === admin.email);
    expect(mine).toHaveLength(3);
    expect(mine[0]!.text).toContain("Réglages → Sécurité et appareils");
    expect(mine[0]!.text).not.toMatch(/token|secret|mot de passe/i);
  });

  test("serveur en retard : un seul rappel (le plus urgent), pas trois d'un coup", async () => {
    setStart(START);
    const admin = await account("ADMIN");
    await runTwoFactorGraceReminders(at(12)); // 2 jours restants
    expect(await thresholds(admin.id)).toEqual([3]);
    await runTwoFactorGraceReminders(at(12));
    expect(await thresholds(admin.id)).toEqual([3]);
    await runTwoFactorGraceReminders(at(13));
    expect(await thresholds(admin.id)).toEqual([3, 1]);
  });

  test("8 exécutions simultanées du job : un seul rappel par compte", async () => {
    setStart(START);
    const admin = await account("ADMIN");
    await Promise.all(Array.from({ length: 8 }, () => runTwoFactorGraceReminders(at(7))));
    expect(await thresholds(admin.id)).toEqual([7]);
  });

  test("comptes non concernés : USER, MODERATOR, ADMIN protégé, ADMIN suspendu, nouvel ADMIN déjà bloqué", async () => {
    setStart(START);
    const user = await account("USER");
    const moderator = await account("MODERATOR");
    const banned = await account("ADMIN", { banned: true });
    const newAdmin = await account("ADMIN", { since: at(1) }); // promu après l'activation : aucun délai
    const protectedAdmin = await account("ADMIN");
    const { secret } = await sec.setupTwoFactor(protectedAdmin.id, PASSWORD);
    await sec.enableTwoFactor(protectedAdmin.id, totpCodeAt(secret, Date.now()));
    const before = await prisma.notification.count({ where: { userId: { in: [protectedAdmin.id] } } });

    await runTwoFactorGraceReminders(at(7));
    await runTwoFactorGraceReminders(at(11));
    await runTwoFactorGraceReminders(at(13));

    for (const u of [user, moderator, banned, newAdmin]) expect(await reminders(u.id)).toHaveLength(0);
    expect(await reminders(protectedAdmin.id)).toHaveLength(0);
    // et aucune notification parasite pour l'ADMIN protégé (hors alerte d'activation déjà comptée avant)
    expect(await prisma.notification.count({ where: { userId: protectedAdmin.id } })).toBe(before);
  });

  test("un ADMIN qui configure sa 2FA après le premier rappel n'en reçoit plus", async () => {
    setStart(START);
    const admin = await account("ADMIN");
    await runTwoFactorGraceReminders(at(7));
    const { secret } = await sec.setupTwoFactor(admin.id, PASSWORD);
    await sec.enableTwoFactor(admin.id, totpCodeAt(secret, Date.now()));
    await runTwoFactorGraceReminders(at(11));
    await runTwoFactorGraceReminders(at(13));
    expect(await thresholds(admin.id)).toEqual([7]);
  });

  test("date d'obligation repoussée : un nouveau cycle de rappels commence", async () => {
    setStart(START);
    const admin = await account("ADMIN");
    await runTwoFactorGraceReminders(at(7));
    expect(await thresholds(admin.id)).toEqual([7]);

    const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
    setStart(later);
    await runTwoFactorGraceReminders(new Date(later.getTime() + 7 * DAY));
    expect(await thresholds(admin.id)).toEqual([7, 7]);
  });

  test("sans clé de chiffrement, aucun rappel : l'obligation n'est pas appliquée", async () => {
    setStart(START);
    const admin = await account("ADMIN");
    const mutable = env as { TWO_FACTOR_ENCRYPTION_KEY: string | undefined };
    const key = mutable.TWO_FACTOR_ENCRYPTION_KEY;
    try {
      mutable.TWO_FACTOR_ENCRYPTION_KEY = undefined;
      await runTwoFactorGraceReminders(at(7));
      expect(await reminders(admin.id)).toHaveLength(0);
    } finally {
      mutable.TWO_FACTOR_ENCRYPTION_KEY = key;
    }
  });

  test("le job est enregistré une seule fois et rapporte son travail", async () => {
    expect(ALL_JOBS.filter((j) => j.name === "sendTwoFactorReminders")).toHaveLength(1);
    const scheduled = buildScheduledJobs({ refreshTokenPurgeGraceMs: 3_600_000 });
    expect(scheduled.filter((j) => j.name === "sendTwoFactorReminders")).toHaveLength(1);

    setStart(START);
    const admin = await account("ADMIN");
    const result = await sendTwoFactorRemindersJob.run(at(7));
    expect(result.jobName).toBe("sendTwoFactorReminders");
    expect(result.affected).toBeGreaterThanOrEqual(1);
    expect(await thresholds(admin.id)).toEqual([7]);
  });
});
