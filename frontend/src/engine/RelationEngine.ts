// ============================================================
// RELATION ENGINE — Progression relationnelle entre deux users
// ============================================================
// Ce moteur est la source de vérité pour tout ce qui touche
// au niveau de relation : photo visible, badge affiché,
// et futures fonctionnalités (cadeaux, mini-jeux, salon privé).
// ============================================================

export type RelationLevel = 0 | 3;

export type PhotoVisibility = 'avatar' | 'revealed';

// ── Seuils (total de lettres dans le thread, des deux côtés) ─
// Binary system: photo visible only after threshold
export const RELATION_THRESHOLDS = {
  normal:  { threshold: 10 },
  premium: { threshold: 3  },
} as const;

// ── Labels affichés dans l'UI ────────────────────────────────
const LEVEL_META: Record<RelationLevel, { label: string; stars: string }> = {
  0: { label: 'En attente', stars: ''        },
  3: { label: 'Révélation', stars: '⭐⭐⭐' },
};

// ── Fonctionnalités débloquées par niveau ────────────────────
// Extensible pour les futures features (cadeaux, jeux duo, salon)
export const LEVEL_UNLOCKS: Record<RelationLevel, string[]> = {
  0: ['letters'],
  3: ['letters', 'photo_reveal', 'avatar_toggle'],
  // À venir : 'gifts', 'duo_games', 'private_salon', 'pierre_papier_ciseaux'
};

// ── Fonctions principales ────────────────────────────────────

export function getRelationLevel(
  letterCount: number,
  isPremium = false,
): RelationLevel {
  const t = isPremium ? RELATION_THRESHOLDS.premium : RELATION_THRESHOLDS.normal;
  return letterCount >= t.threshold ? 3 : 0;
}

export function getPhotoVisibility(level: RelationLevel): PhotoVisibility {
  return level === 3 ? 'revealed' : 'avatar';
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

  if (level === 0) {
    const remaining = t.threshold - letterCount;
    progressPercent = Math.round((letterCount / t.threshold) * 100);
    progressText =
      remaining === 1
        ? '💌 Encore 1 lettre pour révéler la photo'
        : `💌 Encore ${remaining} lettres pour révéler la photo`;
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
  return getRelationLevel(letterCount, isPremium) >= 1;
}

export function isPhotoRevealed(
  letterCount: number,
  isPremium = false,
): boolean {
  return getRelationLevel(letterCount, isPremium) === 3;
}
