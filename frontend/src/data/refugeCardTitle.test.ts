import { describe, test, expect } from '../test-support/assert';
import { refugeCardTitle } from './refugeCardTitle';

const me = 'u-me', other = 'u-other';

describe('titre de la case Refuge', () => {
  test('sans adoption active : « Refuge » (jamais « Ton compagnon »)', () => {
    expect(refugeCardTitle(null, me)).toBe('Refuge');
    expect(refugeCardTitle(undefined, me)).toBe('Refuge');
    expect(refugeCardTitle({ adopteId: me, adoptantId: other, status: 'ACTIVE' }, null)).toBe('Refuge');
  });
  test('en attente d’être adopté (proposition ouverte) : « Refuge »', () => {
    for (const status of ['CREATION', 'WAITING_FOR_ADOPTANT']) expect(refugeCardTitle({ adopteId: me, adoptantId: null, status }, me)).toBe('Refuge');
  });
  test('parrain ou marraine : « Ton compagnon », quel que soit l’état de l’aventure', () => {
    for (const status of ['ACTIVE', 'REVEALED', 'COMPLETED', 'AWAITING_REVEAL_CONSENT']) expect(refugeCardTitle({ adopteId: other, adoptantId: me, status }, me)).toBe('Ton compagnon');
  });
  test('compagnon adopté par un homme : « Ton parrain » ; par une femme : « Ta marraine »', () => {
    for (const status of ['ACTIVE', 'REVEALED', 'COMPLETED']) {
      expect(refugeCardTitle({ adopteId: me, adoptantId: other, status, sponsorRole: 'parrain' }, me)).toBe('Ton parrain');
      expect(refugeCardTitle({ adopteId: me, adoptantId: other, status, sponsorRole: 'marraine' }, me)).toBe('Ta marraine');
    }
  });
  test('genre du parrain / de la marraine inconnu (ou ancien serveur) : formulation double, jamais un faux genre', () => {
    expect(refugeCardTitle({ adopteId: me, adoptantId: other, status: 'ACTIVE' }, me)).toBe('Ton parrain ou ta marraine');
    expect(refugeCardTitle({ adopteId: me, adoptantId: other, status: 'ACTIVE', sponsorRole: null }, me)).toBe('Ton parrain ou ta marraine');
  });
  test('session d’un autre compte (instantané périmé) : « Refuge »', () => {
    expect(refugeCardTitle({ adopteId: 'x', adoptantId: 'y', status: 'ACTIVE' }, me)).toBe('Refuge');
  });
  test('après archivage : le serveur ne renvoie plus de session → retour à « Refuge »', () => {
    const before = refugeCardTitle({ adopteId: me, adoptantId: other, status: 'REVEALED', sponsorRole: 'marraine' }, me);
    const after = refugeCardTitle(null, me);
    expect([before, after]).toEqual(['Ta marraine', 'Refuge']);
  });
});
