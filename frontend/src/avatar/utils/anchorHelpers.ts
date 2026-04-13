/**
 * anchorHelpers.ts — Utilitaires pour les points d'ancrage
 * Convertit un AnchorPoint (%) en coordonnées px pour un avatar de taille `size`.
 */

import { AnchorPoint, AvatarAnchors, AnchorPointName } from '../types/avatarTypes';

export function anchorToPixels(
  anchor: AnchorPoint,
  size: number,
): { x: number; y: number } {
  return {
    x: (anchor.x / 100) * size,
    y: (anchor.y / 100) * size,
  };
}

export function getAnchorPx(
  anchors: AvatarAnchors,
  name:    AnchorPointName,
  size:    number,
): { x: number; y: number } {
  return anchorToPixels(anchors[name], size);
}
