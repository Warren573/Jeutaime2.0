import { describe, expect, it } from "vitest";
import {
  approvedOfferingCost, approvedOfferingName, approvedMagieCost, isRetiredOfferingId,
} from "../../src/policies/economyCatalog";

describe("Approved server economy prices", () => {
  it("charges exactly 5 for listed drinks and 10 for listed foods", () => {
    expect(approvedOfferingCost("off_biere", "BOISSON", 30)).toBe(5);
    expect(approvedOfferingCost("off_sushismakis", "NOURRITURE", 60)).toBe(10);
    expect(approvedOfferingCost("off_unknown", "BOISSON", 47)).toBe(47);
  });
  it("enforces all five personal offerings even before DB sync", () => {
    const ids = [["desk_chocolats",60],["desk_bouquet",80],["desk_rose",120],["desk_grand_cru",180],["desk_venise",300]] as const;
    for (const [id,cost] of ids) expect(approvedOfferingCost(id, "SYMBOLIQUE", 999)).toBe(cost);
    expect(approvedOfferingName("desk_rose", "Une rose")).toBe("Rose éternelle");
    expect(isRetiredOfferingId("desk_parfum")).toBe(true);
    expect(isRetiredOfferingId("desk_rose")).toBe(false);
  });
  it("charges 20 for each approved magic, preserves anti-spells", () => {
    for (const id of ["mag_grenouille","mag_ane","mag_poule","mag_fantome","mag_pirate","mag_statue","mag_rockstar","mag_invisibilite"]) {
      expect(approvedMagieCost(id, 100)).toBe(20);
    }
    expect(approvedMagieCost("mag_bisou", 34)).toBe(34);
  });
});
