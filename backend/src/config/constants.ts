// ============================================================
// Constantes métier JeuTaime — source unique de vérité
// ============================================================

// --- Limites de contacts actifs ---
export const MATCH_LIMIT_FREE = 5;     // validé
export const MATCH_LIMIT_PREMIUM = 20; // validé

// --- Déblocage photos ---
/** Nombre de lettres envoyées par chaque côté pour déblocage final (utilisateurs gratuits) */
export const PHOTO_UNLOCK_LETTERS_FREE = 10;
/** Nombre de lettres envoyées par chaque côté pour déblocage final (Premium) */
export const PHOTO_UNLOCK_LETTERS_PREMIUM = 3; // validé

/** Seuils de lettres par niveau de reveal progressif (chaque côté doit avoir atteint ce seuil)
 *  Level 0 → hidden     : 0 lettres
 *  Level 1 → blurStrong : PHOTO_LEVEL_1 lettres chacun
 *  Level 2 → blurMedium : PHOTO_LEVEL_2 lettres chacun
 *  Level 3 → clear      : PHOTO_UNLOCK_LETTERS_FREE / _PREMIUM lettres chacun
 */
export const PHOTO_LEVEL_1_FREE = 2;
export const PHOTO_LEVEL_2_FREE = 5;
export const PHOTO_LEVEL_1_PREMIUM = 1;
export const PHOTO_LEVEL_2_PREMIUM = 2;

// --- Upload photos ---
/** Nombre maximal de photos par utilisateur */
export const MAX_PHOTOS_PER_USER = 6;
/** Largeur max de l'image originale (redimensionnement côté serveur) */
export const PHOTO_ORIGINAL_MAX_WIDTH = 1080;
/** Largeur max de l'image floutée */
export const PHOTO_BLURRED_MAX_WIDTH = 640;
/** Intensité du blur fort (blurStrong, level 1 — sharp sigma) */
export const PHOTO_BLUR_SIGMA = 25;
/** Intensité du blur moyen (blurMedium, level 2 — sharp sigma) */
export const PHOTO_BLUR_MEDIUM_SIGMA = 6;
/** Qualité WebP de l'original */
export const PHOTO_WEBP_QUALITY = 85;
/** Qualité WebP de la version floutée */
export const PHOTO_BLURRED_WEBP_QUALITY = 40;
/** Mimetypes acceptés à l'upload */
export const PHOTO_ACCEPTED_MIMETYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// --- Anti-ghosting ---
/** Jours sans réponse avant état GHOSTED */
export const GHOST_DAYS = 5; // validé
/** Jours max après le dernier échange pour faire une relance */
export const GHOST_RELANCE_MAX_DAYS = 7; // validé

// --- Lettres ---
/** Longueur maximale d'une lettre en caractères */
export const LETTER_MAX_LENGTH = 3000; // validé
/** Nombre de questions de validation requises par profil */
export const PROFILE_QUESTIONS_REQUIRED = 3;

// --- Économie ---
export const DAILY_BONUS_FREE = 20;
export const DAILY_BONUS_PREMIUM = 50;

// --- Points d'expérience (progression) ---
export const XP = {
  DAILY_LOGIN: 10,
  SEND_LETTER: 10,
  RECEIVE_LETTER: 5,
  GET_MATCH: 25,
  SEND_OFFERING: 5,
  USE_POWER: 5,
  PARTICIPATE_STORY: 5,
  COMPLETE_STORY: 50,
  WIN_GAME: 15,
  ADOPT_PET: 20,
  PET_CARE: 3,
} as const;

// --- Seuils de niveau (Progression) ---
export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1_000, 1_500, 2_500, 4_000, 6_000, 10_000] as const;

// --- Pet decay (par heure) ---
export const PET_DECAY = {
  HUNGER: 5,
  HAPPINESS: 3,
  ENERGY: 4,
  CLEANLINESS: 2,
} as const;

/** Reward coins par action de soin */
export const PET_CARE_REWARDS: Record<string, number> = {
  feed: 5,
  play: 8,
  clean: 5,
  sleep: 5,
};

// --- Tokens JWT durée (re-utilisé en cas de besoin de calcul) ---
export const ACCESS_TOKEN_TTL_S = 15 * 60;     // 15 min
export const REFRESH_TOKEN_TTL_S = 30 * 24 * 3600; // 30 jours
