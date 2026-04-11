/**
 * Tests de la couche events : on vérifie que chaque event émis est
 * bien reçu par un listener typé, avec le bon payload. Pas de DB,
 * pas de handlers — juste l'emitter en mémoire.
 */
import { describe, it, expect, vi } from "vitest";
import {
  emitter,
  emitOfferingSent,
  emitMagieCast,
  emitMagieBroken,
  emitPremiumSubscribed,
  emitPremiumCancelled,
  emitReportCreated,
  emitLetterSent,
  emitMatchCreated,
} from "../../src/events";

describe("Events layer", () => {
  // ==============================================================
  // Events existants (non-régression Phase 1)
  // ==============================================================
  it("emitLetterSent → listener reçoit le payload", () => {
    const listener = vi.fn();
    emitter.once("letterSent", listener);
    emitLetterSent({
      matchId: "m1",
      fromUserId: "u1",
      toUserId: "u2",
      matchLetterCountA: 1,
      matchLetterCountB: 0,
      isGhostRelance: false,
    });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]).toMatchObject({
      matchId: "m1",
      fromUserId: "u1",
      toUserId: "u2",
    });
  });

  it("emitMatchCreated → listener reçoit le payload", () => {
    const listener = vi.fn();
    emitter.once("matchCreated", listener);
    emitMatchCreated({
      matchId: "m1",
      userAId: "u1",
      userBId: "u2",
      initiatorId: "u1",
    });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]).toMatchObject({ matchId: "m1" });
  });

  // ==============================================================
  // Nouveaux events (Phase 9)
  // ==============================================================
  it("emitOfferingSent → payload reçu avec tous les champs", () => {
    const listener = vi.fn();
    emitter.once("offeringSent", listener);
    const now = new Date("2026-04-11T12:00:00.000Z");
    emitOfferingSent({
      offeringSentId: "os_1",
      offeringId: "off_rose",
      fromUserId: "u1",
      toUserId: "u2",
      salonId: null,
      cost: 50,
      expiresAt: now,
    });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]).toEqual({
      offeringSentId: "os_1",
      offeringId: "off_rose",
      fromUserId: "u1",
      toUserId: "u2",
      salonId: null,
      cost: 50,
      expiresAt: now,
    });
  });

  it("emitMagieCast → payload reçu", () => {
    const listener = vi.fn();
    emitter.once("magieCast", listener);
    const expiresAt = new Date("2026-04-11T12:30:00.000Z");
    emitMagieCast({
      magieCastId: "mc_1",
      magieId: "mag_grenouille",
      fromUserId: "u1",
      toUserId: "u2",
      salonId: "s_piscine",
      expiresAt,
      cost: 30,
    });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]).toMatchObject({
      magieCastId: "mc_1",
      magieId: "mag_grenouille",
      salonId: "s_piscine",
    });
  });

  it("emitMagieBroken → payload reçu", () => {
    const listener = vi.fn();
    emitter.once("magieBroken", listener);
    emitMagieBroken({
      magieCastId: "mc_1",
      magieId: "mag_grenouille",
      antiSpellId: "mag_bisou",
      brokenBy: "u3",
      originalToUserId: "u2",
    });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]).toMatchObject({
      antiSpellId: "mag_bisou",
      brokenBy: "u3",
    });
  });

  it("emitPremiumSubscribed → payload reçu", () => {
    const listener = vi.fn();
    emitter.once("premiumSubscribed", listener);
    const newUntil = new Date("2026-05-11T12:00:00.000Z");
    emitPremiumSubscribed({
      userId: "u1",
      planId: "premium_monthly",
      paymentMethod: "coins",
      coinsSpent: 500,
      newUntil,
      durationDays: 30,
    });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]).toMatchObject({
      userId: "u1",
      planId: "premium_monthly",
      paymentMethod: "coins",
    });
  });

  it("emitPremiumCancelled → payload reçu", () => {
    const listener = vi.fn();
    emitter.once("premiumCancelled", listener);
    emitPremiumCancelled({ userId: "u1", previousUntil: null });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]).toEqual({
      userId: "u1",
      previousUntil: null,
    });
  });

  it("emitReportCreated → payload reçu", () => {
    const listener = vi.fn();
    emitter.once("reportCreated", listener);
    emitReportCreated({
      reportId: "r_1",
      reporterId: "u1",
      targetId: "u2",
      reason: "HARASSMENT",
    });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]).toMatchObject({
      reportId: "r_1",
      reason: "HARASSMENT",
    });
  });

  // ==============================================================
  // Isolation : un listener once() ne reçoit qu'un seul appel
  // ==============================================================
  it("emitter.once() → listener appelé une seule fois", () => {
    const listener = vi.fn();
    emitter.once("offeringSent", listener);
    const base = {
      offeringSentId: "os_x",
      offeringId: "off_x",
      fromUserId: "u1",
      toUserId: "u2",
      salonId: null,
      cost: 10,
      expiresAt: null,
    };
    emitOfferingSent(base);
    emitOfferingSent(base);
    expect(listener).toHaveBeenCalledOnce();
  });
});
