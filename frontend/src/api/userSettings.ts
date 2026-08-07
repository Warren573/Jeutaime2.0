import { apiFetch } from './client';

export interface UserSettingsDTO {
  notifEmail: boolean;
  notifPush: boolean;
  soundEnabled: boolean;
  showInDiscovery: boolean;
  locationShared: boolean;
}

export type UserSettingsPatch = Partial<UserSettingsDTO>;

export async function getUserSettings(): Promise<UserSettingsDTO> {
  const res = (await apiFetch('/profiles/me/settings')) as { data: UserSettingsDTO };
  return res.data;
}

export async function updateUserSettings(patch: UserSettingsPatch): Promise<UserSettingsDTO> {
  const res = (await apiFetch('/profiles/me/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })) as { data: UserSettingsDTO };
  return res.data;
}
