/**
 * Partie du clavier qui recouvre la fenêtre de l'application, en dp.
 *
 * Contexte (Expo SDK 54, React Native 0.81, targetSdk 36) : l'application est
 * en edge-to-edge sur Android. La fenêtre n'est donc plus réduite à l'ouverture
 * du clavier, malgré `softwareKeyboardLayoutMode: "resize"` (adjustResize).
 * Mesure Galaxy A16 / Android 16 : fenêtre 832 dp avec ET sans clavier,
 * bord haut du clavier à 473,6 dp → 358,4 dp de fenêtre recouverts
 * (clavier 310,4 dp + barre de navigation 48 dp).
 *
 * Le calcul se fait dans un seul repère (coordonnées écran, dp) :
 *   recouvrement = hauteur de la fenêtre − bord haut du clavier.
 *
 * Si un appareil réduit encore réellement la fenêtre (ancien comportement),
 * la hauteur de fenêtre devient ≤ bord haut du clavier et le résultat vaut 0 :
 * aucune double compensation.
 */
export function computeKeyboardOverlap(
  windowHeight: number,
  keyboardTopY: number | null,
): number {
  if (keyboardTopY === null || !Number.isFinite(keyboardTopY) || !Number.isFinite(windowHeight)) {
    return 0;
  }
  // Un bord à 0 ou négatif n'est pas une position valide (événement incomplet).
  if (keyboardTopY <= 0) {
    return 0;
  }
  const overlap = windowHeight - keyboardTopY;
  return overlap > 0 ? overlap : 0;
}

type Insets = { top: number; right: number; bottom: number; left: number };

/**
 * Marges sûres à transmettre aux écrans pendant que le clavier est ouvert.
 *
 * Quand la zone utile s'arrête au bord du clavier, la barre de navigation
 * Android est déjà sous le clavier : la marge du bas ne doit plus être ajoutée
 * (sinon double compensation). Clavier fermé : marges inchangées (même objet).
 */
export function insetsWhileKeyboardOpen<T extends Insets>(insets: T, keyboardInset: number): T {
  return keyboardInset > 0 ? { ...insets, bottom: 0 } : insets;
}
