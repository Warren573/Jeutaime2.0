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
