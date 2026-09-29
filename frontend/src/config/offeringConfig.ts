/**
 * Configuration des offrandes MVP
 * Structure extensible pour ajouter les 54 offrandes
 */

export interface OfferingConfig {
  id: string;
  action: string; // BOIRE, ADMIRER, MANGER, etc.
  label: string; // Libellé affiché au bouton
  consumptionMode: 'PRIVATE' | 'SHARED';
}

export const OFFERING_CONFIG: Record<string, OfferingConfig> = {
  // MVP - 3 offerings
  off_biere: {
    id: 'off_biere',
    action: 'BOIRE',
    label: 'Boire',
    consumptionMode: 'SHARED',
  },
  off_fraises: {
    id: 'off_fraises',
    action: 'MANGER',
    label: 'Manger',
    consumptionMode: 'SHARED',
  },
  off_bonbons: {
    id: 'off_bonbons',
    action: 'MANGER',
    label: 'Manger',
    consumptionMode: 'SHARED',
  },
  off_cafe: {
    id: 'off_cafe',
    action: 'BOIRE',
    label: 'Boire',
    consumptionMode: 'SHARED',
  },
  off_cocktail: {
    id: 'off_cocktail',
    action: 'BOIRE',
    label: 'Boire',
    consumptionMode: 'SHARED',
  },
  off_cookie: {
    id: 'off_cookie',
    action: 'MANGER',
    label: 'Manger',
    consumptionMode: 'SHARED',
  },
  off_glace: {
    id: 'off_glace',
    action: 'MANGER',
    label: 'Manger',
    consumptionMode: 'SHARED',
  },
  off_pizza: {
    id: 'off_pizza',
    action: 'MANGER',
    label: 'Manger',
    consumptionMode: 'SHARED',
  },
  off_coupechampagne: {
    id: 'off_coupechampagne',
    action: 'BOIRE',
    label: 'Boire',
    consumptionMode: 'SHARED',
  },
  off_verrevin: {
    id: 'off_verrevin',
    action: 'BOIRE',
    label: 'Boire',
    consumptionMode: 'SHARED',
  },
  off_sushismakis: {
    id: 'off_sushismakis',
    action: 'MANGER',
    label: 'Manger',
    consumptionMode: 'SHARED',
  },
  off_the: {
    id: 'off_the',
    action: 'BOIRE',
    label: 'Boire',
    consumptionMode: 'SHARED',
  },

  // Futurs offerings seront ajoutés ici
};

/**
 * Récupère la config d'une offrande
 * Retourne null si l'offrande n'est pas configurée
 */
export function getOfferingConfig(
  offeringId: string,
): OfferingConfig | null {
  return OFFERING_CONFIG[offeringId] ?? null;
}

/**
 * Récupère le libellé d'action pour une offrande
 */
export function getOfferingLabel(offeringId: string): string | null {
  const config = getOfferingConfig(offeringId);
  return config?.label ?? null;
}

/**
 * Récupère l'action pour une offrande
 */
export function getOfferingAction(offeringId: string): string | null {
  const config = getOfferingConfig(offeringId);
  return config?.action ?? null;
}
