// ============================================
// TYPES PRINCIPAUX JEUTAIME
// ============================================

// ==================== USER & PROFILE ====================

export interface User {
  id: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  lastLogin: Date;
  isVerified: boolean;
  isPremium: boolean;
  premiumExpiry?: Date;
  isBanned: boolean;
}

export type PhysicalDescType =
  | 'filiforme'
  | 'ras_motte'
  | 'grande_gigue'
  | 'costaud'
  | 'mignon'
  | 'mysterieux'
  | 'athletique'
  | 'doux';

export const PHYSICAL_DESC_OPTIONS: { type: PhysicalDescType; emoji: string; label: string }[] = [
  { type: 'filiforme', emoji: '🍝', label: 'Filiforme (comme un spaghetti)' },
  { type: 'ras_motte', emoji: '🌱', label: 'Ras motte (petite taille)' },
  { type: 'grande_gigue', emoji: '🦒', label: 'Grande gigue (très grand·e)' },
  { type: 'costaud', emoji: '🌳', label: 'Costaud(e) comme un chêne' },
  { type: 'mignon', emoji: '🍪', label: 'Mignon·ne comme un cookie' },
  { type: 'mysterieux', emoji: '🕶️', label: 'Mystérieux·se sous la capuche' },
  { type: 'athletique', emoji: '💪', label: 'Athlétique et dynamique' },
  { type: 'doux', emoji: '🧸', label: 'Doux·ce comme une peluche' },
];

export type LookingForType = 'amitie' | 'relation' | 'flirt' | 'discussion' | 'serieux';
export type GenderType = 'M' | 'F' | 'NB';
export type ChildrenStatus = 'has_children' | 'no_children' | 'has_wants_more';
export type ChildrenWant = 'wants' | 'doesnt_want' | 'maybe' | 'undecided';

export interface PersonalQuestion {
  text: string;
  options: [string, string, string];
  correctAnswer: 0 | 1 | 2;
}

export interface Photo {
  id: string;
  url: string;
  order: number;
  isVerified: boolean;
}

export interface Profile {
  odId: string;
  pseudo: string;
  birthDate: Date;
  gender: GenderType;
  city: string;
  postalCode: string;
  bio: string;
  physicalDesc?: PhysicalDescType;
  job?: string;
  interests: string[];
  lookingFor: LookingForType[];
  interestedIn: GenderType[];
  hasChildren?: ChildrenStatus;
  wantsChildren?: ChildrenWant;
  photos: Photo[];
  questions: PersonalQuestion[];
  referralCode?: string;
}

// ==================== AVATAR ====================

export interface AvatarConfig {
  odId: string;
  skinColor: string;
  hairColor?: string;
  hairStyle?: string;
  expression: string;
  accessory?: string;
  clothing?: string;
  eyeColor?: string;
  facialHair?: string;
}

export type TransformationType =
  | 'donkey'
  | 'frog'
  | 'ghost'
  | 'pirate'
  | 'statue'
  | 'chicken'
  | 'black_cat'
  | 'unicorn';

export interface ActiveEffect {
  id: string;
  odId: string;
  powerOrOfferingId: string;
  type: 'power' | 'offering';
  effectType: string;
  startedAt: number;
  expiresAt: number;
  sourceUserId: string;
}

export interface AvatarState {
  config: AvatarConfig;
  activeEffects: ActiveEffect[];
  transformation?: TransformationType;
  incarnatedPet?: string;
}

// ==================== SALON ====================

export type SalonType = 'standard' | 'cafe_paris' | 'metal' | 'vip';

export interface SalonTheme {
  id: string;
  name: string;
  gradient: [string, string];
  backgroundId?: string;
  customBackground?: string;
}

export interface SalonParticipant {
  odId: string;
  odName: string;
  odGender: GenderType;
  odAge: number;
  isOnline: boolean;
  avatarState?: AvatarState;
  receivedOfferings: ReceivedOffering[];
  joinedAt: number;
}

export interface Salon {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: SalonType;
  theme: SalonTheme;
  maxParticipants: number;
  currentParticipants: string[];
  isPrivate: boolean;
  ownerId?: string;
  createdAt: number;
}

export interface SalonMessage {
  id: string;
  salonId: string;
  fromUserId: string;
  fromName: string;
  content: string;
  timestamp: number;
  type: 'message' | 'offering' | 'power' | 'system';
  metadata?: any;
}

// ==================== MATCHING ====================

export type SmileStatus = 'pending' | 'mutual' | 'declined' | 'expired';

export interface Smile {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: number;
  status: SmileStatus;
}

export interface QuestionValidation {
  userACorrect: number;
  userBCorrect: number;
  isValid: boolean;
}

export interface Match {
  id: string;
  userAId: string;
  userBId: string;
  createdAt: number;
  questionValidation: QuestionValidation;
  status: 'active' | 'broken' | 'blocked';
  letterCount: number;
}

// ==================== LETTERS ====================

export interface LetterThread {
  id: string;
  matchId: string;
  participants: [string, string];
  letterCount: number;
  lastLetterAt: number;
  status: 'active' | 'broken';
  breakReason?: string;
}

export interface Letter {
  id: string;
  threadId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  createdAt: number;
  readAt?: number;
}

// ==================== OFFERINGS & POWERS ====================

export type OfferingCategory = 'boisson' | 'nourriture' | 'symbolique' | 'metal';

export interface SpecialEffect {
  type: string;
  duration: number;
  emoji?: string;
}

export interface Offering {
  id: string;
  name: string;
  emoji: string;
  category: OfferingCategory;
  price: number;
  effect?: SpecialEffect;
  salonTypes: SalonType[];
}

export type PowerType = 'transformation' | 'visual' | 'weather';

export interface PowerEffect {
  type: string;
  visual?: string;
  transformation?: TransformationType;
}

export interface Power {
  id: string;
  name: string;
  emoji: string;
  type: PowerType;
  price: number;
  duration: number;
  effect: PowerEffect;
  cancelledBy?: string[];
  salonTypes: SalonType[];
}

export interface ReceivedOffering {
  offeringId: string;
  emoji: string;
  fromUserId: string;
  fromName: string;
  timestamp: number;
}

// ==================== PETS ====================

export type PetRarity = 'commun' | 'peu_commun' | 'rare' | 'legendaire';

export interface PetPower {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export interface Pet {
  id: string;
  name: string;
  emoji: string;
  rarity: PetRarity;
  cost: number;
  personality: string;
  favoriteFood: string;
  favoriteEmoji: string;
  specialPower?: PetPower;
  stages: string[];
}

export interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
  cleanliness: number;
  lastUpdated: number;
}

export interface PetOwnership {
  id: string;
  odId: string;
  petId: string;
  petName: string;
  petEmoji: string;
  adoptedAt: number;
  stats: PetStats;
  isIncarnated: boolean;
  xp: number;
  level: number;
}

// ==================== ECONOMY ====================

export type TransactionCategory =
  | 'daily_bonus'
  | 'game_win'
  | 'letter_sent'
  | 'letter_received'
  | 'match_created'
  | 'offering_sent'
  | 'power_used'
  | 'pet_adoption'
  | 'pet_care'
  | 'premium_purchase'
  | 'story_participation'
  | 'story_completion';

export interface Transaction {
  id: string;
  type: 'gain' | 'spend';
  amount: number;
  reason: string;
  category: TransactionCategory;
  timestamp: number;
}

export interface Wallet {
  odId: string;
  coins: number;
  lastDailyBonus: number;
  transactions: Transaction[];
}

// ==================== PROGRESSION ====================

export interface Title {
  level: number;
  name: string;
  minPoints: number;
  emoji: string;
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface UserStats {
  matchesCount: number;
  lettersSent: number;
  lettersReceived: number;
  offeringsSent: number;
  powerUsed: number;
  gamesWon: number;
  salonsVisited: number;
  daysActive: number;
  storiesParticipated: number;
  storiesCompleted: number;
}

export interface UserProgression {
  odId: string;
  points: number;
  level: number;
  title: string;
  titleEmoji: string;
  unlockedBadges: string[];
  stats: UserStats;
}

// ==================== REVEAL ====================

export type RevealState = 'hidden' | 'blurred' | 'revealed';

export interface RevealMilestone {
  letterCount: number;
  state: RevealState;
  description: string;
}

// ==================== MODERATION ====================

export type ReportReason =
  | 'inappropriate_content'
  | 'harassment'
  | 'fake_profile'
  | 'spam'
  | 'other';

export interface Report {
  id: string;
  reporterId: string;
  targetUserId: string;
  targetType: 'user' | 'message' | 'photo';
  targetId: string;
  reason: ReportReason;
  details?: string;
  createdAt: number;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
}

// ==================== MINI-GAMES ====================

export type GameDifficulty = 'facile' | 'moyen' | 'difficile';

export interface MiniGame {
  id: string;
  name: string;
  emoji: string;
  description: string;
  reward: number;
  difficulty: GameDifficulty;
}

// ==================== BOTTLE ====================

export interface BottleMessage {
  id: string;
  message: string;
  fromId: string;
  fromRevealed: boolean;
  toId: string;
  toRevealed: boolean;
  timestamp: number;
  replies: BottleReply[];
}

export interface BottleReply {
  id: string;
  message: string;
  fromId: string;
  timestamp: number;
}
