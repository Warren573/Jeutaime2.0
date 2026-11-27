import { describe, test, expect } from '../test-support/assert';
import { calendarGlyph, deriveEndView, questionsRoute, reportIsAutomatic, type EndViewInput } from './refugeEndFlow';

const base: EndViewInput = { status: 'AWAITING_REVEAL_CONSENT', myDecision: null, offered: true, hasReport: true, reportSeen: false, reviewRequested: false };

describe('fin d’aventure : vue dérivée de l’état serveur', () => {
  test('avant toute décision, bilan jamais vu : bilan une première fois', () => {
    expect(deriveEndView(base)).toBe('report');
  });
  test('bilan déjà vu, pas de décision : proposition de dévoilement (plus le bilan)', () => {
    expect(deriveEndView({ ...base, reportSeen: true })).toBe('proposal');
  });
  test('lecture du drapeau en cours : ni bilan ni proposition (pas de clignotement)', () => {
    expect(deriveEndView({ ...base, reportSeen: null })).toBe('loading');
  });
  test('après ma décision (j’ai accepté) : attente, même si le bilan n’a jamais été vu', () => {
    expect(deriveEndView({ ...base, myDecision: 'ACCEPT' })).toBe('waiting');
    expect(deriveEndView({ ...base, myDecision: 'ACCEPT', reportSeen: true })).toBe('waiting');
  });
  test('double accord : profil dévoilé, jamais le bilan', () => {
    expect(deriveEndView({ ...base, status: 'REVEALED', myDecision: 'ACCEPT' })).toBe('revealed');
    expect(deriveEndView({ ...base, status: 'REVEALED', myDecision: 'ACCEPT', reportSeen: false })).toBe('revealed');
  });
  test('refus (le mien ou celui de l’autre) : fin du Refuge', () => {
    expect(deriveEndView({ ...base, status: 'COMPLETED', myDecision: 'ACCEPT' })).toBe('ended');
    expect(deriveEndView({ ...base, status: 'COMPLETED', myDecision: 'REFUSE' })).toBe('ended');
    expect(deriveEndView({ ...base, myDecision: 'REFUSE' })).toBe('ended');
  });
  test('« Revoir le bilan » : seul moyen de revoir le bilan après la décision', () => {
    for (const s of ['REVEALED', 'COMPLETED']) expect(deriveEndView({ ...base, status: s, reviewRequested: true })).toBe('report');
    expect(deriveEndView({ ...base, myDecision: 'ACCEPT', reviewRequested: true })).toBe('report');
  });
  test('sans bilan disponible, « revoir » ne change rien', () => {
    expect(deriveEndView({ ...base, status: 'REVEALED', hasReport: false, reviewRequested: true })).toBe('revealed');
    expect(deriveEndView({ ...base, hasReport: false })).toBe('proposal');
  });
  test('dévoilement non proposable : bilan s’il existe, sinon attente passive', () => {
    expect(deriveEndView({ ...base, offered: false })).toBe('report');
    expect(deriveEndView({ ...base, offered: false, hasReport: false })).toBe('pending');
  });
  test('le bilan n’est « automatique » que sans demande volontaire', () => {
    expect(reportIsAutomatic('report', false)).toBe(true);
    expect(reportIsAutomatic('report', true)).toBe(false);
    expect(reportIsAutomatic('proposal', false)).toBe(false);
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
