// ─── Helper d'animation pour les animaux ──────────────────────────────────────
// Retourne les frames à afficher selon l'action en cours.
// Fallback sur [grid] si les frames ne sont pas définies.

import type { PixelArtDef } from './petPixelArt';

export type PetAction = 'idle' | 'eat' | 'wash' | 'cuddle';

/**
 * Retourne le tableau de frames à lire pour une action donnée.
 *
 * Usage typique :
 *   const frames = getPetFrames(PET_PIXEL_ART.iguana, 'eat');
 *   // boucle sur frames[0], frames[1], frames[2] à intervalle régulier
 *
 * - idle   → [grid]
 * - eat    → eatFrames    (3 frames : idle, action, pic)
 * - wash   → washFrames   (3 frames)
 * - cuddle → cuddleFrames (3 frames)
 */
export function getPetFrames(
  pet: PixelArtDef,
  action: PetAction,
): number[][][] {
  switch (action) {
    case 'eat':
      return pet.eatFrames?.length ? pet.eatFrames : [pet.grid];
    case 'wash':
      return pet.washFrames?.length ? pet.washFrames : [pet.grid];
    case 'cuddle':
      return pet.cuddleFrames?.length ? pet.cuddleFrames : [pet.grid];
    default:
      return [pet.grid];
  }
}
