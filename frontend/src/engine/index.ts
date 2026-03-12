// ============================================
// ENGINES - Export centralisé
// ============================================

// Export avec alias pour éviter les conflits de noms
export * as EconomyEngine from './EconomyEngine';
export * as ProgressionEngine from './ProgressionEngine';
export * as RevealEngine from './RevealEngine';
export * as PetEngine from './PetEngine';

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
