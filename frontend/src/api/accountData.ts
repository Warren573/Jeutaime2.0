import { apiFetch } from './client';

export interface MyAccountDataDTO {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
  premiumTier: string;
  premiumUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  profile: Record<string, unknown> | null;
  wallet: { coins: number; lastDailyBonus: string | null } | null;
  settings: Record<string, unknown> | null;
}

export type PersonalDataExportDTO = Record<string, unknown>;

export async function getMyAccountData(): Promise<MyAccountDataDTO> {
  const res = (await apiFetch('/auth/me')) as { data: MyAccountDataDTO };
  return res.data;
}

export async function exportMyPersonalData(): Promise<PersonalDataExportDTO> {
  const res = (await apiFetch('/auth/export-data')) as { data: PersonalDataExportDTO };
  return res.data;
}
