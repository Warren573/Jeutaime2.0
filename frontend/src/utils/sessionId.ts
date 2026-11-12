/**
 * Identifiant de la session de CET appareil, lu dans son jeton de renouvellement
 * (champ `tokenId` du jeton, non secret : il ne permet aucune action à lui seul).
 * Le serveur l'utilise pour repérer « Cet appareil » dans la liste des sessions.
 * Retourne undefined si le jeton est absent ou illisible : rien n'est inventé.
 */
export function sessionIdFromRefreshToken(token: string | null | undefined): string | undefined {
  try {
    const part = token?.split('.')[1];
    if (!part || typeof atob !== 'function') return undefined;
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const id = (JSON.parse(atob(b64)) as { tokenId?: unknown }).tokenId;
    return typeof id === 'string' && id.length > 0 && id.length <= 64 ? id : undefined;
  } catch {
    return undefined;
  }
}
