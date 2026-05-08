import { apiFetch } from "./client";

export interface MagieCatalogItemDTO {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  durationSec: number;
  type: string;
  breakConditionId: string | null;
}

export interface MagieCatalogDTO {
  spells: MagieCatalogItemDTO[];
  antiSpells: MagieCatalogItemDTO[];
}

export interface MagieCastDTO {
  id: string;
  magieId: string;
  magie: MagieCatalogItemDTO;
  fromUserId: string;
  toUserId: string;
  salonId: string | null;
  castAt: string;
  expiresAt: string;
  brokenAt: string | null;
  brokenBy: string | null;
}

export async function getMagiesCatalog(): Promise<MagieCatalogDTO> {
  const res = (await apiFetch("/magies/catalog")) as { data: MagieCatalogDTO };
  return res.data;
}

export async function castSpell(payload: {
  magieId: string;
  toUserId: string;
  salonId?: string;
}): Promise<MagieCastDTO> {
  const res = (await apiFetch("/magies/cast", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as { data: MagieCastDTO };
  return res.data;
}

export async function breakSpell(
  castId: string,
  antiSpellId: string,
): Promise<MagieCastDTO> {
  const res = (await apiFetch(`/magies/${castId}/break`, {
    method: "POST",
    body: JSON.stringify({ antiSpellId }),
  })) as { data: MagieCastDTO };
  return res.data;
}

export async function getActiveMagies(userId: string): Promise<MagieCastDTO[]> {
  const res = (await apiFetch(`/magies/active/${userId}`)) as {
    data: MagieCastDTO[];
  };
  return res.data;
}

export interface SalonMagieDTO {
  castId: string;
  magieId: string;
  name: string;
  emoji: string;
  type: string;
  breakConditionId: string | null;
  fromUserId: string;
  fromPseudo: string;
  toUserId: string;
  toPseudo: string;
  salonId: string;
  castAt: string;
  expiresAt: string;
  isActive: boolean;
}

export async function getSalonMagies(salonId: string): Promise<SalonMagieDTO[]> {
  const res = (await apiFetch(`/magies/salon/${salonId}`)) as {
    data: SalonMagieDTO[];
  };
  return res.data;
}
