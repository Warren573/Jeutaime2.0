/** Règles tarifaires approuvées le 13 octobre 2026.
 * Source serveur : les prix restent corrects même si les lignes historiques
 * d'OfferingCatalog ou MagieCatalog n'ont pas encore été synchronisées.
 */
const personal = {
  desk_chocolats: { cost: 60, name: "Boîte de chocolats" },
  desk_bouquet: { cost: 80, name: "Bouquet de fleurs" },
  desk_rose: { cost: 120, name: "Rose éternelle" },
  desk_grand_cru: { cost: 180, name: "Bouteille de vin" },
  desk_venise: { cost: 300, name: "Passeport et deux billets" },
} as const;

const salon = new Set([
  "off_biere", "off_fraises", "off_bonbons", "off_cafe", "off_cocktail", "off_cookie",
  "off_glace", "off_pizza", "off_coupechampagne", "off_verrevin", "off_sushismakis", "off_the",
]);

const magies = new Set([
  "mag_grenouille", "mag_ane", "mag_poule", "mag_fantome",
  "mag_pirate", "mag_statue", "mag_rockstar", "mag_invisibilite",
]);

export function isRetiredOfferingId(id: string): boolean {
  return id === "desk_parfum";
}

export function approvedOfferingCost(id: string, category: string, storedCost: number): number {
  if (id in personal) return personal[id as keyof typeof personal].cost;
  if (salon.has(id)) {
    if (category === "BOISSON") return 5;
    if (category === "NOURRITURE") return 10;
  }
  return storedCost;
}

export function approvedOfferingName(id: string, storedName: string): string {
  return id in personal ? personal[id as keyof typeof personal].name : storedName;
}

export function approvedMagieCost(id: string, storedCost: number): number {
  return magies.has(id) ? 20 : storedCost;
}
