/**
 * Détection des 409 « déjà soumis » du Refuge : le hook s'appuie sur le
 * statut HTTP et le code métier structuré renvoyés par le backend —
 * JAMAIS sur une comparaison du texte français du message.
 */
import { describe, it, expect } from "vitest";
import { ApiError } from "../src/api/client";
import { isAlreadySubmittedError, REFUGE_ERROR_CODES } from "../src/api/refuge-api";

describe("isAlreadySubmittedError", () => {
  it("détecte le 409 REFUGE_DAILY_CHOICE_ALREADY_SUBMITTED pour le choix quotidien", () => {
    const err = new ApiError("peu importe le texte", 409, REFUGE_ERROR_CODES.DAILY_CHOICE_ALREADY_SUBMITTED);
    expect(isAlreadySubmittedError(err, "dailyChoice")).toBe(true);
    expect(isAlreadySubmittedError(err, "guess")).toBe(false);
  });

  it("détecte le 409 REFUGE_GUESS_ALREADY_SUBMITTED pour la tentative", () => {
    const err = new ApiError("peu importe le texte", 409, REFUGE_ERROR_CODES.GUESS_ALREADY_SUBMITTED);
    expect(isAlreadySubmittedError(err, "guess")).toBe(true);
    expect(isAlreadySubmittedError(err, "dailyChoice")).toBe(false);
  });

  it("ne dépend pas du texte du message (message vide ou différent)", () => {
    const err = new ApiError("", 409, REFUGE_ERROR_CODES.GUESS_ALREADY_SUBMITTED);
    expect(isAlreadySubmittedError(err, "guess")).toBe(true);
  });

  it("rejette un autre 409 (code CONFLICT générique)", () => {
    const err = new ApiError("Ce refuge n'est pas actif", 409, "CONFLICT");
    expect(isAlreadySubmittedError(err, "dailyChoice")).toBe(false);
    expect(isAlreadySubmittedError(err, "guess")).toBe(false);
  });

  it("rejette un statut non-409 même avec le bon code", () => {
    const err = new ApiError("x", 400, REFUGE_ERROR_CODES.GUESS_ALREADY_SUBMITTED);
    expect(isAlreadySubmittedError(err, "guess")).toBe(false);
  });

  it("rejette une Error simple (réseau, parse)", () => {
    expect(isAlreadySubmittedError(new Error("déjà été soumise"), "guess")).toBe(false);
    expect(isAlreadySubmittedError(null, "guess")).toBe(false);
  });
});
