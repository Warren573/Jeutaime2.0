/**
 * Enregistrement de l'appareil pour les notifications push — une écriture seulement quand elle est utile.
 *
 * Avant : à CHAQUE démarrage de l'interface, l'application appelait `register-device`, qui écrit en base (Neon) même pour
 * le même compte et le même jeton. Les journaux Render du 26/11 montrent 6 appels en une minute (12:57:41 → 12:58:38) et 4 en
 * 6 secondes (08:43:23), chacun précédé du même démarrage complet.
 *
 * Maintenant : on mémorise (appareil) « ce compte + ce jeton + cette plateforme sont enregistrés depuis telle date » et on
 * n'appelle le serveur que si l'un des trois change, ou si l'enregistrement a plus de 24 h (rafraîchissement du jeton côté
 * serveur). La mémoire est effacée à la déconnexion et à la connexion : un compte rétabli, un autre compte sur le même appareil
 * ou un jeton retiré par le serveur redéclenchent toujours un enregistrement.
 *
 * Pur : aucun accès à React Native ; stockage et appel réseau injectés.
 */

export const PUSH_REGISTRATION_KEY = 'jeutaime_push_registration';
export const PUSH_REGISTRATION_TTL_MS = 24 * 60 * 60 * 1000;

export interface PushRegistrationRecord {
  userId: string;
  token: string;
  platform: string;
  at: number;
}

export type PushIdentity = Omit<PushRegistrationRecord, 'at'>;

/** Relit l'enregistrement mémorisé ; toute valeur illisible ou incomplète est ignorée (on enregistrera à nouveau). */
export function parseRegistrationRecord(raw: string | null | undefined): PushRegistrationRecord | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (typeof v.userId === 'string' && v.userId && typeof v.token === 'string' && v.token && typeof v.platform === 'string' && typeof v.at === 'number' && Number.isFinite(v.at)) {
      return { userId: v.userId, token: v.token, platform: v.platform, at: v.at };
    }
  } catch {
    // JSON invalide : traité comme absent.
  }
  return null;
}

export function shouldRegisterDevice(
  previous: PushRegistrationRecord | null,
  next: PushIdentity,
  now: number,
  ttlMs: number = PUSH_REGISTRATION_TTL_MS,
): boolean {
  if (!next.userId || !next.token) return true; // identité inconnue : jamais de déduplication hasardeuse
  if (!previous) return true;
  if (previous.userId !== next.userId || previous.token !== next.token || previous.platform !== next.platform) return true;
  if (previous.at > now) return true; // horloge de l'appareil modifiée
  return now - previous.at >= ttlMs;
}

export interface RegistrationDeps {
  readRecord: () => Promise<string | null>;
  writeRecord: (value: string) => Promise<void>;
  register: (token: string, platform: string) => Promise<void>;
  now?: () => number;
}

export type RegistrationOutcome = 'registered' | 'skipped' | 'in-flight';

/** Enregistrements en cours (même compte + jeton + plateforme) : deux démarrages simultanés ne font qu'UNE écriture. */
const inFlight = new Set<string>();

export async function registerDeviceIfNeeded(identity: PushIdentity, deps: RegistrationDeps): Promise<RegistrationOutcome> {
  const key = `${identity.userId}|${identity.token}|${identity.platform}`;
  if (inFlight.has(key)) return 'in-flight';
  // Réservé AVANT toute attente : sinon deux démarrages simultanés liraient tous deux « rien de mémorisé ».
  inFlight.add(key);
  try {
    const now = (deps.now ?? Date.now)();
    const previous = parseRegistrationRecord(await deps.readRecord().catch(() => null));
    if (!shouldRegisterDevice(previous, identity, now)) return 'skipped';
    await deps.register(identity.token, identity.platform);
    // Mémorisé SEULEMENT après un enregistrement réussi : un échec réseau sera retenté au démarrage suivant.
    await deps.writeRecord(JSON.stringify({ ...identity, at: now } satisfies PushRegistrationRecord)).catch(() => {});
    return 'registered';
  } finally {
    inFlight.delete(key);
  }
}
