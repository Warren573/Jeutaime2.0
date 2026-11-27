import { describe, test, expect } from '../test-support/assert';
import { dayCoinsLabel, isEndScreenStatus, reportLines, revealOffered, type FinalReportData } from './refugeFinalReport';

const days = Array.from({ length: 7 }, (_, i) => ({ dayNumber: i + 1, symbol: '❤️', status: 'PERFECT', matches: 2, assiduous: true, coins: 10, points: 0 }));
const perfect: FinalReportData = { days, participationDays: 7, perfectDays: 7, correctActions: 14, perfectCourse: true, dailyCoins: 70, finalBonus: 100, bonusTier: 'perfect', totalCoins: 170, penaltyPoints: 0 };

describe('bilan final : lignes affichées', () => {
  test('parcours parfait : toutes les informations demandées, dans l’ordre, sans pénalité', () => {
    const l = reportLines(perfect);
    expect(l.map((x) => x.key)).toEqual(['participation', 'perfect', 'actions', 'daily', 'bonus', 'total']);
    expect(l.map((x) => x.value)).toEqual(['7 / 7', '7 / 7', '14 / 14', '+70 pièces', '+100 pièces (parcours parfait 14/14)', '+170 pièces']);
    expect(l[5]!.strong).toBe(true);
  });
  test('assiduité complète sans 14/14 : bonus de 50', () => {
    const l = reportLines({ ...perfect, perfectDays: 3, correctActions: 9, perfectCourse: false, finalBonus: 50, bonusTier: 'assiduity', totalCoins: 120 });
    expect(l.find((x) => x.key === 'bonus')!.value).toBe('+50 pièces (7 jours d’assiduité)');
    expect(l.find((x) => x.key === 'total')!.value).toBe('+120 pièces');
  });
  test('assiduité incomplète : aucun bonus ; pénalité en points affichée seulement si elle existe', () => {
    const r: FinalReportData = { ...perfect, participationDays: 5, perfectDays: 5, correctActions: 10, perfectCourse: false, dailyCoins: 50, finalBonus: 0, bonusTier: null, totalCoins: 50, penaltyPoints: -10 };
    const l = reportLines(r);
    expect(l.find((x) => x.key === 'bonus')!.value).toBe('Aucun bonus');
    expect(l.find((x) => x.key === 'penalty')!.value).toBe('−10');
    expect(reportLines(perfect).some((x) => x.key === 'penalty')).toBe(false);
  });
  test('rien gagné : « 0 pièce », jamais de montant négatif en pièces', () => {
    const l = reportLines({ ...perfect, participationDays: 0, perfectDays: 0, correctActions: 0, perfectCourse: false, dailyCoins: 0, finalBonus: 0, bonusTier: null, totalCoins: 0, penaltyPoints: -35 });
    expect(l.find((x) => x.key === 'total')!.value).toBe('0 pièce');
    expect(l.find((x) => x.key === 'penalty')!.value).toBe('−35');
  });
  test('pièces gagnées quotidiennement', () => {
    expect(dayCoinsLabel({ coins: 10 })).toBe('+10');
    expect(dayCoinsLabel({ coins: 0 })).toBe('—');
  });
});

describe('dévoilement : jamais avant l’expiration des 168 h', () => {
  const end = '2026-11-27T12:00:00.000Z';
  const t = Date.parse(end);
  test('refusé avant la fin, même si le serveur le disait', () => {
    expect(revealOffered({ available: true, endsAt: end, serverNowMs: t - 1 })).toBe(false);
  });
  test('proposé à la fin si le serveur le dit', () => {
    expect(revealOffered({ available: true, endsAt: end, serverNowMs: t })).toBe(true);
    expect(revealOffered({ available: true, endsAt: end, serverNowMs: t + 3600000 })).toBe(true);
  });
  test('jamais sans accord du serveur, ni sans heure de fin valide', () => {
    expect(revealOffered({ available: false, endsAt: end, serverNowMs: t + 1000 })).toBe(false);
    expect(revealOffered({ available: null, endsAt: end, serverNowMs: t + 1000 })).toBe(false);
    expect(revealOffered({ available: true, endsAt: null, serverNowMs: t + 1000 })).toBe(false);
    expect(revealOffered({ available: true, endsAt: 'pas une date', serverNowMs: t + 1000 })).toBe(false);
  });
  test('statuts de l’écran de fin', () => {
    for (const s of ['AWAITING_REVEAL_CONSENT', 'REVEALED', 'COMPLETED']) expect(isEndScreenStatus(s)).toBe(true);
    for (const s of ['ACTIVE', 'ABANDONED', 'WAITING_FOR_ADOPTANT', 'CREATION', null, undefined]) expect(isEndScreenStatus(s as never)).toBe(false);
  });
});
