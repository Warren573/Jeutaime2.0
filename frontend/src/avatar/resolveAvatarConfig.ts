/**
 * Avatar Resolution — Single Source of Truth
 * ─────────────────────────────────────────────────────────────────────────────
 * Cette fonction garantit que chaque utilisateur a EXACTEMENT le même avatar partout.
 *
 * Logique:
 * 1. Si user.profile.avatarConfig existe → utiliser directement
 * 2. Sinon → fallback déterministe basé sur gender:
 *    - FEMME / F → DEFAULT_AVATAR_FEMALE
 *    - HOMME / M → DEFAULT_AVATAR_MALE
 *    - AUTRE → DEFAULT_AVATAR_MALE
 *
 * Cette logique est utilisée dans:
 * - SalonScreen (participants du salon)
 * - ProfileDetailScreen (fiche profil détail)
 * - ProfilesScreen (découverte)
 * - ParticipantProfileModal (modal profil)
 * - LettersScreen (messages)
 * - HomeScreen (cartes)
 * - Partout où un avatar est rendu
 */

import type { AvatarConfig } from './png/defaults';
import { DEFAULT_AVATAR_FEMALE, DEFAULT_AVATAR_MALE } from './png/defaults';

export interface AvatarResolution {
  /** Config utilisée pour le rendu */
  config: AvatarConfig;
  /** Source de la config (custom, fallback_female, fallback_male) */
  source: 'custom' | 'fallback_female' | 'fallback_male';
  /** ID utilisateur (pour tracer les logs) */
  userId: string;
  /** Genre (pour tracer les logs) */
  gender: string | null;
}

/**
 * Résout l'avatarConfig pour un utilisateur.
 *
 * @param userId ID utilisateur (pour les logs)
 * @param avatarConfig Configuration personnalisée (peut être null/undefined)
 * @param gender Gender de l'utilisateur (FEMME, HOMME, AUTRE, F, M)
 * @param screenName Nom de l'écran qui demande la résolution (pour les logs)
 * @returns Objet contenant la config et la source
 */
export function resolveAvatarConfig(
  userId: string,
  avatarConfig: any | null | undefined,
  gender: string | null | undefined,
  screenName: string = 'unknown'
): AvatarResolution {
  // Si une config personnalisée existe, l'utiliser
  if (avatarConfig && typeof avatarConfig === 'object' && Object.keys(avatarConfig).length > 0) {
    console.log(`[resolveAvatarConfig] Using custom config`, {
      userId,
      screenName,
      gender,
      source: 'custom',
      configKeys: Object.keys(avatarConfig).length,
    });

    return {
      config: avatarConfig,
      source: 'custom',
      userId,
      gender: gender || null,
    };
  }

  // Fallback déterministe basé sur le gender
  const isFemale = gender === 'FEMME' || gender === 'F';
  const selectedFallback = isFemale ? DEFAULT_AVATAR_FEMALE : DEFAULT_AVATAR_MALE;
  const fallbackSource = isFemale ? 'fallback_female' : 'fallback_male';

  console.log(`[resolveAvatarConfig] Using fallback`, {
    userId,
    screenName,
    gender,
    source: fallbackSource,
    isFemale,
  });

  return {
    config: selectedFallback,
    source: fallbackSource as 'fallback_female' | 'fallback_male',
    userId,
    gender: gender || null,
  };
}

/**
 * Variante simple si vous n'avez besoin que du config
 */
export function getAvatarConfig(
  avatarConfig: any | null | undefined,
  gender: string | null | undefined
): AvatarConfig {
  const resolution = resolveAvatarConfig('unknown', avatarConfig, gender, 'getAvatarConfig');
  return resolution.config;
}
