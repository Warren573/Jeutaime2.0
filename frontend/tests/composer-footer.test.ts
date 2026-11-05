/**
 * Pied de la fenêtre de rédaction des lettres.
 * Valeurs réelles Galaxy A17 (OTA 2.0.0-ota.17) : fenêtre 832, barre de
 * navigation 48, bord haut du clavier 473,6 → compensation 358,4.
 */
import { describe, it, expect } from "vitest";
import { composerFooterAnchoring, footerButtonsBottom } from "../src/utils/composerFooter";

describe("composerFooterAnchoring", () => {
  it("iOS : aucun style ajouté (rendu iPhone 16e inchangé)", () => {
    expect(composerFooterAnchoring("ios", 170)).toEqual({ footerStyle: null, listStyle: null });
  });

  it("web : aucun style ajouté", () => {
    expect(composerFooterAnchoring("web", 170)).toEqual({ footerStyle: null, listStyle: null });
  });

  it("Android : pied ancré en bas, liste décalée de la hauteur mesurée du pied", () => {
    expect(composerFooterAnchoring("android", 170.5)).toEqual({
      footerStyle: { position: "absolute", left: 0, right: 0, bottom: 0 },
      listStyle: { marginBottom: 170.5 },
    });
  });

  it("Android avant la première mesure (0, NaN, négatif) → marge 0", () => {
    expect(composerFooterAnchoring("android", 0).listStyle).toEqual({ marginBottom: 0 });
    expect(composerFooterAnchoring("android", Number.NaN).listStyle).toEqual({ marginBottom: 0 });
    expect(composerFooterAnchoring("android", -5).listStyle).toEqual({ marginBottom: 0 });
  });
});

describe("footerButtonsBottom (Galaxy A17)", () => {
  const navBarTop = 832 - 48; // 784
  const keyboardTop = 473.6;

  it("clavier fermé : bas des boutons à 784, juste au-dessus de la barre de navigation", () => {
    const bottom = footerButtonsBottom({ modalHeight: 832, keyboardInset: 0, bottomInsetWhenClosed: 48, minPadding: 8 });
    expect(bottom).toBe(784);
    expect(bottom).toBeLessThanOrEqual(navBarTop);
  });

  it("clavier ouvert : bas des boutons 8 dp au-dessus du clavier, sans recompter la barre de navigation", () => {
    const bottom = footerButtonsBottom({ modalHeight: 832, keyboardInset: 358.4, bottomInsetWhenClosed: 48, minPadding: 8 });
    expect(bottom).toBeCloseTo(465.6, 5);
    expect(bottom).toBeLessThanOrEqual(keyboardTop);
    // Une double compensation (48 + 358,4) placerait les boutons 40 dp plus haut.
    expect(keyboardTop - bottom).toBeCloseTo(8, 5);
  });
});

import { footerBottomPadding, ANDROID_FOOTER_GAP } from "../src/utils/composerFooter";

describe("footerBottomPadding", () => {
  it("Android clavier fermé (A17, barre de navigation 48) → 56 : 8 dp d'air au-dessus de la barre", () => {
    expect(footerBottomPadding("android", 48, 8)).toBe(56);
    expect(footerBottomPadding("android", 48, 8) - 48).toBe(ANDROID_FOOTER_GAP);
  });

  it("Android clavier ouvert (marge sûre 0) → 8, identique à l'OTA 2.0.0-ota.18", () => {
    expect(footerBottomPadding("android", 0, 8)).toBe(8);
  });

  it("Android : même règle pour les trois pieds, quel que soit l'ancien minimum (8, 10, 12)", () => {
    expect(footerBottomPadding("android", 48, 10)).toBe(56);
    expect(footerBottomPadding("android", 48, 12)).toBe(56);
  });

  it("Android : s'adapte à la vraie barre de chaque téléphone (gestes ~24, trois boutons 48)", () => {
    expect(footerBottomPadding("android", 24, 8)).toBe(32);
    expect(footerBottomPadding("android", 48, 8)).toBe(56);
  });

  it("iOS : formule d'origine inchangée (iPhone 16e, barre d'accueil 34)", () => {
    expect(footerBottomPadding("ios", 34, 8)).toBe(34);
    expect(footerBottomPadding("ios", 34, 10)).toBe(34);
    expect(footerBottomPadding("ios", 34, 12)).toBe(34);
    expect(footerBottomPadding("ios", 0, 8)).toBe(8);
    expect(footerBottomPadding("ios", 0, 12)).toBe(12);
  });

  it("web : formule d'origine inchangée", () => {
    expect(footerBottomPadding("web", 0, 12)).toBe(12);
  });

  it("valeur de marge invalide traitée comme 0", () => {
    expect(footerBottomPadding("android", Number.NaN, 8)).toBe(8);
    expect(footerBottomPadding("ios", -3, 8)).toBe(8);
  });

  it("position A17 du bas des boutons : 776 clavier fermé (8 dp au-dessus de 784), 465,6 clavier ouvert", () => {
    expect(832 - footerBottomPadding("android", 48, 8)).toBe(776);
    expect(784 - (832 - footerBottomPadding("android", 48, 8))).toBe(8);
    expect(473.6 - footerBottomPadding("android", 0, 8)).toBeCloseTo(465.6, 5);
  });
});
