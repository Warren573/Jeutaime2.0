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

// ============================================================
// Salon Sessions (Chantier 1)
// ============================================================

export interface SalonSessionDTO {
  id: string;
  participantCount: number;
  participants: ParticipantDTO[];
  isFull: boolean;
  startedAt: string;
  expiresAt: string;
}

export interface ParticipantDTO {
  userId: string;
  pseudo: string;
  gender?: string;
  avatarConfig?: unknown;
  joinedAt?: string;
}

export interface SalonSessionDetailDTO extends SalonSessionDTO {
  salonKind: string;
  salonName: string;
  status: "ACTIVE" | "EXPIRED";
}

export interface EncounterDTO {
  userId: string;
  pseudo: string;
  gender?: string;
  avatarConfig?: unknown;
  metAt: string;
}

export async function getActiveSessions(
  salonKind: string,
): Promise<SalonSessionDTO[]> {
  const res = (await apiFetch(
    `/salon-sessions/active/${salonKind}`,
  )) as { data: { sessions: SalonSessionDTO[] } };
  return res.data.sessions;
}

export async function getSalonCounters(): Promise<Record<string, number>> {
  const res = (await apiFetch(
    `/salon-sessions/counters`,
  )) as { data: Record<string, number> };
  return res.data;
}

export async function getSessionDetail(
  sessionId: string,
): Promise<SalonSessionDetailDTO> {
  const res = (await apiFetch(
    `/salon-sessions/${sessionId}`,
  )) as { data: SalonSessionDetailDTO };
  return res.data;
}

export async function joinSession(
  salonKind: string,
): Promise<SalonSessionDetailDTO> {
  const res = (await apiFetch(`/salon-sessions/join/${salonKind}`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: SalonSessionDetailDTO };
  return res.data;
}

export async function leaveSession(sessionId: string): Promise<{ success: boolean }> {
  const res = (await apiFetch(`/salon-sessions/${sessionId}/leave`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: { success: boolean } };
  return res.data;
}

export async function getPreviousEncounters(
  salonKind: string,
): Promise<EncounterDTO[]> {
  const res = (await apiFetch(
    `/salon-sessions/encounters/${salonKind}`,
  )) as { data: { encounters: EncounterDTO[] } };
  return res.data.encounters;
}

export interface CurrentSalonSessionDTO {
  sessionId: string;
  salonKind: string;
  salonId: string;
  salonName: string;
}

export async function getCurrentSalonSession(): Promise<CurrentSalonSessionDTO | null> {
  const res = (await apiFetch(
    `/salon-sessions/current`,
  )) as { data: CurrentSalonSessionDTO | null };
  return res.data;
}
