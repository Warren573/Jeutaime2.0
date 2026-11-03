import { createHash, timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Garde d'accès des routes /api/test/*.
 *
 * - Fail closed : si TEST_ENDPOINTS_TOKEN n'est pas configuré (ou trop court),
 *   toutes les routes de test répondent 404, quel que soit l'appelant.
 * - L'appelant doit envoyer l'en-tête `x-test-endpoints-token` avec la valeur exacte.
 * - Comparaison en temps constant (empreintes SHA-256 de même longueur).
 * - La valeur du jeton n'est jamais journalisée ni renvoyée.
 * - Réponse 404 identique dans tous les cas de refus, pour ne pas révéler l'existence des routes.
 */
export const TEST_ENDPOINTS_TOKEN_HEADER = "x-test-endpoints-token";
export const TEST_ENDPOINTS_TOKEN_MIN_LENGTH = 32;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isValidTestEndpointsToken(
  provided: unknown,
  expected: string | undefined,
): boolean {
  if (typeof expected !== "string" || expected.length < TEST_ENDPOINTS_TOKEN_MIN_LENGTH) {
    return false;
  }
  if (typeof provided !== "string" || provided.length === 0) {
    return false;
  }
  return timingSafeEqual(digest(provided), digest(expected));
}

export function requireTestEndpointsToken(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers[TEST_ENDPOINTS_TOKEN_HEADER];
  if (isValidTestEndpointsToken(provided, process.env.TEST_ENDPOINTS_TOKEN)) {
    next();
    return;
  }
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route introuvable" } });
}
