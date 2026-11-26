import { describe, test, expect } from '../test-support/assert';
import { describeExpoStatus, describePermission, describeServerState, tokenSuffix, type ServerPushStatus } from './pushDiagnostics';

const granted = (over: Record<string, unknown> = {}) => ({ status: 'granted', granted: true, canAskAgain: true, ios: { status: 2, allowsAlert: true, allowsBadge: true, allowsSound: true, allowsDisplayInNotificationCenter: true, allowsDisplayOnLockScreen: true, alertStyle: 1, ...over } });
const texts = (r: { findings: Array<{ text: string }> }) => r.findings.map((f) => f.text).join(' | ');

describe('autorisations iOS', () => {
  test('tout autorisé : verdict ok', () => {
    const r = describePermission(granted());
    expect(r.verdict).toBe('ok');
  });
  test('refusé dans Réglages : bloqué, message explicite (push accepté par Apple mais jamais affiché)', () => {
    const r = describePermission({ status: 'denied', granted: false, canAskAgain: false, ios: { status: 1 } });
    expect(r.verdict).toBe('blocked');
    expect(texts(r).includes('REFUSÉES')).toBe(true);
  });
  test('jamais demandé : on peut demander', () => {
    const r = describePermission({ status: 'undetermined', canAskAgain: true, ios: { status: 0 } });
    expect(r.verdict).toBe('undetermined');
    expect(r.canAskAgain).toBe(true);
  });
  test('écran verrouillé désactivé : dégradé, cause nommée', () => {
    const r = describePermission(granted({ allowsDisplayOnLockScreen: false }));
    expect(r.verdict).toBe('degraded');
    expect(texts(r).includes('écran verrouillé')).toBe(true);
  });
  test('autorisation provisoire : remise silencieuse signalée', () => {
    const r = describePermission(granted({ status: 3 }));
    expect(r.verdict).toBe('degraded');
    expect(texts(r).includes('PROVISOIRE')).toBe(true);
  });
  test('alertes coupées, style « aucun », son, centre de notifications : chacun signalé', () => {
    const r = describePermission(granted({ allowsAlert: false, alertStyle: 0, allowsSound: false, allowsDisplayInNotificationCenter: false }));
    const t = texts(r);
    expect(t.includes('Alertes désactivées')).toBe(true);
    expect(t.includes('Style d’alerte')).toBe(true);
    expect(t.includes('Son désactivé')).toBe(true);
    expect(t.includes('Centre de notifications')).toBe(true);
  });
  test('valeur absente ou illisible : jamais d’invention', () => {
    expect(describePermission(null).verdict).toBe('unknown');
    expect(describePermission(undefined).verdict).toBe('unknown');
  });
});

const SERVER: ServerPushStatus = {
  settings: { notifPush: true, notifActivities: true, notifMeetings: true, notifLetters: true },
  devices: [{ platform: 'ios', kind: 'ExponentPushToken', suffix: 'abcdef', valid: true, updatedAt: '2026-11-26T12:23:23.000Z' }],
};
describe('état serveur', () => {
  test('jeton local suffixe', () => {
    expect(tokenSuffix('ExponentPushToken[xxxxxxabcdef]')).toBe('abcdef');
    expect(tokenSuffix(null)).toBeNull();
    expect(tokenSuffix('')).toBeNull();
  });
  test('tout en règle', () => {
    const f = describeServerState('abcdef', SERVER);
    expect(f.every((x) => x.severity === 'ok')).toBe(true);
  });
  test('push coupé dans le compte, catégorie Activités coupée', () => {
    expect(describeServerState('abcdef', { ...SERVER, settings: { ...SERVER.settings, notifPush: false } })[0]!.severity).toBe('error');
    expect(describeServerState('abcdef', { ...SERVER, settings: { ...SERVER.settings, notifActivities: false } })[0]!.severity).toBe('warn');
  });
  test('aucun appareil enregistré', () => {
    const f = describeServerState('abcdef', { ...SERVER, devices: [] });
    expect(f.some((x) => x.severity === 'error' && x.text.includes('Aucun appareil'))).toBe(true);
  });
  test('jeton de CET appareil absent côté serveur : le push part ailleurs', () => {
    const f = describeServerState('zzzzzz', SERVER);
    expect(f.some((x) => x.severity === 'error' && x.text.includes('CET appareil'))).toBe(true);
  });
  test('aucun jeton local, jeton invalide, serveur injoignable', () => {
    expect(describeServerState(null, SERVER).some((x) => x.severity === 'warn' && x.text.includes('n’a pas obtenu de jeton'))).toBe(true);
    expect(describeServerState('abcdef', { ...SERVER, devices: [{ ...SERVER.devices[0]!, valid: false }] }).some((x) => x.text.includes('format inattendu'))).toBe(true);
    expect(describeServerState('abcdef', null)[0]!.severity).toBe('warn');
  });
});

describe('résultats Expo', () => {
  test('libellés', () => {
    expect(describeExpoStatus('ok')).toBe('accepté');
    expect(describeExpoStatus('error:DeviceNotRegistered').includes('non enregistré')).toBe(true);
    expect(describeExpoStatus('error:InvalidCredentials').includes('APNs')).toBe(true);
    expect(describeExpoStatus('pas encore disponible').includes('15 min')).toBe(true);
    expect(describeExpoStatus('error:Autre')).toBe('refusé : Autre');
  });
});
