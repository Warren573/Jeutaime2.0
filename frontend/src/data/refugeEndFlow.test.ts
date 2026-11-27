import { describe, test, expect } from '../test-support/assert';
import { calendarGlyph, deriveEndView, questionsRoute, reportIsAutomatic, shouldArchiveOnLeave, type EndViewInput } from './refugeEndFlow';

const base: EndViewInput = { status: 'REVEALED', hasReport: true, reportSeen: false, reviewRequested: false };

describe('fin d’aventure automatique : vue dérivée de l’état serveur', () => {
  test('bilan jamais vu : le bilan d’abord (une seule fois), même si les profils sont déjà dévoilés', () => {
    expect(deriveEndView(base)).toBe('report');
    expect(deriveEndView({ ...base, status: 'COMPLETED' })).toBe('report');
  });
  test('bilan déjà vu : « Une nouvelle histoire commence » (REVEALED), jamais le bilan', () => {
    expect(deriveEndView({ ...base, reportSeen: true })).toBe('revealed');
  });
  test('fin sans dévoilement (blocage, ancien flux en attente) : fin simple après le bilan', () => {
    for (const status of ['COMPLETED', 'AWAITING_REVEAL_CONSENT']) expect(deriveEndView({ ...base, status, reportSeen: true })).toBe('ended');
  });
  test('lecture du drapeau en cours : ni bilan ni écran d’arrivée (pas de clignotement)', () => {
    expect(deriveEndView({ ...base, reportSeen: null })).toBe('loading');
  });
  test('aucune vue de consentement : ni proposition, ni attente de l’autre personne', () => {
    const all = new Set<string>();
    for (const status of ['REVEALED', 'COMPLETED', 'AWAITING_REVEAL_CONSENT'])
      for (const hasReport of [true, false])
        for (const reportSeen of [true, false, null])
          for (const reviewRequested of [true, false]) all.add(deriveEndView({ status, hasReport, reportSeen, reviewRequested }));
    expect([...all].sort()).toEqual(['ended', 'loading', 'report', 'revealed']);
  });
  test('« Revoir le bilan » : seul moyen de revoir le bilan après la première fois', () => {
    for (const status of ['REVEALED', 'COMPLETED']) expect(deriveEndView({ ...base, status, reportSeen: true, reviewRequested: true })).toBe('report');
  });
  test('sans bilan disponible : directement l’écran d’arrivée', () => {
    expect(deriveEndView({ ...base, hasReport: false, reportSeen: null })).toBe('revealed');
    expect(deriveEndView({ ...base, hasReport: false, reviewRequested: true })).toBe('revealed');
    expect(deriveEndView({ ...base, status: 'COMPLETED', hasReport: false })).toBe('ended');
  });
  test('le bilan n’est « automatique » que sans demande volontaire', () => {
    expect(reportIsAutomatic('report', false)).toBe(true);
    expect(reportIsAutomatic('report', true)).toBe(false);
    expect(reportIsAutomatic('revealed', false)).toBe(false);
  });
});

describe('sortie de l’écran de fin : archivage', () => {
  test('on archive en quittant l’écran d’arrivée, jamais depuis le bilan automatique ni pendant le chargement', () => {
    expect(shouldArchiveOnLeave('revealed')).toBe(true);
    expect(shouldArchiveOnLeave('ended')).toBe(true);
    expect(shouldArchiveOnLeave('report')).toBe(false);
    expect(shouldArchiveOnLeave('loading')).toBe(false);
  });
});

describe('calendrier du bilan : mêmes glyphes que le calendrier du Refuge', () => {
  test('cœur plein, partiel, vide', () => {
    expect(calendarGlyph({ status: 'PERFECT', symbol: '❤️' })).toEqual({ glyph: '♥', filled: true });
    expect(calendarGlyph({ status: 'PARTIAL', symbol: '❤️' })).toEqual({ glyph: '♥', filled: true });
    expect(calendarGlyph({ status: 'PARTIAL', symbol: '💔' })).toEqual({ glyph: '◐', filled: true });
    expect(calendarGlyph({ status: 'FAILED', symbol: '❌' })).toEqual({ glyph: '♡', filled: false });
    expect(calendarGlyph({ status: 'NOT_PLAYED', symbol: '🤍' })).toEqual({ glyph: '♡', filled: false });
  });
  test('uniquement les glyphes texte du calendrier (jamais d’emoji coloré)', () => {
    for (const s of ['PERFECT', 'PARTIAL', 'FAILED', 'NOT_PLAYED', 'INCOMPLETE_ADOPTE_MISSING']) {
      expect(['♥', '◐', '♡'].includes(calendarGlyph({ status: s, symbol: '❤️' }).glyph)).toBe(true);
    }
  });
});

describe('jeu des 3 questions après dévoilement', () => {
  const m = { matchId: 'abc', status: 'ACTIVE', questionsValidated: false, discussionOpen: false };
  test('match actif sans questions validées : route du jeu', () => {
    expect(questionsRoute(m)).toBe('/(tabs)/letters?questionsMatchId=abc');
  });
  test('pas de match, match rompu, questions déjà validées ou discussion ouverte : pas de bouton', () => {
    expect(questionsRoute(null)).toBe(null);
    expect(questionsRoute({ ...m, status: 'BROKEN' })).toBe(null);
    expect(questionsRoute({ ...m, questionsValidated: true })).toBe(null);
    expect(questionsRoute({ ...m, discussionOpen: true })).toBe(null);
  });
});
