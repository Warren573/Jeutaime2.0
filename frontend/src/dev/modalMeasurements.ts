/**
 * Interrupteur des mesures affichées dans les fenêtres Modal (lettres, bouteilles).
 *
 * - Désactivé par défaut, conservé en mémoire seulement (remis à zéro à chaque
 *   démarrage de l'application, rien n'est écrit sur l'appareil ni envoyé).
 * - Ne peut être activé que depuis l'écran « Diagnostic d'affichage »,
 *   réservé aux comptes OWNER, ADMIN et MODERATOR.
 */
type Listener = () => void;

let enabled = false;
const listeners = new Set<Listener>();

export function isModalMeasurementsEnabled(): boolean {
  return enabled;
}

export function setModalMeasurementsEnabled(value: boolean): void {
  if (enabled === value) return;
  enabled = value;
  listeners.forEach((l) => l());
}

export function subscribeModalMeasurements(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type ModalMeasurements = {
  modalLayoutHeight: number | null;
  modalInsets: { top: number; bottom: number };
  inheritedInsets: { top: number; bottom: number };
  statusBarHeight: number | null;
  screenHeight: number;
  keyboardTopY: number | null;
  appliedKeyboardInset: number;
};

const n = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : String(Math.round(v * 10) / 10);

/**
 * Lignes affichées (texte uniquement, aucune donnée personnelle).
 * Une marge Modal haute à 0 alors que la barre d'état mesure ~35 dp signifie
 * que la fenêtre de la Modal commence SOUS la barre d'état.
 */
export function formatModalMeasurements(m: ModalMeasurements): string[] {
  return [
    `Modal onLayout h=${n(m.modalLayoutHeight)} · écran h=${n(m.screenHeight)}`,
    `Marges Modal haut/bas=${n(m.modalInsets.top)}/${n(m.modalInsets.bottom)}`,
    `Marges héritées haut/bas=${n(m.inheritedInsets.top)}/${n(m.inheritedInsets.bottom)} · barre d'état=${n(m.statusBarHeight)}`,
    `Clavier bord haut=${n(m.keyboardTopY)} · compensation appliquée=${n(m.appliedKeyboardInset)}`,
  ];
}

/**
 * Lignes supplémentaires fournies par l'écran affiché dans la Modal
 * (ex. position réelle du pied de rédaction). Ignorées si l'interrupteur est
 * désactivé. Tableau remplacé à chaque changement (instantané stable).
 */
let extraLines: readonly string[] = [];
const extraValues = new Map<string, string>();

export function getModalExtraLines(): readonly string[] {
  return extraLines;
}

export function setModalExtraLine(key: string, line: string | null): void {
  if (!enabled && line !== null) return;
  const previous = extraValues.get(key) ?? null;
  if (previous === line) return;
  if (line === null) extraValues.delete(key);
  else extraValues.set(key, line);
  extraLines = Array.from(extraValues.values());
  listeners.forEach((l) => l());
}

/** Ligne décrivant un pied de fenêtre : position, hauteur et bas réels. */
export function formatFooterLine(label: string, y: number, height: number): string {
  return `${label} y=${n(y)} h=${n(height)} bas=${n(y + height)}`;
}
