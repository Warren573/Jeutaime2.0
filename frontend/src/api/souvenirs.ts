import { apiFetch } from "./client";

export interface SouvenirDTO {
  id: string;
  type: "milestone" | "match" | "letter" | "gift";
  title: string;
  description: string;
  date: string;
  emoji: string;
}

export async function getSouvenirs(): Promise<SouvenirDTO[]> {
  const res = (await apiFetch("/souvenirs")) as { data: SouvenirDTO[] };
  return res.data;
}
