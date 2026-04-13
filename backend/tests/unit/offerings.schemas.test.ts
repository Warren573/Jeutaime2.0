/**
 * Tests unitaires des schémas Zod du module Offerings.
 */
import { describe, it, expect } from "vitest";
import {
  SendOfferingSchema,
  ListReceivedQuerySchema,
} from "../../src/modules/offerings/offerings.schemas";

// ============================================================
// SendOfferingSchema
// ============================================================
describe("SendOfferingSchema", () => {
  const base = {
    offeringId: "off_rose",
    toUserId: "user-123",
  };

  it("minimum valide → OK", () => {
    const res = SendOfferingSchema.parse(base);
    expect(res.offeringId).toBe("off_rose");
    expect(res.toUserId).toBe("user-123");
    expect(res.salonId).toBeUndefined();
  });

  it("avec salonId → OK", () => {
    const res = SendOfferingSchema.parse({ ...base, salonId: "salon-42" });
    expect(res.salonId).toBe("salon-42");
  });

  it("offeringId manquant → rejeté", () => {
    expect(() =>
      SendOfferingSchema.parse({ toUserId: "u1" }),
    ).toThrow();
  });

  it("toUserId manquant → rejeté", () => {
    expect(() =>
      SendOfferingSchema.parse({ offeringId: "off_x" }),
    ).toThrow();
  });

  it("offeringId vide → rejeté", () => {
    expect(() =>
      SendOfferingSchema.parse({ offeringId: "", toUserId: "u1" }),
    ).toThrow();
  });

  it("toUserId vide → rejeté", () => {
    expect(() =>
      SendOfferingSchema.parse({ offeringId: "o", toUserId: "" }),
    ).toThrow();
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      SendOfferingSchema.parse({ ...base, cost: 999 }),
    ).toThrow();
  });
});

// ============================================================
// ListReceivedQuerySchema
// ============================================================
describe("ListReceivedQuerySchema", () => {
  it("vide → valeurs par défaut", () => {
    const res = ListReceivedQuerySchema.parse({});
    expect(res.onlyActive).toBe(true);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(20);
  });

  it('onlyActive: "false" → false', () => {
    const res = ListReceivedQuerySchema.parse({ onlyActive: "false" });
    expect(res.onlyActive).toBe(false);
  });

  it('onlyActive: "true" → true', () => {
    const res = ListReceivedQuerySchema.parse({ onlyActive: "true" });
    expect(res.onlyActive).toBe(true);
  });

  it("onlyActive: autre valeur → rejeté", () => {
    expect(() =>
      ListReceivedQuerySchema.parse({ onlyActive: "yes" }),
    ).toThrow();
  });

  it('page: "3" → 3 (coerce)', () => {
    const res = ListReceivedQuerySchema.parse({ page: "3" });
    expect(res.page).toBe(3);
  });

  it("page: 0 → rejeté", () => {
    expect(() => ListReceivedQuerySchema.parse({ page: 0 })).toThrow();
  });

  it("pageSize: 101 → rejeté (max)", () => {
    expect(() =>
      ListReceivedQuerySchema.parse({ pageSize: 101 }),
    ).toThrow();
  });

  it("pageSize: 50 → OK", () => {
    const res = ListReceivedQuerySchema.parse({ pageSize: 50 });
    expect(res.pageSize).toBe(50);
  });

  it("champ inconnu → rejeté (strict)", () => {
    expect(() =>
      ListReceivedQuerySchema.parse({ foo: "bar" }),
    ).toThrow();
  });
});
