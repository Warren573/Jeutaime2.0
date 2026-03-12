// ============================================
// ENGINES - Export centralisé
// ============================================

export * from './EconomyEngine';
export * from './ProgressionEngine';
export * from './RevealEngine';
export * from './PetEngine';

// Ré-export des types depuis shared
export type {
  User,
  Profile,
  AvatarConfig,
  AvatarState,
  Salon,
  SalonParticipant,
  Match,
  Letter,
  LetterThread,
  Offering,
  Power,
  Pet,
  PetOwnership,
  PetStats,
  Wallet,
  Transaction,
  UserProgression,
  UserStats,
  Badge,
  Title,
} from '../shared/types';
