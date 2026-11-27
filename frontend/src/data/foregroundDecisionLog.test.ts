import { describe, test, expect } from '../test-support/assert';
import { clearForegroundDecisions, describePresentation, getForegroundDecisions, notificationTypeOf, recordForegroundDecision, type ForegroundDecisionEntry } from './foregroundDecisionLog';

const entry = (n: number): ForegroundDecisionEntry => ({ at: `t${n}`, source: 'handler', appState: 'active', type: 'MATCH_CREATED', path: '/refuge', banner: false, list: false, announced: null, reason: 'x' });

describe('journal des décisions de notification', () => {
  test('les plus récentes d’abord, 20 maximum', () => {
    clearForegroundDecisions();
    for (let i = 0; i < 25; i++) recordForegroundDecision(entry(i));
    expect(getForegroundDecisions().length).toBe(20);
    expect(getForegroundDecisions()[0]!.at).toBe('t24');
    expect(getForegroundDecisions()[19]!.at).toBe('t5');
    clearForegroundDecisions();
    expect(getForegroundDecisions().length).toBe(0);
  });
  test('le type est extrait sans jamais exposer d’identifiant ni de texte libre', () => {
    expect(notificationTypeOf({ type: 'MATCH_CREATED', matchId: 'secret' })).toBe('MATCH_CREATED');
    expect(notificationTypeOf({ type: 'un texte libre avec espaces' })).toBe('inconnu');
    expect(notificationTypeOf(null)).toBe('inconnu');
    expect(notificationTypeOf({})).toBe('inconnu');
  });
  test('explication : bannière application active signalée comme anormale', () => {
    expect(describePresentation('active', false).includes('aucune bannière')).toBe(true);
    expect(describePresentation('active', true).includes('MAIS')).toBe(true);
    expect(describePresentation('inactive', true).includes('inactive')).toBe(true);
  });
});
