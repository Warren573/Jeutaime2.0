/**
 * Espace à laisser sous le contenu du profil pour que le défilement aille
 * au-delà du bloc de boutons flottants (Offrir / Rompre l'échange / Bloquer…).
 *
 * coveredHeight = hauteur du bloc mesurée (onLayout) + distance entre le bloc
 * et le bas de l'écran. Android uniquement ; ailleurs, ou sans bloc mesuré,
 * on garde la valeur d'origine (80 dp).
 */
export const PROFILE_SCROLL_LEGACY_BOTTOM = 80;
export const PROFILE_SCROLL_GAP = 16;

export function profileScrollBottomPadding(platform: string, coveredHeight: number): number {
  if (platform !== 'android') return PROFILE_SCROLL_LEGACY_BOTTOM;
  if (!Number.isFinite(coveredHeight) || coveredHeight <= 0) return PROFILE_SCROLL_LEGACY_BOTTOM;
  return Math.max(PROFILE_SCROLL_LEGACY_BOTTOM, coveredHeight + PROFILE_SCROLL_GAP);
}
