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
  off_rose: {
    id: 'off_rose',
    action: 'ADMIRER',
    label: 'Admirer',
    consumptionMode: 'PRIVATE',
  },
  off_hamburger: {
    id: 'off_hamburger',
    action: 'MANGER',
    label: 'Manger',
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
