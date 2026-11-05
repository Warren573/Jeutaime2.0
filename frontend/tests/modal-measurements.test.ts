/**
 * Mesures des fenêtres Modal (diagnostic réservé à l'administration).
 */
import { describe, it, expect } from "vitest";
import {
  formatModalMeasurements,
  isModalMeasurementsEnabled,
  setModalMeasurementsEnabled,
  subscribeModalMeasurements,
} from "../src/dev/modalMeasurements";

describe("interrupteur des mesures Modal", () => {
  it("désactivé par défaut", () => {
    expect(isModalMeasurementsEnabled()).toBe(false);
  });

  it("notifie les abonnés uniquement lors d'un vrai changement", () => {
    let calls = 0;
    const unsub = subscribeModalMeasurements(() => { calls += 1; });
    setModalMeasurementsEnabled(true);
    setModalMeasurementsEnabled(true);
    setModalMeasurementsEnabled(false);
    unsub();
    setModalMeasurementsEnabled(true);
    setModalMeasurementsEnabled(false);
    expect(calls).toBe(2);
    expect(isModalMeasurementsEnabled()).toBe(false);
  });
});

describe("formatModalMeasurements", () => {
  it("valeurs A16 lisibles, arrondies au dixième", () => {
    const lines = formatModalMeasurements({
      modalLayoutHeight: 832,
      modalInsets: { top: 0, bottom: 48 },
      inheritedInsets: { top: 35.6, bottom: 48 },
      statusBarHeight: 35.64,
      screenHeight: 832,
      keyboardTopY: 473.6,
      appliedKeyboardInset: 358.4,
    });
    expect(lines).toEqual([
      "Modal onLayout h=832 · écran h=832",
      "Marges Modal haut/bas=0/48",
      "Marges héritées haut/bas=35.6/48 · barre d'état=35.6",
      "Clavier bord haut=473.6 · compensation appliquée=358.4",
    ]);
  });

  it("valeurs absentes affichées « — »", () => {
    const lines = formatModalMeasurements({
      modalLayoutHeight: null,
      modalInsets: { top: 0, bottom: 0 },
      inheritedInsets: { top: 0, bottom: 0 },
      statusBarHeight: null,
      screenHeight: 832,
      keyboardTopY: null,
      appliedKeyboardInset: 0,
    });
    expect(lines[0]).toBe("Modal onLayout h=— · écran h=832");
    expect(lines[3]).toBe("Clavier bord haut=— · compensation appliquée=0");
  });
});

import { formatFooterLine, getModalExtraLines, setModalExtraLine } from "../src/dev/modalMeasurements";

describe("lignes supplémentaires du panneau", () => {
  it("ignorées tant que l'interrupteur est désactivé", () => {
    setModalMeasurementsEnabled(false);
    setModalExtraLine("pied", "Pied y=1");
    expect(getModalExtraLines()).toEqual([]);
  });

  it("ajoutées, remplacées puis retirées quand l'interrupteur est activé", () => {
    setModalMeasurementsEnabled(true);
    setModalExtraLine("pied", "Pied y=1");
    const first = getModalExtraLines();
    expect(first).toEqual(["Pied y=1"]);
    setModalExtraLine("pied", "Pied y=1");
    expect(getModalExtraLines()).toBe(first); // instantané stable si inchangé
    setModalExtraLine("pied", "Pied y=2");
    expect(getModalExtraLines()).toEqual(["Pied y=2"]);
    setModalExtraLine("pied", null);
    expect(getModalExtraLines()).toEqual([]);
    setModalMeasurementsEnabled(false);
  });

  it("formatFooterLine : position, hauteur et bas arrondis au dixième", () => {
    expect(formatFooterLine("Pied de rédaction", 613.6, 170.44)).toBe("Pied de rédaction y=613.6 h=170.4 bas=784");
  });
});
