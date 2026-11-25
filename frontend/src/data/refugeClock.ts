/**
 * Décalage entre l'horloge de l'appareil et celle du serveur.
 *
 * Les horodatages de l'animation sont ceux du serveur : sans correction, un
 * téléphone en avance ou en retard de quelques minutes désynchroniserait le
 * compagnon entre les deux participants. offset = heure serveur − heure locale.
 */
export function computeClockOffsetMs(serverTime: string | null | undefined, receivedAtMs: number): number {
  const server = serverTime ? Date.parse(serverTime) : NaN;
  if (!Number.isFinite(server) || !Number.isFinite(receivedAtMs)) return 0;
  return server - receivedAtMs;
}

export function serverNow(offsetMs: number, localNowMs: number = Date.now()): number {
  return localNowMs + (Number.isFinite(offsetMs) ? offsetMs : 0);
}
