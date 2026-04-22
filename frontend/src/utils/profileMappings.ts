// Gender: 'F'|'M'|'NB' (frontend) ↔ 'FEMME'|'HOMME'|'AUTRE' (backend)
export const GENDER_TO_BACKEND: Record<string, string> = {
  F: 'FEMME',
  M: 'HOMME',
  NB: 'AUTRE',
};

export const GENDER_TO_FRONTEND: Record<string, string> = {
  FEMME: 'F',
  HOMME: 'M',
  AUTRE: 'NB',
};

// LookingFor: lowercase (frontend) ↔ UPPERCASE (backend)
export const LOOKING_FOR_TO_BACKEND: Record<string, string> = {
  amitie: 'AMITIE',
  relation: 'RELATION',
  flirt: 'FLIRT',
  discussion: 'DISCUSSION',
  serieux: 'SERIEUX',
};

export const LOOKING_FOR_TO_FRONTEND: Record<string, string> = {
  AMITIE: 'amitie',
  RELATION: 'relation',
  FLIRT: 'flirt',
  DISCUSSION: 'discussion',
  SERIEUX: 'serieux',
};

export const GENDER_DISPLAY: Record<string, string> = {
  F: 'Femmes',
  M: 'Hommes',
  NB: 'Non-binaires',
};

export function computeAge(birthDate: string | undefined | null): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age >= 13 && age < 120 ? age : null;
}
