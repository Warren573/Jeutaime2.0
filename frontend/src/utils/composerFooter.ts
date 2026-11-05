/**
 * Ancrage du pied de la fenêtre de rédaction des lettres (Android uniquement).
 *
 * Mesures Galaxy A17 (OTA 2.0.0-ota.17, panneau de diagnostic) dans la fenêtre
 * Modal des lettres : hauteur 832, marges 35,6/48, compensation clavier 358,4
 * — toutes correctes. Le pied de l'APERÇU, ancré en position absolue en bas de
 * la même fenêtre, est bien placé. Le pied de RÉDACTION, placé dans le flux
 * sous la liste (ScrollView flex:1), descend ~30-40 dp trop bas : le contenu en
 * flux dépasse la fenêtre sur l'appareil.
 *
 * Correction : sur Android, le pied est ancré comme celui de l'aperçu
 * (absolu, bas = bord bas de la zone utile), et la liste reçoit une marge
 * basse égale à la hauteur mesurée du pied pour que rien ne passe dessous.
 * La marge sûre du bas reste appliquée UNE seule fois, par le padding du pied
 * (48 clavier fermé ; 0 clavier ouvert, la zone utile s'arrêtant déjà au
 * clavier) : aucune double compensation.
 *
 * iOS et web : aucun style ajouté (rendu strictement inchangé).
 */
export type AbsoluteFooterStyle = {
  position: 'absolute';
  left: 0;
  right: 0;
  bottom: 0;
};

export type ComposerFooterAnchoring = {
  footerStyle: AbsoluteFooterStyle | null;
  listStyle: { marginBottom: number } | null;
};

export function composerFooterAnchoring(platform: string, footerHeight: number): ComposerFooterAnchoring {
  if (platform !== 'android') {
    return { footerStyle: null, listStyle: null };
  }
  const safeHeight = Number.isFinite(footerHeight) && footerHeight > 0 ? footerHeight : 0;
  return {
    footerStyle: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    listStyle: { marginBottom: safeHeight },
  };
}

/**
 * Position attendue du bas des boutons du pied, dans la fenêtre Modal.
 * Sert aux tests : vérifie qu'ils restent au-dessus de la barre de navigation
 * (clavier fermé) ou du clavier (clavier ouvert), sans double compensation.
 */
export function footerButtonsBottom(params: {
  modalHeight: number;
  keyboardInset: number;
  bottomInsetWhenClosed: number;
  minPadding: number;
}): number {
  const { modalHeight, keyboardInset, bottomInsetWhenClosed, minPadding } = params;
  const usableBottom = modalHeight - keyboardInset;
  const bottomInset = keyboardInset > 0 ? 0 : bottomInsetWhenClosed;
  return usableBottom - Math.max(bottomInset, minPadding);
}

/** Espace visuel au-dessus de la barre de navigation ou du clavier (Android). */
export const ANDROID_FOOTER_GAP = 8;

/**
 * Marge basse des pieds de la fenêtre des lettres (rédaction, attente, aperçu).
 *
 * Android : marge sûre mesurée + 8 dp. Clavier fermé (A17) : 48 + 8 = 56, soit
 * 8 dp d'air au-dessus de la barre de navigation, comme l'espace jugé correct
 * au-dessus du clavier. Clavier ouvert : la marge sûre vaut 0 (la zone utile
 * s'arrête au clavier) → 8 dp, identique à aujourd'hui. Aucune double
 * compensation : la marge sûre n'est comptée qu'une fois.
 *
 * iOS et web : formule d'origine inchangée, max(marge sûre, minimum).
 */
export function footerBottomPadding(platform: string, bottomInset: number, legacyMinimum: number): number {
  const inset = Number.isFinite(bottomInset) && bottomInset > 0 ? bottomInset : 0;
  if (platform !== 'android') {
    return Math.max(inset, legacyMinimum);
  }
  return inset + ANDROID_FOOTER_GAP;
}
