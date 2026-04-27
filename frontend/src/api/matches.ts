import { apiFetch } from "./client";

// ------------------------------------------------------------------
// Types miroir du backend
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

export type PhotoUnlockLevel = 0 | 1 | 2 | 3;
export type PhotoVariant = "hidden" | "blurStrong" | "blurMedium" | "clear";

export interface PhotoUnlockDTO {
  threshold: number;
  myCount: number;
  otherCount: number;
  unlocked: boolean;
  level: PhotoUnlockLevel;
  variant: PhotoVariant;
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
  fromUserId: string;
  toUserId: string;
  content: string;
  status: "SENT" | "READ";
  sentAt: string;
  readAt: string | null;
}

// ------------------------------------------------------------------
// Types pour le jeu des 3 questions
// ------------------------------------------------------------------

export interface MatchQuestionItemDTO {
  profileQuestionId: string;
  questionId: string;
  questionText: string;
  options: string[] | null;
}

export interface MatchQuestionsDTO {
  matchId: string;
  questionsValidated: boolean;
  myStatus: "pending" | "submitted";
  myScore: number | null;
  questions: MatchQuestionItemDTO[];
}

export interface MatchAnswersResultDTO {
  myScore: number;
  passed: boolean;
  questionsValidated: boolean;
  waitingForOther: boolean;
  matchBroken: boolean;
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

export async function markLetterRead(letterId: string): Promise<void> {
  await apiFetch(`/letters/${letterId}/read`, {
    method: "PATCH",
  });
}

export async function getMatchQuestions(matchId: string): Promise<MatchQuestionsDTO> {
  const res = await apiFetch(`/matches/${matchId}/questions`) as { data: MatchQuestionsDTO };
  return res.data;
}

export async function submitMatchAnswers(
  matchId: string,
  answers: { profileQuestionId: string; answer: string }[],
): Promise<MatchAnswersResultDTO> {
  const res = await apiFetch(`/matches/${matchId}/questions/answers`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  }) as { data: MatchAnswersResultDTO };
  return res.data;
}
