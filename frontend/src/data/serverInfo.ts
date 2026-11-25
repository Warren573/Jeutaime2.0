/**
 * Serveur réellement joint par l'application — logique pure.
 * Permet de vérifier, depuis l'iPhone, que le backend utilisé est bien celui qui a été déployé
 * (même build que celui contrôlé par le déploiement), sans aucun outil externe.
 */
export interface ServerInfo {
  host: string;
  buildSha: string | null;
}

export function hostOf(apiUrl: string): string {
  const match = apiUrl.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i);
  return match?.[1] ?? apiUrl;
}

export function serverLabel(info: ServerInfo | null): string {
  if (!info) return 'Serveur : vérification…';
  const sha = info.buildSha && info.buildSha !== 'unknown' ? info.buildSha.slice(0, 7) : null;
  return sha ? `Serveur : ${info.host} · build ${sha}` : `Serveur : ${info.host} · version indisponible`;
}
