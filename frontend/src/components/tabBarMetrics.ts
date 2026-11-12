import { RefObject, useCallback, useState, useSyncExternalStore } from 'react';
import type { View } from 'react-native';

/**
 * Position réelle de la barre d'onglets, mesurée en coordonnées FENÊTRE
 * (même repère pour la barre et pour la zone défilante) : aucune constante de
 * marge à entretenir, quelle que soit la zone sûre ou la hauteur de l'écran.
 */
let barTop: number | null = null;
const listeners = new Set<() => void>();

export function setTabBarTop(value: number): void {
  if (barTop === value) return;
  barTop = value;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Espace à réserver sous le contenu défilant pour que sa fin soit au-dessus de
 * la barre : (bas de la zone défilante − haut de la barre) + `gap`.
 * Tant que les deux mesures ne sont pas connues, `fallback` est utilisé.
 */
export function computeClearance(
  barTopInWindow: number | null,
  containerBottomInWindow: number | null,
  gap: number,
  fallback: number,
): number {
  if (barTopInWindow === null || containerBottomInWindow === null) return fallback;
  return Math.max(0, containerBottomInWindow - barTopInWindow) + gap;
}

export function useTabBarClearance(
  containerRef: RefObject<View | null>,
  gap: number,
  fallback: number,
): { clearance: number; measure: () => void; barTop: number | null; containerBottom: number | null } {
  const top = useSyncExternalStore(subscribe, () => barTop, () => null);
  const [bottom, setBottom] = useState<number | null>(null);
  const measure = useCallback(() => {
    containerRef.current?.measureInWindow((_x, y, _w, h) => {
      if (Number.isFinite(y) && Number.isFinite(h)) setBottom(y + h);
    });
  }, [containerRef]);
  return { clearance: computeClearance(top, bottom, gap, fallback), measure, barTop: top, containerBottom: bottom };
}
