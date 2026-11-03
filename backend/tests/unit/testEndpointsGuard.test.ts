/**
 * Tests unitaires du garde d'accès des routes /api/test/*.
 */
import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import {
  isValidTestEndpointsToken,
  requireTestEndpointsToken,
  TEST_ENDPOINTS_TOKEN_HEADER,
} from "../../src/modules/test/testEndpointsGuard";

const VALID = "a".repeat(48);

function buildApp() {
  const app = express();
  const router = express.Router();
  router.get("/version", (_req, res) => res.json({ ok: true }));
  router.post("/reset-test-users", (_req, res) => res.json({ destroyed: true }));
  app.use("/api/test", requireTestEndpointsToken, router);
  return app;
}

const ORIGINAL = process.env.TEST_ENDPOINTS_TOKEN;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.TEST_ENDPOINTS_TOKEN;
  else process.env.TEST_ENDPOINTS_TOKEN = ORIGINAL;
});

describe("isValidTestEndpointsToken", () => {
  it("refuse si aucun jeton n'est configuré", () => {
    expect(isValidTestEndpointsToken(VALID, undefined)).toBe(false);
  });
  it("refuse un jeton configuré trop court", () => {
    expect(isValidTestEndpointsToken("short", "short")).toBe(false);
  });
  it("refuse un jeton absent, vide ou différent", () => {
    expect(isValidTestEndpointsToken(undefined, VALID)).toBe(false);
    expect(isValidTestEndpointsToken("", VALID)).toBe(false);
    expect(isValidTestEndpointsToken("b".repeat(48), VALID)).toBe(false);
    expect(isValidTestEndpointsToken([VALID], VALID)).toBe(false);
  });
  it("accepte le jeton exact", () => {
    expect(isValidTestEndpointsToken(VALID, VALID)).toBe(true);
  });
});

describe("requireTestEndpointsToken", () => {
  it("fail closed : 404 quand TEST_ENDPOINTS_TOKEN n'est pas défini, même avec un en-tête", async () => {
    delete process.env.TEST_ENDPOINTS_TOKEN;
    const app = buildApp();
    const res = await request(app).post("/api/test/reset-test-users").set(TEST_ENDPOINTS_TOKEN_HEADER, VALID);
    expect(res.status).toBe(404);
    expect(res.body.destroyed).toBeUndefined();
  });

  it("404 sans en-tête", async () => {
    process.env.TEST_ENDPOINTS_TOKEN = VALID;
    const res = await request(buildApp()).get("/api/test/version");
    expect(res.status).toBe(404);
  });

  it("404 avec un mauvais jeton", async () => {
    process.env.TEST_ENDPOINTS_TOKEN = VALID;
    const res = await request(buildApp()).post("/api/test/reset-test-users").set(TEST_ENDPOINTS_TOKEN_HEADER, "x".repeat(48));
    expect(res.status).toBe(404);
    expect(res.body.destroyed).toBeUndefined();
  });

  it("laisse passer avec le bon jeton", async () => {
    process.env.TEST_ENDPOINTS_TOKEN = VALID;
    const res = await request(buildApp()).get("/api/test/version").set(TEST_ENDPOINTS_TOKEN_HEADER, VALID);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
