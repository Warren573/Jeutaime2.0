// ============================================================
// JeuTaime — Contrat API partagé backend ↔ frontend
// Ces types correspondent exactement aux DTOs retournés par le backend.
// Ne pas ajouter de logique ici — uniquement des types.
// ============================================================

// ------------------------------------------------------------------
// Enveloppes de réponse
// ------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    pages: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------

export interface AuthTokensDTO {
  accessToken: string;
  refreshToken: string;
}

// ------------------------------------------------------------------
// User / Profil
// ------------------------------------------------------------------

export type GenderEnum = 'HOMME' | 'FEMME' | 'AUTRE';
export type LookingForEnum = 'AMITIE' | 'RELATION' | 'FLIRT' | 'DISCUSSION' | 'SERIEUX';
export type PremiumTierEnum = 'FREE' | 'PREMIUM';
export type RoleEnum = 'USER' | 'MODERATOR' | 'ADMIN';

export interface SkillDTO {
  id?: string;
  label: string;
  detail: string;
  score: number;
  emoji: string;
}

export interface ProfileQuestionDTO {
  id: string;
  questionId: string;
  answer: string;
}

export interface ProfileDTO {
  id: string;
  userId: string;
  pseudo: string;
  birthDate: string;
  gender: GenderEnum;
  interestedIn: GenderEnum[];
  city: string;
  postalCode?: string;
  bio?: string;
  physicalDesc?: string;
  job?: string;
  interests: string[];
  lookingFor: LookingForEnum[];
  hasChildren?: boolean;
  wantsChildren?: boolean;
  avatarConfig?: Record<string, unknown>;
  height?: number;
  vibe?: string;
  quote?: string;
  identityTags: string[];
  qualities: string[];
  defaults: string[];
  idealDay: string[];
  skills?: SkillDTO[];
  points: number;
  badges: string[];
  questions: ProfileQuestionDTO[];
}

export interface WalletSummaryDTO {
  coins: number;
  lastDailyBonus: string | null;
}

export interface UserSettingsDTO {
  notifEmail: boolean;
  notifPush: boolean;
  soundEnabled: boolean;
  language: string;
  showInDiscovery: boolean;
  locationShared: boolean;
}

/** Retourné par GET /auth/me */
export interface UserDTO {
  id: string;
  email: string;
  role: RoleEnum;
  isVerified: boolean;
  premiumTier: PremiumTierEnum;
  premiumUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  profile: ProfileDTO | null;
  wallet: WalletSummaryDTO | null;
  settings: UserSettingsDTO | null;
}

// ------------------------------------------------------------------
// Profil public (partenaire de match)
// ------------------------------------------------------------------

export interface PublicProfileDTO {
  pseudo: string;
  gender: GenderEnum;
  city: string;
  birthDate?: string;
  bio?: string;
  physicalDesc?: string;
  avatarConfig?: Record<string, unknown>;
  points: number;
  badges: string[];
}

// ------------------------------------------------------------------
// Photo unlock
// ------------------------------------------------------------------

export interface PhotoUnlockDTO {
  threshold: number;
  myCount: number;
  otherCount: number;
  unlocked: boolean;
}

// ------------------------------------------------------------------
// Match
// ------------------------------------------------------------------

export type MatchStatusEnum = 'PENDING' | 'ACTIVE' | 'BROKEN' | 'BLOCKED' | 'GHOSTED';
export type CanSendReasonEnum =
  | 'MATCH_NOT_ACTIVE'
  | 'QUESTIONS_NOT_VALIDATED'
  | 'AWAITING_REPLY'
  | 'GHOST_WINDOW_CLOSED'
  | 'BLOCKED'
  | null;

/** Retourné par GET /matches et GET /matches/:id */
export interface MatchDTO {
  id: string;
  userAId: string;
  userBId: string;
  initiatorId: string;
  status: MatchStatusEnum;
  letterCountA: number;
  letterCountB: number;
  lastLetterBy: string | null;
  lastLetterAt: string | null;
  questionsValidated: boolean;
  ghostRelanceUsedBy: string | null;
  ghostDetectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Champs enrichis (calculés côté backend)
  otherUserId: string;
  otherProfile: PublicProfileDTO | null;
  currentUserSide: 'A' | 'B';
  canSend: boolean;
  canSendReason: CanSendReasonEnum;
  isGhosting: boolean;
  canRelance: boolean;
  photoUnlock: PhotoUnlockDTO;
}

// ------------------------------------------------------------------
// Lettre
// ------------------------------------------------------------------

export type LetterStatusEnum = 'SENT' | 'READ';

/** Retourné par GET /matches/:matchId/letters et POST /matches/:matchId/letters */
export interface LetterDTO {
  id: string;
  matchId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  status: LetterStatusEnum;
  sentAt: string;
  readAt: string | null;
}

// ------------------------------------------------------------------
// Réaction (sourire / grimace)
// ------------------------------------------------------------------

export type ReactionTypeEnum = 'SMILE' | 'GRIMACE';

/** Retourné par POST /discover/react */
export interface ReactionDTO {
  id: string;
  fromId: string;
  toId: string;
  type: ReactionTypeEnum;
  createdAt: string;
  matchCreated: boolean;
  matchId?: string;
}

// ------------------------------------------------------------------
// Wallet
// ------------------------------------------------------------------

export interface WalletDTO {
  userId: string;
  coins: number;
  lastDailyBonus: string | null;
}
