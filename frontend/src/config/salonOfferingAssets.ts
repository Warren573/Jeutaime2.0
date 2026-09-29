/**
 * Offrandes de salon qui possèdent réellement un PNG stage1.
 * Cette table est la source de vérité d'affichage côté app :
 * une offrande sans stage1 n'est pas proposée dans le salon.
 */
export const SALON_OFFERING_STAGE1_ASSETS: Record<string, any> = {
  off_biere: require('../../public/offerings/off_biere_stage1.png'),
  off_fraises: require('../../public/offerings/off_fraises_stage1.png'),
  off_bonbons: require('../../public/offerings/off_bonbons_stage1.png'),
  off_cafe: require('../../public/offerings/off_cafe_stage1.png'),
  off_cocktail: require('../../public/offerings/off_cocktail_stage1.png'),
  off_cookie: require('../../public/offerings/off_cookie_stage1.png'),
  off_glace: require('../../public/offerings/off_glace_stage1.png'),
  off_pizza: require('../../public/offerings/off_pizza_stage1.png'),
  off_coupechampagne: require('../../public/offerings/off_coupechampagne_stage1.png'),
  off_verrevin: require('../../public/offerings/off_verrevin_stage1.png'),
  off_sushismakis: require('../../public/offerings/off_sushismakis_stage1.png'),
  off_the: require('../../public/offerings/off_thé_stage1.png'),
};

export const SALON_OFFERING_IDS_WITH_PNG = new Set(
  Object.keys(SALON_OFFERING_STAGE1_ASSETS),
);

export function getSalonOfferingStage1Asset(offeringId: string): any | null {
  return SALON_OFFERING_STAGE1_ASSETS[offeringId] ?? null;
}
