import { describe, test, expect } from '../test-support/assert';
import { PUSH_REGISTRATION_TTL_MS, parseRegistrationRecord, shouldRegisterDevice, type PushIdentity } from './pushRegistration';

const ME: PushIdentity = { userId: 'cmti-user-a', token: 'ExponentPushToken[abcdefghij]', platform: 'ios' };
const H = 3600_000;

describe('enregistrement de l’appareil : règle de décision', () => {
  test('premier démarrage, ou rien de mémorisé : on enregistre', () => {
    expect(shouldRegisterDevice(null, ME, 1)).toBe(true);
  });
  test('même compte, même jeton, même plateforme, moins de 24 h : aucune écriture', () => {
    expect(shouldRegisterDevice({ ...ME, at: 1000 }, ME, 1000 + 23 * H)).toBe(false);
    expect(shouldRegisterDevice({ ...ME, at: 1000 }, ME, 1000)).toBe(false);
  });
  test('24 h écoulées : on rafraîchit', () => {
    expect(shouldRegisterDevice({ ...ME, at: 1000 }, ME, 1000 + PUSH_REGISTRATION_TTL_MS)).toBe(true);
  });
  test('autre compte, autre jeton ou autre plateforme : on enregistre', () => {
    expect(shouldRegisterDevice({ ...ME, at: 1000 }, { ...ME, userId: 'autre' }, 2000)).toBe(true);
    expect(shouldRegisterDevice({ ...ME, at: 1000 }, { ...ME, token: 'ExponentPushToken[zzzzzzzzzz]' }, 2000)).toBe(true);
    expect(shouldRegisterDevice({ ...ME, at: 1000 }, { ...ME, platform: 'android' }, 2000)).toBe(true);
  });
  test('horloge de l’appareil reculée, identité inconnue : on enregistre (jamais de blocage)', () => {
    expect(shouldRegisterDevice({ ...ME, at: 5000 }, ME, 1000)).toBe(true);
    expect(shouldRegisterDevice({ ...ME, at: 1000 }, { ...ME, userId: '' }, 1001)).toBe(true);
    expect(shouldRegisterDevice({ ...ME, at: 1000 }, { ...ME, token: '' }, 1001)).toBe(true);
  });
  test('valeur mémorisée illisible ou incomplète : ignorée', () => {
    for (const raw of [null, undefined, '', 'pas du json', '{}', '{"userId":"u"}', '{"userId":"u","token":"t","platform":"ios","at":"x"}', '[]', 'null']) {
      expect(parseRegistrationRecord(raw as string | null)).toBeNull();
    }
    expect(parseRegistrationRecord(JSON.stringify({ ...ME, at: 5 }))).toEqual({ ...ME, at: 5 });
  });
});
