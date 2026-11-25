import { describe, test, expect } from '../test-support/assert';
import { computeClockOffsetMs, serverNow } from './refugeClock';
import { claimReplay, createReplayMemory, replayKey } from './refugeReplay';
import type { RefugeAnimationData } from './refugeAnimation';

const t0 = Date.parse('2026-01-01T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();
const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN;
const result: RefugeAnimationData = {
  resolvedAt: iso(t0), matches: 2,
  reactions: [{ action: 'NOURRIR', correct: true }, { action: 'JOUER', correct: true }],
};

describe('décalage d’horloge serveur', () => {
  test('appareil en retard / en avance', () => {
    expect(computeClockOffsetMs(iso(t0 + 5 * MIN), t0)).toBe(5 * MIN);
    expect(computeClockOffsetMs(iso(t0 - 2 * MIN), t0)).toBe(-2 * MIN);
    expect(serverNow(5 * MIN, t0)).toBe(t0 + 5 * MIN);
  });
  test('valeur absente ou invalide : aucun décalage', () => {
    expect(computeClockOffsetMs(null, t0)).toBe(0);
    expect(computeClockOffsetMs('nope', t0)).toBe(0);
    expect(computeClockOffsetMs(iso(t0), NaN)).toBe(0);
    expect(serverNow(NaN, t0)).toBe(t0);
  });
});

describe('rattrapage des réactions', () => {
  test('résultat vu en direct : aucun rejeu', () => {
    const memory = createReplayMemory();
    expect(claimReplay(memory, 'u1', 's1', result, t0 + 3 * SEC)).toBeNull();
    // retour plus tard sur l'écran : déjà vu, jamais de rejeu
    expect(claimReplay(memory, 'u1', 's1', result, t0 + 20 * MIN)).toBeNull();
  });
  test('résultat manqué : un seul rejeu, partagé entre le Refuge et l’accueil', () => {
    const memory = createReplayMemory();
    const first = claimReplay(memory, 'u1', 's1', result, t0 + 20 * MIN);
    expect(first).toBe(t0 + 20 * MIN);
    expect(claimReplay(memory, 'u1', 's1', result, t0 + 20 * MIN + 4000)).toBe(first); // même instant de départ
    expect(memory.replays.size).toBe(1);
  });
  test('après un redémarrage (mémoire rechargée avec le résultat vu) : aucun nouveau rejeu', () => {
    const memory = createReplayMemory();
    memory.seen.set('u1', replayKey('s1', result)!);
    expect(claimReplay(memory, 'u1', 's1', result, t0 + 20 * MIN)).toBeNull();
  });
  test('cycle terminé (> 1 h) : le compagnon dort, rien à rejouer', () => {
    expect(claimReplay(createReplayMemory(), 'u1', 's1', result, t0 + 10 * SEC + HOUR + MIN)).toBeNull();
  });
  test('un nouveau résultat (autre jour) est de nouveau rattrapable', () => {
    const memory = createReplayMemory();
    claimReplay(memory, 'u1', 's1', result, t0 + 20 * MIN);
    const nextDay = { ...result, resolvedAt: iso(t0 + 24 * HOUR) };
    expect(claimReplay(memory, 'u1', 's1', nextDay, t0 + 24 * HOUR + 20 * MIN)).toBe(t0 + 24 * HOUR + 20 * MIN);
  });
  test('deux utilisateurs du même appareil sont indépendants', () => {
    const memory = createReplayMemory();
    expect(claimReplay(memory, 'u1', 's1', result, t0 + 20 * MIN)).toBe(t0 + 20 * MIN);
    expect(replayKey('s1', result)).toBe(`s1|${iso(t0)}`);
  });
  test('pas de réactions, pas de matches ou pas de session : rien à rejouer', () => {
    const memory = createReplayMemory();
    expect(claimReplay(memory, 'u1', 's1', { ...result, reactions: [] }, t0 + 20 * MIN)).toBeNull();
    expect(claimReplay(memory, 'u1', 's1', { ...result, matches: null }, t0 + 20 * MIN)).toBeNull();
    expect(claimReplay(memory, 'u1', null, result, t0 + 20 * MIN)).toBeNull();
    expect(claimReplay(memory, 'u1', 's1', null, t0 + 20 * MIN)).toBeNull();
  });
});
