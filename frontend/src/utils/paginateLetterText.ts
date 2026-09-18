// ============================================================
// PAGINATION D'UNE LETTRE — basée sur l'espace réel disponible
// ============================================================
// Le découpage ne se fait JAMAIS sur un nombre de mots arbitraire.
// Il utilise les lignes telles que réellement rendues par React
// Native (onTextLayout), qui dépendent déjà de :
//   - la largeur disponible (marges incluses)
//   - la taille de police / interligne
//   - les retours à la ligne (automatiques ET manuels)
// On ne fait ensuite que regrouper ces lignes déjà calculées en
// pages, selon la hauteur disponible sur la "feuille".
// ============================================================

export interface MeasuredLine {
  /** Texte exact de la ligne telle que rendue par RN (onTextLayout) */
  text: string;
  /** Hauteur réelle de la ligne, mesurée par RN */
  height: number;
}

/**
 * Regroupe des lignes déjà mesurées en pages.
 *
 * @param lines           lignes mesurées (onTextLayout), dans l'ordre du texte
 * @param pageHeight      hauteur utilisable d'une page (zone de texte, hors marges)
 * @param signatureHeight hauteur à réserver pour la signature sur la DERNIÈRE page uniquement
 */
export function paginateLines(
  lines: MeasuredLine[],
  pageHeight: number,
  signatureHeight: number,
): string[][] {
  if (lines.length === 0) return [['']];
  if (pageHeight <= 0) return [lines.map(l => l.text)];

  // ── Étape 1 : découpage glouton selon la hauteur de page complète ──
  const rawPages: MeasuredLine[][] = [];
  let current: MeasuredLine[] = [];
  let currentHeight = 0;

  for (const line of lines) {
    if (current.length > 0 && currentHeight + line.height > pageHeight) {
      rawPages.push(current);
      current = [];
      currentHeight = 0;
    }
    current.push(line);
    currentHeight += line.height;
  }
  if (current.length > 0) rawPages.push(current);

  // ── Étape 2 : la dernière page doit laisser la place à la signature ──
  // Si elle déborde, on repousse la/les dernière(s) ligne(s) sur une
  // nouvelle page, et on revérifie (cette nouvelle page devient la
  // dernière, donc soumise à la même contrainte).
  let stable = false;
  while (!stable) {
    const lastPage = rawPages[rawPages.length - 1];
    const lastPageHeight = lastPage.reduce((sum, l) => sum + l.height, 0);
    if (lastPageHeight + signatureHeight <= pageHeight || lastPage.length <= 1) {
      stable = true;
      break;
    }
    const overflow = lastPage.pop() as MeasuredLine;
    rawPages.push([overflow]);
  }

  return rawPages.map(page => page.map(l => l.text));
}