// Le dossier possède déjà une marge intérieure de 12 points sous la dernière carte.
export function profileScrollBottomPadding(coveredHeight: number): number {
  return Number.isFinite(coveredHeight) ? Math.max(0, coveredHeight) : 0;
}
