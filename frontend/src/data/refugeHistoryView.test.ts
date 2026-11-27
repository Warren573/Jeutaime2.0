import { describe, test, expect } from '../test-support/assert';
import { coinsLabel, daysLabel, formatAdventureDates, resultCategories, roleLabel, sortHistory, SMILE_LABELS, NEXT_STEP_LABELS } from './refugeHistoryView';

const d = (n: number, status: string) => ({ dayNumber: n, status, symbol: '' });

describe('historique : catégories de résultat explicites', () => {
  test('chaque catégorie garde sa signification réelle (2/2 ≠ 1/2 ≠ 0/2 ≠ incomplète ≠ non jouée)', () => {
    const days = [d(1, 'PERFECT'), d(2, 'PERFECT'), d(3, 'PARTIAL'), d(4, 'FAILED'), d(5, 'INCOMPLETE_ADOPTE_MISSING'), d(6, 'INCOMPLETE_ADOPTANT_MISSING'), d(7, 'NOT_PLAYED')];
    const c = resultCategories(days);
    expect(c.map((x) => [x.key, x.count])).toEqual([['perfect', 2], ['partial', 1], ['failed', 1], ['incomplete', 2], ['notPlayed', 1]]);
    expect(c.reduce((s, x) => s + x.count, 0)).toBe(7);
    expect(c[0]!.label.includes('2/2')).toBe(true);
    expect(c[1]!.label.includes('1/2')).toBe(true);
    expect(c[2]!.label.includes('0/2')).toBe(true);
  });
  test('seules les catégories présentes sont listées ; icônes = emojis actuels', () => {
    const c = resultCategories(Array.from({ length: 7 }, (_, i) => d(i + 1, 'PERFECT')));
    expect(c.map((x) => x.key)).toEqual(['perfect']);
    expect(c[0]!.symbol).toBe('❤️');
    expect(resultCategories([d(1, 'FAILED')])[0]!.symbol).toBe('❌');
    expect(resultCategories([d(1, 'INCOMPLETE_ADOPTE_MISSING')])[0]!.symbol).toBe('⚠️');
    expect(resultCategories([d(1, 'NOT_PLAYED')])[0]!.symbol).toBe('—');
  });
  test('journées sans résultat (OPEN) comptées à part, jamais fondues dans une autre catégorie', () => {
    const c = resultCategories([d(1, 'OPEN'), d(2, 'PERFECT')]);
    expect(c.map((x) => x.key)).toEqual(['perfect', 'open']);
  });
  test('pluriel', () => { expect(daysLabel(1)).toBe('1 jour'); expect(daysLabel(0)).toBe('0 jour'); expect(daysLabel(3)).toBe('3 jours'); });
});

describe('historique : rôle', () => {
  test('compagnon, parrain, marraine, ou formulation double', () => {
    expect(roleLabel('adopte', 'FEMME')).toBe('Compagnon');
    expect(roleLabel('adoptant', 'HOMME')).toBe('Parrain');
    expect(roleLabel('adoptant', 'FEMME')).toBe('Marraine');
    expect(roleLabel('adoptant', undefined)).toBe('Parrain / marraine');
    expect(roleLabel('adoptant', 'AUTRE')).toBe('Parrain / marraine');
  });
});

describe('historique : dates et pièces', () => {
  test('période en français, année affichée une fois ou des deux côtés', () => {
    expect(formatAdventureDates('2026-11-12T12:00:00', '2026-11-19T12:00:00')).toBe('Du 12 novembre au 19 novembre 2026');
    expect(formatAdventureDates('2026-12-28T12:00:00', '2027-01-04T12:00:00')).toBe('Du 28 décembre 2026 au 4 janvier 2027');
    expect(formatAdventureDates('2026-03-01T12:00:00', '2026-03-08T12:00:00')).toBe('Du 1er mars au 8 mars 2026');
  });
  test('dates manquantes ou invalides : jamais « Invalid Date »', () => {
    expect(formatAdventureDates(null, null)).toBe('Dates indisponibles');
    expect(formatAdventureDates('n’importe quoi', null)).toBe('Dates indisponibles');
    expect(formatAdventureDates('2026-11-12T12:00:00', null)).toBe('Depuis le 12 novembre 2026');
    expect(formatAdventureDates(null, '2026-11-19T12:00:00')).toBe('Terminée le 19 novembre 2026');
  });
  test('total de pièces', () => {
    expect(coinsLabel(170)).toBe('+170 pièces');
    expect(coinsLabel(1)).toBe('+1 pièce');
    expect(coinsLabel(0)).toBe('0 pièce');
    expect(coinsLabel(-5)).toBe('−5 pièces');
  });
});

describe('historique : statuts conservés, tri inchangé', () => {
  test('libellés du sourire et du jeu des 3 questions identiques à l’existant', () => {
    expect(SMILE_LABELS.MUTUAL).toBe('💚 Sourire mutuel');
    expect(SMILE_LABELS.NONE).toBe('Aucun Sourire envoyé');
    expect(NEXT_STEP_LABELS.QUESTIONS_STARTED).toBe('🎯 Jeu des 3 questions démarré');
    expect(NEXT_STEP_LABELS.DISCUSSION_OPEN).toBe('💌 Discussion ouverte');
    expect(NEXT_STEP_LABELS.NONE).toBe(null);
  });
  test('profils dévoilés sans sourire mutuel d’abord, ordre relatif conservé', () => {
    const e = [
      { id: 'a', revealed: true, smileState: 'MUTUAL' },
      { id: 'b', revealed: true, smileState: 'NONE' },
      { id: 'c', revealed: false, smileState: 'NONE' },
      { id: 'd', revealed: true, smileState: 'SENT' },
    ];
    expect(sortHistory(e).map((x) => x.id)).toEqual(['b', 'd', 'a', 'c']);
  });
});
