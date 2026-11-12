import { describe, it, expect } from "vitest";
import { REMINDER_THRESHOLDS_DAYS, reminderMessage, reminderToSend } from "../../src/policies/twoFactorReminder";

describe("rappels avant l'échéance — règle pure", () => {
  it("seuils : 7, 3 et 1 jour", () => {
    expect([...REMINDER_THRESHOLDS_DAYS]).toEqual([7, 3, 1]);
  });

  it("rien avant le premier seuil", () => {
    for (const d of [14, 13, 10, 8]) expect(reminderToSend(d, [])).toBeNull();
  });

  it("un rappel à chaque seuil, une seule fois", () => {
    expect(reminderToSend(7, [])).toBe(7);
    expect(reminderToSend(7, [7])).toBeNull();
    expect(reminderToSend(6, [7])).toBeNull();
    expect(reminderToSend(3, [7])).toBe(3);
    expect(reminderToSend(3, [7, 3])).toBeNull();
    expect(reminderToSend(1, [7, 3])).toBe(1);
    expect(reminderToSend(1, [7, 3, 1])).toBeNull();
  });

  it("serveur en retard : seul le rappel le plus urgent est envoyé, jamais plusieurs d'un coup", () => {
    expect(reminderToSend(2, [])).toBe(3); // 7 et 3 sont dus : on n'envoie que 3
    expect(reminderToSend(2, [3])).toBeNull(); // et jamais le 7 ensuite
    expect(reminderToSend(1, [3])).toBe(1);
    expect(reminderToSend(1, [])).toBe(1);
  });

  it("jamais un rappel moins urgent après un plus urgent", () => {
    expect(reminderToSend(6, [3])).toBeNull();
    expect(reminderToSend(2, [1])).toBeNull();
  });

  it("message : singulier et pluriel, sans donnée sensible", () => {
    expect(reminderMessage(1)).toContain("dans 1 jour.");
    expect(reminderMessage(3)).toContain("dans 3 jours.");
    expect(reminderMessage(3)).toContain("Réglages → Sécurité et appareils");
  });
});
