/**
 * Hauteur des écrans mis à l'échelle.
 * Mesures Galaxy A17 (diagnostic, OTA 2.0.0-ota.14+) : fenêtre 384×832,
 * échelle 0,9846, onLayout 390×832, affiché 384×819,2.
 */
import { describe, it, expect } from "vitest";
import { scaledScreenStyle, displayedScreenHeight } from "../src/utils/scaledScreenStyle";

const A17 = { width: 384, height: 832, scale: Math.min(384 / 390, 832 / 844) };

describe("scaledScreenStyle", () => {
  it("Android : flex: 0 pour que la hauteur calculée soit respectée", () => {
    const s = scaledScreenStyle({ platform: "android", logicalWidth: 384 / A17.scale, windowHeight: 832, keyboardInset: 0, scale: A17.scale });
    expect(s.flex).toBe(0);
    expect(s.height).toBeCloseTo(845, 0);
    expect(s.transform).toEqual([{ scale: A17.scale }]);
    expect(s.transformOrigin).toBe("left top");
  });

  it("iOS : pas de clé flex (style strictement identique à avant)", () => {
    const s = scaledScreenStyle({ platform: "ios", logicalWidth: 390, windowHeight: 844, keyboardInset: 0, scale: 1 });
    expect("flex" in s).toBe(false);
    expect(s).toEqual({ width: 390, height: 844, transform: [{ scale: 1 }], transformOrigin: "left top" });
  });

  it("web : pas de clé flex", () => {
    const s = scaledScreenStyle({ platform: "web", logicalWidth: 390, windowHeight: 844, keyboardInset: 0, scale: 1 });
    expect("flex" in s).toBe(false);
  });

  it("clavier ouvert (A17, 358,4) : hauteur réduite, échelle inchangée", () => {
    const s = scaledScreenStyle({ platform: "android", logicalWidth: 390, windowHeight: 832, keyboardInset: 358.4, scale: A17.scale });
    expect(s.height * A17.scale).toBeCloseTo(473.6, 5);
  });
});

describe("displayedScreenHeight (Galaxy A17)", () => {
  const requested = 832 / A17.scale; // ≈ 845

  it("avant (flex: 1) : 832 unités → 819,2 dp affichés, 12,8 dp manquants", () => {
    const h = displayedScreenHeight({ platform: "ios-like-before", requestedLogicalHeight: requested, parentLogicalHeight: 832, scale: A17.scale });
    expect(h).toBeCloseTo(819.2, 1);
    expect(832 - h).toBeCloseTo(12.8, 1);
  });

  it("après (Android, flex: 0) : l'écran remplit exactement les 832 dp", () => {
    const h = displayedScreenHeight({ platform: "android", requestedLogicalHeight: requested, parentLogicalHeight: 832, scale: A17.scale });
    expect(h).toBeCloseTo(832, 5);
  });

  it("iPhone 16e (échelle 1) : hauteur demandée = parent = 844, aucun changement", () => {
    const h = displayedScreenHeight({ platform: "ios", requestedLogicalHeight: 844, parentLogicalHeight: 844, scale: 1 });
    expect(h).toBe(844);
  });
});

import { exemptScreenStyle } from "../src/utils/scaledScreenStyle";

describe("exemptScreenStyle (Paramètres et autres écrans exclus)", () => {
  it("iOS : undefined, comme avant (iPhone 16e inchangé)", () => {
    expect(exemptScreenStyle({ platform: "ios", windowHeight: 844, keyboardInset: 0 })).toBeUndefined();
  });

  it("web : undefined", () => {
    expect(exemptScreenStyle({ platform: "web", windowHeight: 844, keyboardInset: 0 })).toBeUndefined();
  });

  it("Android A17 : hauteur 832 explicite, échelle 1, flex 0", () => {
    expect(exemptScreenStyle({ platform: "android", windowHeight: 832, keyboardInset: 0 })).toEqual({
      flex: 0, width: "100%", height: 832, transform: [{ scale: 1 }], transformOrigin: "left top",
    });
  });

  it("Android : mêmes clés que le style mis à l'échelle → aucune ancienne valeur ne peut rester", () => {
    const scaled = scaledScreenStyle({ platform: "android", logicalWidth: 390, windowHeight: 832, keyboardInset: 0, scale: 0.9846 });
    const exempt = exemptScreenStyle({ platform: "android", windowHeight: 832, keyboardInset: 0 })!;
    expect(Object.keys(exempt).sort()).toEqual(Object.keys(scaled).sort());
  });

  it("Android clavier ouvert : hauteur réduite du recouvrement (473,6)", () => {
    expect(exemptScreenStyle({ platform: "android", windowHeight: 832, keyboardInset: 358.4 })!.height).toBeCloseTo(473.6, 5);
  });
});
