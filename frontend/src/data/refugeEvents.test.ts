import { describe, test, expect } from '../test-support/assert';
import { createRefugeEventBus, isRefugeNotificationType, refugeSessionIdOf } from './refugeEvents';

/** Minuteur manuel : le test décide quand la fenêtre de regroupement se ferme. */
function manualClock() {
  const queue: Array<() => void> = [];
  return { schedule: (fn: () => void) => { queue.push(fn); return queue.length; }, tick: () => { queue.splice(0).forEach((fn) => fn()); }, pending: () => queue.length };
}

describe('événements du Refuge : seuls les types du Refuge', () => {
  test('types REFUGE_* reconnus, tout le reste ignoré', () => {
    for (const t of ['REFUGE_ADOPTED', 'REFUGE_CHOICE_READY', 'REFUGE_RESULT_READY', 'REFUGE_DAY_RESULT', 'REFUGE_NEW_DAY', 'REFUGE_COINS', 'REFUGE_REVEAL_PHASE', 'REFUGE_REVEALED', 'REFUGE_REVEAL_REFUSED', 'REFUGE_EXPIRED']) {
      expect(isRefugeNotificationType(t)).toBe(true);
    }
    for (const t of ['MATCH_CREATED', 'LETTER_RECEIVED', 'DUEL_RECEIVED', 'refuge_adopted', '', null, undefined, 42, {}]) {
      expect(isRefugeNotificationType(t)).toBe(false);
    }
  });
  test('identifiant de session : valide seulement s’il est sûr', () => {
    expect(refugeSessionIdOf({ refugeSessionId: 'cmwvsz3t6001okik505vsekyq' })).toBe('cmwvsz3t6001okik505vsekyq');
    for (const bad of ['../x', 'a b', '', 'x'.repeat(65), 12, null, undefined, {}]) expect(refugeSessionIdOf({ refugeSessionId: bad })).toBeNull();
    expect(refugeSessionIdOf(null)).toBeNull();
    expect(refugeSessionIdOf('texte')).toBeNull();
  });
});

describe('événements du Refuge : rafraîchissement immédiat, une seule fois', () => {
  test('une notification du Refuge → chaque écran abonné est prévenu avec la session concernée', () => {
    const clock = manualClock();
    const bus = createRefugeEventBus({ schedule: clock.schedule });
    const seen: Array<string | null> = [];
    bus.subscribe((id) => seen.push(id));
    expect(bus.notify({ type: 'REFUGE_RESULT_READY', refugeSessionId: 'r1' })).toBe(true);
    expect(seen.length).toBe(0); // regroupé : pas encore
    clock.tick();
    expect(seen).toEqual(['r1']);
  });
  test('rafale (jour 7 : fin + résultat) : UN seul rafraîchissement', () => {
    const clock = manualClock();
    const bus = createRefugeEventBus({ schedule: clock.schedule });
    let calls = 0;
    bus.subscribe(() => { calls++; });
    bus.notify({ type: 'REFUGE_DAY_RESULT', refugeSessionId: 'r1' });
    bus.notify({ type: 'REFUGE_REVEAL_PHASE', refugeSessionId: 'r1' });
    bus.notify({ type: 'REFUGE_COINS', refugeSessionId: 'r1' });
    expect(clock.pending()).toBe(1); // un seul minuteur armé
    clock.tick();
    expect(calls).toBe(1);
  });
  test('sessions différentes dans la même fenêtre : session inconnue (null), chaque écran vérifie la sienne', () => {
    const clock = manualClock();
    const bus = createRefugeEventBus({ schedule: clock.schedule });
    const seen: Array<string | null> = [];
    bus.subscribe((id) => seen.push(id));
    bus.notify({ type: 'REFUGE_NEW_DAY', refugeSessionId: 'r1' });
    bus.notify({ type: 'REFUGE_NEW_DAY', refugeSessionId: 'r2' });
    clock.tick();
    expect(seen).toEqual([null]);
  });
  test('identifiant absent ou forgé : session inconnue, jamais une valeur inventée', () => {
    const clock = manualClock();
    const bus = createRefugeEventBus({ schedule: clock.schedule });
    const seen: Array<string | null> = [];
    bus.subscribe((id) => seen.push(id));
    bus.notify({ type: 'REFUGE_EXPIRED' });
    clock.tick();
    bus.notify({ type: 'REFUGE_EXPIRED', refugeSessionId: '../admin' });
    clock.tick();
    expect(seen).toEqual([null, null]);
  });
  test('deux fenêtres successives : deux rafraîchissements (un par événement distinct dans le temps)', () => {
    const clock = manualClock();
    const bus = createRefugeEventBus({ schedule: clock.schedule });
    let calls = 0;
    bus.subscribe(() => { calls++; });
    bus.notify({ type: 'REFUGE_ADOPTED', refugeSessionId: 'r1' }); clock.tick();
    bus.notify({ type: 'REFUGE_CHOICE_READY', refugeSessionId: 'r1' }); clock.tick();
    expect(calls).toBe(2);
  });
});

describe('événements du Refuge : aucun rafraîchissement inutile', () => {
  test('autre type de notification (match, lettre, duel…) : aucun minuteur, aucun écran prévenu', () => {
    const clock = manualClock();
    const bus = createRefugeEventBus({ schedule: clock.schedule });
    let calls = 0;
    bus.subscribe(() => { calls++; });
    for (const data of [{ type: 'MATCH_CREATED', matchId: 'm1' }, { type: 'LETTER_RECEIVED' }, { type: 'DUEL_RESULT' }, null, undefined, 'x', {}]) {
      expect(bus.notify(data)).toBe(false);
    }
    expect(clock.pending()).toBe(0);
    clock.tick();
    expect(calls).toBe(0);
  });
  test('écran désabonné (quitté) : plus jamais prévenu', () => {
    const clock = manualClock();
    const bus = createRefugeEventBus({ schedule: clock.schedule });
    let a = 0, b = 0;
    const offA = bus.subscribe(() => { a++; });
    bus.subscribe(() => { b++; });
    offA();
    bus.notify({ type: 'REFUGE_NEW_DAY', refugeSessionId: 'r1' });
    clock.tick();
    expect(a).toBe(0);
    expect(b).toBe(1);
  });
  test('un écran en échec n’empêche pas les autres de se rafraîchir', () => {
    const clock = manualClock();
    const bus = createRefugeEventBus({ schedule: clock.schedule });
    let ok = 0;
    bus.subscribe(() => { throw new Error('écran cassé'); });
    bus.subscribe(() => { ok++; });
    bus.notify({ type: 'REFUGE_RESULT_READY', refugeSessionId: 'r1' });
    clock.tick();
    expect(ok).toBe(1);
  });
  test('aucun abonné : aucune erreur', () => {
    const clock = manualClock();
    const bus = createRefugeEventBus({ schedule: clock.schedule });
    bus.notify({ type: 'REFUGE_ADOPTED', refugeSessionId: 'r1' });
    clock.tick();
    expect(clock.pending()).toBe(0);
  });
});
