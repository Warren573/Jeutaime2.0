/**
 * Lecture des autorisations iOS et de l'état serveur des notifications push — logique PURE (aucun accès natif).
 *
 * Pourquoi : un push peut être accepté par Expo, remis à Apple (reçu « ok ») et pourtant ne rien afficher sur l'iPhone si
 * iOS bloque l'affichage (autorisation refusée, écran verrouillé désactivé, remise silencieuse, aucun style d'alerte…).
 * Seul l'iPhone le sait : l'écran « Diagnostic des notifications » l'interroge et traduit les valeurs en causes lisibles.
 */

export type Severity = 'ok' | 'warn' | 'error';
export interface Finding { severity: Severity; text: string }

export interface IosPermissionLike {
  status?: number; // 0 jamais demandé · 1 refusé · 2 autorisé · 3 provisoire · 4 éphémère
  allowsAlert?: boolean | null;
  allowsBadge?: boolean | null;
  allowsSound?: boolean | null;
  allowsDisplayInNotificationCenter?: boolean | null;
  allowsDisplayOnLockScreen?: boolean | null;
  alertStyle?: number; // 0 aucun · 1 bannière · 2 alerte
}
export interface PermissionLike {
  status?: string;
  granted?: boolean;
  canAskAgain?: boolean;
  ios?: IosPermissionLike;
}

export type PermissionVerdict = 'ok' | 'degraded' | 'blocked' | 'undetermined' | 'unknown';
export interface PermissionReport { verdict: PermissionVerdict; findings: Finding[]; canAskAgain: boolean }

export function describePermission(p: PermissionLike | null | undefined): PermissionReport {
  if (!p) return { verdict: 'unknown', findings: [{ severity: 'warn', text: 'Autorisation iOS illisible sur cet appareil.' }], canAskAgain: false };
  const ios = p.ios;
  const status = ios?.status;
  const canAskAgain = p.canAskAgain === true;

  if (status === 0 || (status === undefined && p.status === 'undetermined')) {
    return { verdict: 'undetermined', canAskAgain: true, findings: [{ severity: 'error', text: 'iOS ne t’a encore jamais demandé l’autorisation : aucune notification ne peut s’afficher.' }] };
  }
  if (status === 1 || (status === undefined && p.status === 'denied')) {
    return { verdict: 'blocked', canAskAgain, findings: [{ severity: 'error', text: 'Les notifications sont REFUSÉES pour JeuTaime dans les réglages d’iOS : le push est accepté par Apple mais jamais affiché.' }] };
  }

  const findings: Finding[] = [{ severity: 'ok', text: 'Autorisation iOS : accordée.' }];
  if (status === 3) findings.push({ severity: 'warn', text: 'Autorisation PROVISOIRE : iOS remet les notifications « en silence » (centre de notifications seulement, ni bannière ni son).' });
  if (ios) {
    if (ios.allowsAlert === false) findings.push({ severity: 'warn', text: 'Alertes désactivées : aucune notification ne s’affichera.' });
    if (ios.allowsDisplayOnLockScreen === false) findings.push({ severity: 'warn', text: 'Écran verrouillé désactivé : un push n’apparaîtra PAS sur l’écran verrouillé.' });
    if (ios.allowsDisplayInNotificationCenter === false) findings.push({ severity: 'warn', text: 'Centre de notifications désactivé : un push ne sera pas conservé dans la liste.' });
    if (ios.alertStyle === 0) findings.push({ severity: 'warn', text: 'Style d’alerte « Aucun » : pas de bannière à l’écran.' });
    if (ios.allowsSound === false) findings.push({ severity: 'warn', text: 'Son désactivé pour JeuTaime.' });
    if (ios.allowsBadge === false) findings.push({ severity: 'warn', text: 'Pastille sur l’icône désactivée.' });
  }
  const degraded = findings.some((f) => f.severity === 'warn');
  return { verdict: degraded ? 'degraded' : 'ok', findings, canAskAgain };
}

export interface ServerPushStatus {
  settings: { notifPush: boolean; notifActivities: boolean; notifMeetings: boolean; notifLetters: boolean };
  devices: Array<{ platform: string; kind: string; suffix: string; valid: boolean; updatedAt: string }>;
}

/** 6 derniers caractères d'un jeton Expo (même règle que le serveur : suffisants pour reconnaître l'appareil). */
export function tokenSuffix(token: string | null | undefined): string | null {
  if (!token) return null;
  return token.replace(/\]$/, '').slice(-6);
}

export function describeServerState(localTokenSuffix: string | null, server: ServerPushStatus | null): Finding[] {
  if (!server) return [{ severity: 'warn', text: 'État serveur indisponible (réseau ?).' }];
  const out: Finding[] = [];
  if (!server.settings.notifPush) out.push({ severity: 'error', text: 'Les notifications push sont désactivées dans les réglages de ton compte JeuTaime.' });
  else if (!server.settings.notifActivities) out.push({ severity: 'warn', text: 'La catégorie « Activités » (Refuge, duels) est désactivée dans les réglages de ton compte.' });
  else out.push({ severity: 'ok', text: 'Réglages du compte : push et « Activités » activés.' });

  if (server.devices.length === 0) {
    out.push({ severity: 'error', text: 'Aucun appareil n’est enregistré pour ce compte : le serveur n’a aucun endroit où envoyer le push.' });
  } else if (!localTokenSuffix) {
    out.push({ severity: 'warn', text: 'Cet appareil n’a pas obtenu de jeton de notification (autorisation refusée, simulateur ou réseau).' });
  } else if (!server.devices.some((d) => d.suffix === localTokenSuffix)) {
    out.push({ severity: 'error', text: 'Le jeton de CET appareil n’est pas enregistré pour ce compte : le push part vers un autre appareil.' });
  } else {
    out.push({ severity: 'ok', text: 'Cet appareil est bien enregistré pour ce compte.' });
  }
  for (const d of server.devices) {
    if (!d.valid) out.push({ severity: 'warn', text: `Un jeton enregistré (${d.platform}) a un format inattendu : il est ignoré à l’envoi.` });
  }
  return out;
}

/** Libellé court d'un résultat de ticket / reçu Expo. */
export function describeExpoStatus(status: string): string {
  if (status === 'ok') return 'accepté';
  if (status === 'pas encore disponible') return 'pas encore disponible (≈ 15 min après l’envoi)';
  if (status === 'lecture impossible') return 'lecture impossible';
  if (status.startsWith('error:')) {
    const code = status.slice(6);
    if (code === 'DeviceNotRegistered') return 'refusé : appareil non enregistré chez Apple';
    if (code === 'InvalidCredentials') return 'refusé : identifiants Apple (APNs) invalides';
    if (code === 'MessageTooBig') return 'refusé : message trop volumineux';
    return `refusé : ${code}`;
  }
  return status;
}
