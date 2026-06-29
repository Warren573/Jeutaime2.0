import { apiFetch } from "./client";

export interface OfferingCatalogItemDTO {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  category: string;
  durationMs: number | null;
  stackPriority: number;
  salonOnly: string;
  consumptionMode: "PRIVATE" | "SHARED";
}

export interface OfferingSentDTO {
  id: string;
  offeringId: string;
  offering: OfferingCatalogItemDTO;
  fromUserId: string;
  toUserId: string;
  salonId: string | null;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
  consumptionCount: number;
  currentStage: number;
  lastConsumedAt: string | null;
  lastConsumedBy: string | null;
}

export interface ListReceivedResponseDTO {
  items: OfferingSentDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function getOfferingsCatalog(): Promise<OfferingCatalogItemDTO[]> {
  const res = (await apiFetch("/offerings/catalog")) as {
    data: OfferingCatalogItemDTO[];
  };
  return res.data;
}

export async function sendOffering(payload: {
  offeringId: string;
  toUserId: string;
  salonId?: string;
}): Promise<OfferingSentDTO> {
  const res = (await apiFetch("/offerings/send", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as { data: OfferingSentDTO };
  return res.data;
}

export async function sendOfferingToSession(payload: {
  offeringId: string;
  sessionId: string;
}): Promise<{ success: boolean; count: number }> {
  const res = (await apiFetch("/offerings/send-to-session", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as { data: { success: boolean; count: number } };
  return res.data;
}

export async function getReceivedOfferings(
  page = 1,
  pageSize = 20,
  onlyActive = true,
): Promise<OfferingSentDTO[]> {
  const res = (await apiFetch(
    `/offerings/received?page=${page}&pageSize=${pageSize}&onlyActive=${onlyActive}`,
  )) as { data: OfferingSentDTO[] };
  return res.data;
}

export interface SalonOfferingDTO {
  id: string;
  offeringId: string;
  emoji: string;
  name: string;
  fromUserId: string;
  fromPseudo: string;
  toUserId: string;
  toPseudo: string;
  salonId: string;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
  consumptionCount: number;
  currentStage: number;
  consumptionMode: "PRIVATE" | "SHARED";
  lastConsumedBy: string | null;
}

export async function getSalonOfferings(salonId: string): Promise<SalonOfferingDTO[]> {
  const res = (await apiFetch(`/offerings/salon/${salonId}`)) as {
    data: SalonOfferingDTO[];
  };
  return res.data;
}

export async function consumeOffering(
  offeringId: string,
  action: string,
): Promise<OfferingSentDTO> {
  const res = (await apiFetch(`/offerings/${offeringId}/consume`, {
    method: "POST",
    body: JSON.stringify({ action }),
  })) as { data: OfferingSentDTO };
  return res.data;
}
