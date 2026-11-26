import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Writable } from "stream";

// Le journal de l'application écrit dans un flux capturé : on lit exactement ce que Render recevrait.
const captured: Record<string, any>[] = [];
vi.mock("../../src/config/logger", async () => {
  const pino = (await import("pino")).default;
  const stream = new Writable({ write(chunk, _e, cb) { try { captured.push(JSON.parse(chunk.toString())); } catch { /* ligne non JSON */ } cb(); } });
  return { logger: pino({ level: "info", base: { service: "jeutaime-api" } }, stream) };
});

import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { signAccessToken } from "../../src/core/utils/jwt";

/**
 * Serveur réel (app.ts), authentification réelle (requireAuth), PostgreSQL réel : l'identifiant du compte
 * authentifié figure dans la ligne de journal de la requête. Nécessite TEST_DATABASE_URL.
 */
const test = process.env.TEST_DATABASE_URL ? it : it.skip;
const run = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
const ids = [`rl-a-${run}`, `rl-b-${run}`];
const tokenFor = (userId: string) => signAccessToken({ userId, role: "USER" } as never);
const lineFor = (url: string, status: number) => captured.filter((l) => l.res && l.req?.url === url && l.res.statusCode === status).pop();

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  for (const id of ids) await prisma.user.create({ data: { id, email: `${id}@example.test`, passwordHash: "x", wallet: { create: { coins: 10 } }, settings: { create: {} } } });
});
afterAll(async () => {
  if (process.env.TEST_DATABASE_URL) await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

describe("journal des requêtes — serveur réel", () => {
  test("requête authentifiée : userId du compte dans la ligne de journal, sans le jeton", async () => {
    const token = tokenFor(ids[0]!);
    const res = await request(app).get("/api/wallet/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const line = lineFor("/api/wallet/me", 200)!;
    expect(line.userId).toBe(ids[0]);
    expect(JSON.stringify(captured)).not.toContain(token);
  });

  test("deux comptes, deux requêtes simultanées : chaque ligne porte le bon identifiant", async () => {
    captured.length = 0;
    await Promise.all([
      request(app).get("/api/wallet/me?x=a").set("Authorization", `Bearer ${tokenFor(ids[0]!)}`),
      request(app).get("/api/wallet/me?x=b").set("Authorization", `Bearer ${tokenFor(ids[1]!)}`),
    ]);
    expect(lineFor("/api/wallet/me?x=a", 200)!.userId).toBe(ids[0]);
    expect(lineFor("/api/wallet/me?x=b", 200)!.userId).toBe(ids[1]);
  });

  test("requête sans jeton ou avec jeton invalide : refusée (401), aucun userId journalisé", async () => {
    captured.length = 0;
    await request(app).get("/api/wallet/me?x=none");
    await request(app).get("/api/wallet/me?x=bad").set("Authorization", "Bearer pas-un-jeton");
    for (const url of ["/api/wallet/me?x=none", "/api/wallet/me?x=bad"]) {
      const line = lineFor(url, 401)!;
      expect(line).toBeDefined();
      expect("userId" in line).toBe(false);
    }
  });
});
