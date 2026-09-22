import { apiFetch } from "./client";

export interface JournalPersonalEventDTO {
  id: string;
  kind: string;
  text: string;
  occurredAt: string;
}

export interface JournalEditionDTO {
  date: string;
  personalEvents: JournalPersonalEventDTO[];
}

export async function getJournalEdition(): Promise<JournalEditionDTO> {
  const res = await apiFetch("/journal/edition") as { data: JournalEditionDTO };
  return res.data;
}
