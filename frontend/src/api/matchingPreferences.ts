import { apiFetch } from './client';

export type InterestedInValue = 'HOMME' | 'FEMME' | 'AUTRE';
export type LookingForValue = 'AMITIE' | 'RELATION' | 'FLIRT' | 'DISCUSSION' | 'SERIEUX';

export interface MatchingPreferencesDTO {
  interestedIn: InterestedInValue[];
  lookingFor: LookingForValue[];
}

export async function getMatchingPreferences(): Promise<MatchingPreferencesDTO> {
  const res = await apiFetch('/profiles/me');
  const profile = res?.data ?? {};
  return {
    interestedIn: Array.isArray(profile.interestedIn) ? profile.interestedIn : [],
    lookingFor: Array.isArray(profile.lookingFor) ? profile.lookingFor : [],
  };
}

export async function saveMatchingPreferences(
  preferences: MatchingPreferencesDTO,
): Promise<void> {
  await apiFetch('/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify(preferences),
  });
}
