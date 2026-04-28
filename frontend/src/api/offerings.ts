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
