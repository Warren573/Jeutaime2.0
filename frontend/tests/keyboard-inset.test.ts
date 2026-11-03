/**
 * Recouvrement de la fenêtre par le clavier (Android edge-to-edge).
 * Valeurs réelles relevées sur Galaxy A16 / Android 16 (diagnostic OTA 2.0.0-ota.14).
 */
import { describe, it, expect } from "vitest";
import { computeKeyboardOverlap } from "../src/utils/keyboardInset";

describe("computeKeyboardOverlap", () => {
  it("Galaxy A16 : fenêtre 832 dp non réduite, clavier à 473,6 dp → 358,4 dp", () => {
    expect(computeKeyboardOverlap(832, 473.6)).toBeCloseTo(358.4, 5);
  });

  it("clavier fermé → 0", () => {
    expect(computeKeyboardOverlap(832, null)).toBe(0);
  });

  it("fenêtre déjà réduite par le système (ancien adjustResize) → 0, pas de double compensation", () => {
    expect(computeKeyboardOverlap(473.6, 473.6)).toBe(0);
    expect(computeKeyboardOverlap(470, 473.6)).toBe(0);
  });

  it("événement incomplet (bord ≤ 0 ou non fini) → 0", () => {
    expect(computeKeyboardOverlap(832, 0)).toBe(0);
    expect(computeKeyboardOverlap(832, -10)).toBe(0);
    expect(computeKeyboardOverlap(832, Number.NaN)).toBe(0);
  });
});
