/**
 * assetHelpers.ts — Utilitaires pour les assets
 */

import { avatarRegistry } from '../config/avatarRegistry';
import { AvatarAssetRef } from '../types/avatarTypes';

/** Retourne la définition d'un asset ou null si introuvable */
export function getAsset(id: string): AvatarAssetRef | null {
  return avatarRegistry[id] ?? null;
}

/** Vérifie qu'un asset existe dans le registre */
export function assetExists(id: string): boolean {
  return id in avatarRegistry;
}

/** Liste tous les IDs disponibles pour un préfixe de slot */
export function listAssetsBySlot(slotPrefix: string): string[] {
  return Object.keys(avatarRegistry).filter((id) => id.startsWith(slotPrefix));
}
