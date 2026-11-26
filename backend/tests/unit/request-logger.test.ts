import { describe, expect, it } from "vitest";
import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import pino from "pino";
import { Writable } from "stream";
import { authenticatedUserId, createRequestLogger } from "../../src/core/middleware/requestLoggerCore";

/** Application minimale : même enchaînement qu'en production (journal → authentification → route). */
function harness() {
  const lines: Record<string, any>[] = [];
  const stream = new Writable({ write(chunk, _enc, cb) { lines.push(JSON.parse(chunk.toString())); cb(); } });
  const logger = pino({ level: "info", base: { service: "test" } }, stream);
  const app = express();
  app.use(express.json());
  app.use(createRequestLogger(logger));
  // Équivalent de requireAuth : pose req.user APRÈS le début de la requête.
  const auth = (userId: string | undefined) => (req: Request, _res: Response, next: NextFunction) => {
    if (userId) (req as any).user = { userId, role: "USER" };
    next();
  };
  return { app, lines, auth, responseLine: (url: string) => lines.find((l) => l.res && l.req?.url === url)! };
}

describe("journal des requêtes — identifiant du compte authentifié", () => {
  it("ajoute userId à la ligne de réponse d'une requête authentifiée (cause racine : plus jamais undefined)", async () => {
    const h = harness();
    h.app.get("/me", h.auth("cmwvsz3t6001okik505vsekyq"), (_q, res) => res.json({ ok: true }));
    await request(h.app).get("/me");
    const line = h.responseLine("/me");
    expect(line.userId).toBe("cmwvsz3t6001okik505vsekyq");
    expect(line.res.statusCode).toBe(200);
    expect(line.msg).toBe("GET /me 200");
  });

  it("identité posée après un traitement asynchrone : toujours journalisée", async () => {
    const h = harness();
    h.app.get("/slow", async (req, _res, next) => { await new Promise((r) => setTimeout(r, 20)); (req as any).user = { userId: "u-async" }; next(); }, (_q, res) => res.json({}));
    await request(h.app).get("/slow");
    expect(h.responseLine("/slow").userId).toBe("u-async");
  });

  it("requête non authentifiée : aucune clé userId (401, route publique)", async () => {
    const h = harness();
    h.app.get("/public", h.auth(undefined), (_q, res) => res.json({}));
    h.app.get("/private", (_q, res) => res.status(401).json({ error: "Token manquant" }));
    await request(h.app).get("/public");
    await request(h.app).get("/private");
    for (const url of ["/public", "/private"]) {
      const line = h.responseLine(url);
      expect("userId" in line).toBe(false);
    }
    expect(h.responseLine("/private").level).toBe(40); // warn conservé
  });

  it("échecs APRÈS authentification (403, 409, 500) : l'identité reste journalisée, niveaux inchangés", async () => {
    const h = harness();
    h.app.post("/forbidden", h.auth("u-1"), (_q, res) => res.status(403).json({}));
    h.app.post("/conflict", h.auth("u-2"), (_q, res) => res.status(409).json({}));
    h.app.get("/boom", h.auth("u-3"), () => { throw new Error("boom"); });
    h.app.use((_e: unknown, _q: Request, res: Response, _n: NextFunction) => res.status(500).json({}));
    await request(h.app).post("/forbidden");
    await request(h.app).post("/conflict");
    await request(h.app).get("/boom");
    expect(h.responseLine("/forbidden")).toMatchObject({ userId: "u-1", level: 40 });
    expect(h.responseLine("/conflict")).toMatchObject({ userId: "u-2", level: 40 });
    expect(h.responseLine("/boom")).toMatchObject({ userId: "u-3", level: 50 });
  });

  it("20 requêtes simultanées de comptes différents : chaque ligne porte SON identifiant (aucun mélange)", async () => {
    const h = harness();
    h.app.get("/who/:id", (req, _res, next) => { setTimeout(() => { (req as any).user = { userId: `user-${req.params.id}` }; next(); }, Math.random() * 30); }, (_q, res) => res.json({}));
    await Promise.all(Array.from({ length: 20 }, (_, i) => request(h.app).get(`/who/${i}`)));
    for (let i = 0; i < 20; i++) expect(h.responseLine(`/who/${i}`).userId).toBe(`user-${i}`);
  });

  it("ne journalise ni jeton, ni mot de passe, ni corps, ni cookie, ni e-mail, ni IP", async () => {
    const h = harness();
    h.app.post("/login-like", h.auth("u-secret-test"), (_q, res) => res.json({ accessToken: "RESPONSE-TOKEN-XYZ" }));
    await request(h.app)
      .post("/login-like")
      .set("Authorization", "Bearer SUPER-SECRET-JWT")
      .set("Cookie", "session=COOKIE-SECRET")
      .set("User-Agent", "UA-PRIVATE-123")
      .send({ email: "prive@exemple.test", password: "MotDePasse-Secret-1" });
    const raw = JSON.stringify(h.lines);
    for (const secret of ["SUPER-SECRET-JWT", "COOKIE-SECRET", "MotDePasse-Secret-1", "prive@exemple.test", "RESPONSE-TOKEN-XYZ", "UA-PRIVATE-123", "127.0.0.1", "::ffff"]) {
      expect(raw).not.toContain(secret);
    }
    const line = h.responseLine("/login-like");
    expect(Object.keys(line.req).sort()).toEqual(["method", "url"]); // aucun en-tête
    expect(line.userId).toBe("u-secret-test");
  });

  it("valeurs d'identifiant invalides ignorées (pas d'injection de ligne, pas de valeur démesurée)", () => {
    expect(authenticatedUserId({ user: { userId: "cmwvsz3t6001okik505vsekyq" } })).toBe("cmwvsz3t6001okik505vsekyq");
    expect(authenticatedUserId({ user: { userId: "a-b_C-9" } })).toBe("a-b_C-9");
    for (const bad of ["x\n{\"level\":50}", "a b", "", "é", "x".repeat(65), 123, null, undefined, {}, ["a"]]) {
      expect(authenticatedUserId({ user: { userId: bad } })).toBeUndefined();
    }
    expect(authenticatedUserId({})).toBeUndefined();
    expect(authenticatedUserId(undefined)).toBeUndefined();
  });
});
