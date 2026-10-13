import { describe, expect, it } from "vitest";
import { calculateRefugeFinalRewards } from "../../src/policies/refugeFinalRewards";
const days = [1,2,3,4,5,6,7];
describe("Refuge : récompense finale exclusive après sept jours", () => {
  it("récompense chacun de 100 si les sept jours sont parfaits", () => {
    expect(calculateRefugeFinalRewards({adopteDays:days,adoptantDays:days,perfectDays:days}))
      .toEqual({adopte:100,adoptant:100,collectivePerfect:true});
  });
  it("donne 50 à chacun si les deux sont assidus sans parfait", () => {
    expect(calculateRefugeFinalRewards({adopteDays:days,adoptantDays:days,perfectDays:[1,2,3]}))
      .toEqual({adopte:50,adoptant:50,collectivePerfect:false});
  });
  it("le partenaire assidu conserve 50 quand l'autre manque une journée", () => {
    expect(calculateRefugeFinalRewards({adopteDays:days,adoptantDays:[1,2,3,4,5,6],perfectDays:days}))
      .toEqual({adopte:50,adoptant:0,collectivePerfect:false});
  });
  it("ne crédite pas un participant non assidu", () => {
    expect(calculateRefugeFinalRewards({adopteDays:[],adoptantDays:days,perfectDays:[]}))
      .toEqual({adopte:0,adoptant:50,collectivePerfect:false});
  });
  it("ne crédite personne si aucun n'est assidu", () => {
    expect(calculateRefugeFinalRewards({adopteDays:[1,2],adoptantDays:[1,3],perfectDays:[]}))
      .toEqual({adopte:0,adoptant:0,collectivePerfect:false});
  });
  it("ne compte pas plusieurs fois la même journée", () => {
    expect(calculateRefugeFinalRewards({adopteDays:[1,1,2,3,4,5,6],adoptantDays:days,perfectDays:days}))
      .toEqual({adopte:0,adoptant:50,collectivePerfect:false});
  });
});
