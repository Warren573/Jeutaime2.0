import { apiFetch } from "./client";

export interface SalonDTO {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  magicAction: string | null;
  backgroundImage: string | null;
  backgroundType: string;
  backgroundConfig: unknown;
  primaryColor: string | null;
  secondaryColor: string | null;
  textColor: string | null;
  gradient: unknown;
  order: number;
}

export interface SalonMessageDTO {
  id: string;
  salonId: string;
  userId: string;
  pseudo: string;
  gender: string;
  age: number | null;
  kind: string;
  content: string;
  meta: unknown;
  createdAt: string;
}

export async function listSalons(): Promise<SalonDTO[]> {
  const res = (await apiFetch("/salons")) as { data: SalonDTO[] };
  return res.data;
}

export async function getSalon(id: string): Promise<SalonDTO> {
  const res = (await apiFetch(`/salons/${id}`)) as { data: SalonDTO };
  return res.data;
}

export async function listMessages(
  salonId: string,
  limit = 50,
): Promise<SalonMessageDTO[]> {
  const res = (await apiFetch(
    `/salons/${salonId}/messages?limit=${limit}`,
  )) as { data: SalonMessageDTO[] };
  return res.data;
}

export async function postMessage(
  salonId: string,
  content: string,
): Promise<SalonMessageDTO> {
  const res = (await apiFetch(`/salons/${salonId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  })) as { data: SalonMessageDTO };
  return res.data;
}
