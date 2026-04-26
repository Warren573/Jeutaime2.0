import { apiFetch } from "./client";

// ------------------------------------------------------------------
// Types miroir du backend (sans dépendance sur shared/)
// ------------------------------------------------------------------

export type MatchStatus = "PENDING" | "ACTIVE" | "BROKEN" | "BLOCKED" | "GHOSTED";

export interface PublicProfileDTO {
  pseudo: string;
  gender: "HOMME" | "FEMME" | "AUTRE";
  city: string;
  birthDate?: string;
  bio?: string;
  physicalDesc?: string;
  avatarConfig?: Record<string, unknown>;
  points: number;
  badges: string[];
}

export interface PhotoUnlockDTO {
  threshold: number;
  myCount: number;
  otherCount: number;
  unlocked: boolean;
}

export interface MatchDTO {
  id: string;
  userAId: string;
  userBId: string;
  initiatorId: string;
  status: MatchStatus;
  letterCountA: number;
  letterCountB: number;
  lastLetterBy: string | null;
  lastLetterAt: string | null;
  questionsValidated: boolean;
  ghostRelanceUsedBy: string | null;
  ghostDetectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  otherUserId: string;
  otherProfile: PublicProfileDTO | null;
  currentUserSide: "A" | "B";
  canSend: boolean;
  canSendReason: string | null;
  isGhosting: boolean;
  canRelance: boolean;
  photoUnlock: PhotoUnlockDTO;
}

export interface MatchListResponse {
  data: MatchDTO[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    pages: number;
  };
}

export interface LetterDTO {
  id: string;
  matchId: string;
  fromId: string;
  toId: string;
  content: string;
  status: "SENT" | "READ";
  sentAt: string;
  readAt: string | null;
}

// ------------------------------------------------------------------
// API calls
// ------------------------------------------------------------------

export async function listMatches(page = 1, perPage = 50): Promise<MatchDTO[]> {
  const res = await apiFetch(`/matches?page=${page}&perPage=${perPage}`) as MatchListResponse;
  return res?.data ?? [];
}

export async function getMatch(matchId: string): Promise<MatchDTO> {
  const res = await apiFetch(`/matches/${matchId}`) as { data: MatchDTO };
  return res.data;
}

export async function listLetters(matchId: string): Promise<LetterDTO[]> {
  const res = await apiFetch(`/matches/${matchId}/letters`) as { data: LetterDTO[] };
  return res?.data ?? [];
}

export async function sendLetter(matchId: string, content: string): Promise<LetterDTO> {
  const res = await apiFetch(`/matches/${matchId}/letters`, {
    method: "POST",
    body: JSON.stringify({ content }),
  }) as { data: LetterDTO };
  return res.data;
}

export async function markLetterRead(matchId: string, letterId: string): Promise<void> {
  await apiFetch(`/matches/${matchId}/letters/${letterId}/read`, {
    method: "POST",
  });
}
