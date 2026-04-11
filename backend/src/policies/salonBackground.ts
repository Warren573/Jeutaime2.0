/**
 * Logique pure de validation des backgrounds de salon.
 *
 * Garantit qu'un salon ne peut pas se retrouver dans un état absurde :
 *   - type "image" sans URL d'image
 *   - type "color" sans couleur dans backgroundConfig
 *   - type invalide
 *
 * Pure : aucune dépendance Prisma, testable unitairement.
 */
import { BadRequestError } from "../core/errors";

export type SalonBackgroundType = "image" | "gradient" | "color";

export function assertBackgroundCoherence(
  backgroundType: string,
  backgroundConfig: unknown,
  backgroundImage: string | null | undefined,
): void {
  if (backgroundType === "image") {
    if (!backgroundImage) {
      throw new BadRequestError(
        "backgroundType='image' requiert backgroundImage",
      );
    }
    return;
  }

  if (backgroundType === "color") {
    const cfg =
      backgroundConfig && typeof backgroundConfig === "object"
        ? (backgroundConfig as Record<string, unknown>)
        : {};
    if (typeof cfg["color"] !== "string") {
      throw new BadRequestError(
        "backgroundType='color' requiert backgroundConfig.color",
      );
    }
    return;
  }

  if (backgroundType === "gradient") {
    // Config facultative : on tolère gradient sans config (le champ
    // legacy `Salon.gradient` peut servir de fallback côté DTO public).
    return;
  }

  throw new BadRequestError(`backgroundType invalide: ${backgroundType}`);
}

/**
 * Type guard utilisé lors d'une mise à jour partielle pour résoudre
 * quelles valeurs seront persistées. Les champs `undefined` conservent
 * la valeur existante, `null` est explicitement remis à null.
 */
export function resolveNextValue<T>(
  dtoValue: T | null | undefined,
  currentValue: T | null,
): T | null {
  if (dtoValue === undefined) return currentValue;
  return dtoValue;
}
