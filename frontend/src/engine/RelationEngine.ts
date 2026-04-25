// ============================================================
// RELATION ENGINE — Progression relationnelle entre deux users
// ============================================================
// Ce moteur est la source de vérité pour tout ce qui touche
// au niveau de relation : photo visible, badge affiché,
// et futures fonctionnalités (cadeaux, mini-jeux, salon privé).
// ============================================================

export type RelationLevel = 1 | 2 | 3;

export type PhotoVisibility = 'avatar' | 'blurred' | 'revealed';

// ── Seuils (total de lettres dans le thread, des deux côtés) ─
export const RELATION_THRESHOLDS = {
  normal:  { level2: 6,  level3: 10 },
  premium: { level2: 3,  level3: 5  },
} as const;

// ── Labels affichés dans l'UI ────────────────────────────────
const LEVEL_META: Record<RelationLevel, { label: string; stars: string }> = {
  1: { label: 'Découverte', stars: '⭐'     },
  2: { label: 'Connexion',  stars: '⭐⭐'   },
  3: { label: 'Révélation', stars: '⭐⭐⭐' },
};

// ── Fonctionnalités débloquées par niveau ────────────────────
// Extensible pour les futures features (cadeaux, jeux duo, salon)
export const LEVEL_UNLOCKS: Record<RelationLevel, string[]> = {
  1: ['letters'],
  2: ['letters', 'photo_blur'],
  3: ['letters', 'photo_reveal', 'avatar_toggle'],
  // À venir : 'gifts', 'duo_games', 'private_salon', 'pierre_papier_ciseaux'
};

// ── Fonctions principales ────────────────────────────────────

export function getRelationLevel(
  letterCount: number,
  isPremium = false,
): RelationLevel {
  const t = isPremium ? RELATION_THRESHOLDS.premium : RELATION_THRESHOLDS.normal;
  if (letterCount >= t.level3) return 3;
  if (letterCount >= t.level2) return 2;
  return 1;
}

export function getPhotoVisibility(level: RelationLevel): PhotoVisibility {
  if (level === 3) return 'revealed';
  if (level === 2) return 'blurred';
  return 'avatar';
}

export interface RelationInfo {
  level: RelationLevel;
  stars: string;
  label: string;
  photoVisibility: PhotoVisibility;
  progressText: string | null;  // null si niveau max atteint
  progressPercent: number;      // 0–100 dans le tier courant
  unlocks: string[];
}

export function getRelationInfo(
  letterCount: number,
  isPremium = false,
): RelationInfo {
  const level = getRelationLevel(letterCount, isPremium);
  const t = isPremium ? RELATION_THRESHOLDS.premium : RELATION_THRESHOLDS.normal;
  const { label, stars } = LEVEL_META[level];

  let progressText: string | null = null;
  let progressPercent = 100;

  if (level === 1) {
    const remaining = t.level2 - letterCount;
    progressPercent = Math.round((letterCount / t.level2) * 100);
    progressText =
      remaining === 1
        ? '💌 Encore 1 lettre pour approfondir la relation'
        : `💌 Encore ${remaining} lettres pour approfondir la relation`;
  } else if (level === 2) {
    const tierStart = t.level2;
    const tierEnd   = t.level3;
    progressPercent = Math.round(((letterCount - tierStart) / (tierEnd - tierStart)) * 100);
    const remaining = tierEnd - letterCount;
    progressText =
      remaining === 1
        ? '💌 Encore 1 lettre pour la révélation'
        : `💌 Encore ${remaining} lettres pour la révélation`;
  }

  return {
    level,
    stars,
    label,
    photoVisibility: getPhotoVisibility(level),
    progressText,
    progressPercent,
    unlocks: LEVEL_UNLOCKS[level],
  };
}

// ── Helpers ──────────────────────────────────────────────────

export function isPhotoVisible(
  letterCount: number,
  isPremium = false,
): boolean {
  return getRelationLevel(letterCount, isPremium) >= 2;
}

export function isPhotoRevealed(
  letterCount: number,
  isPremium = false,
): boolean {
  return getRelationLevel(letterCount, isPremium) === 3;
}
