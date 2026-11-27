import { describe, test, expect } from '../test-support/assert';
import { ATTENTIONS, ATTENTION_REACTION_MS, actionZone, attentionKey, claimAttentionReaction, isAttentionKind } from './refugeAttention';

describe('petites attentions : les trois gestes', () => {
  test('exactement trois boutons, dans l’ordre demandé', () => {
    expect(ATTENTIONS.map((a) => a.label)).toEqual(['Gratter la tête', 'Faire une caresse', 'Dire bonjour']);
    expect(ATTENTIONS.map((a) => a.kind)).toEqual(['GRATTER_TETE', 'CARESSE', 'BONJOUR']);
    expect(ATTENTION_REACTION_MS).toBe(6000);
  });
  test('seuls les trois gestes sont acceptés', () => {
    for (const k of ['GRATTER_TETE', 'CARESSE', 'BONJOUR']) expect(isAttentionKind(k)).toBe(true);
    for (const k of ['NOURRIR', '', null, undefined, 3, {}]) expect(isAttentionKind(k)).toBe(false);
  });
});

describe('petites attentions : zone d’actions', () => {
  const base = { role: 'adoptant' as const, adopteSubmittedToday: false, canSendAttention: true, ended: false };
  test('parrain/marraine avant la validation du compagnon : les trois boutons', () => {
    expect(actionZone(base)).toBe('attentions');
  });
  test('après l’envoi : plus aucun bouton, les quatre actions ne sont pas encore là', () => {
    expect(actionZone({ ...base, canSendAttention: false })).toBe('none');
  });
  test('dès que le compagnon valide : les quatre actions habituelles prennent leur place', () => {
    expect(actionZone({ ...base, adopteSubmittedToday: true })).toBe('actions');
    expect(actionZone({ ...base, adopteSubmittedToday: true, canSendAttention: false })).toBe('actions');
  });
  test('le compagnon et les sessions terminées gardent l’affichage habituel', () => {
    expect(actionZone({ ...base, role: 'adopte' })).toBe('actions');
    expect(actionZone({ ...base, role: null })).toBe('actions');
    expect(actionZone({ ...base, ended: true })).toBe('actions');
  });
});

describe('petites attentions : réaction une seule fois', () => {
  test('clé valide seulement avec session, geste et horodatage', () => {
    expect(attentionKey('s1', { kind: 'BONJOUR', sentAt: '2026-11-27T10:00:00.000Z' })).toBe('s1|2026-11-27T10:00:00.000Z');
    for (const bad of [null, undefined, {}, { kind: 'X', sentAt: '2026-11-27T10:00:00.000Z' }, { kind: 'BONJOUR', sentAt: 'pas une date' }, { kind: 'BONJOUR' }]) {
      expect(attentionKey('s1', bad as never)).toBeNull();
    }
    expect(attentionKey(null, { kind: 'BONJOUR', sentAt: '2026-11-27T10:00:00.000Z' })).toBeNull();
  });
  test('la réaction ne se rejoue pas pour la même attention, mais se joue pour la suivante', () => {
    const seen = new Set<string>();
    expect(claimAttentionReaction(seen, 's1|a')).toBe(true);
    expect(claimAttentionReaction(seen, 's1|a')).toBe(false);
    expect(claimAttentionReaction(seen, 's1|b')).toBe(true);
    expect(claimAttentionReaction(seen, null)).toBe(false);
  });
  test('mémoire bornée', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) claimAttentionReaction(seen, `s|${i}`);
    expect(seen.size).toBe(20);
  });
});
