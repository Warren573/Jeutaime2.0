import { describe, test, expect } from '../test-support/assert';
import {
  REFUGE_CYCLE_MS,
  refugeAnimation,
  refugeAnimationFrame,
  refugeNextChangeMs,
  type RefugeAnimationData,
} from './refugeAnimation';

const t0 = Date.parse('2026-01-01T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();
const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN;
const REACTIONS = 10 * SEC; // 2 actions × 5 s

const react = (a: [string, boolean], b: [string, boolean]) => [
  { action: a[0], correct: a[1] }, { action: b[0], correct: b[1] },
];
const resolved = (matches: number, reactions: RefugeAnimationData['reactions'], foodChoice: string | null = null): RefugeAnimationData =>
  ({ resolvedAt: iso(t0), matches, reactions, foodChoice });
const frameAt = (animation: RefugeAnimationData, ms: number, replayAt?: number) =>
  refugeAnimationFrame({ now: t0 + ms, animation, replayAt });
const poseAt = (animation: RefugeAnimationData, ms: number, replayAt?: number) => frameAt(animation, ms, replayAt).pose;

const perfect = resolved(2, react(['NOURRIR', true], ['JOUER', true]), 'sardines');
const half = resolved(1, react(['NOURRIR', true], ['LAVER', false]), 'fish');
const none = resolved(0, react(['CARESSER', false], ['JOUER', false]));

describe('réactions immédiates (2 × 5 s)', () => {
  test('Nourrir bien deviné : content, gamelle pleine puis vide, puis retour assis sans gamelle', () => {
    expect(frameAt(perfect, 0)).toEqual({ pose: 'content', phase: 'reaction', reactionIndex: 0, bowl: { food: 'sardines', level: 'full' } });
    expect(frameAt(perfect, 1999).bowl).toEqual({ food: 'sardines', level: 'full' });
    expect(frameAt(perfect, 2000).bowl).toEqual({ food: 'sardines', level: 'empty' });
    expect(frameAt(perfect, 3999)).toEqual({ pose: 'content', phase: 'reaction', reactionIndex: 0, bowl: { food: 'sardines', level: 'empty' } });
    expect(frameAt(perfect, 4000)).toEqual({ pose: 'assis', phase: 'reaction', reactionIndex: 0, bowl: null });
    expect(frameAt(perfect, 4999).pose).toBe('assis');
  });

  test('Nourrir mal deviné : boude, la gamelle reste pleine pendant toute la réaction', () => {
    const feedWrong = resolved(1, react(['NOURRIR', false], ['JOUER', true]), 'fish');
    for (const ms of [0, 1500, 2000, 3999]) {
      expect(frameAt(feedWrong, ms).pose).toBe('boude');
      expect(frameAt(feedWrong, ms).bowl).toEqual({ food: 'fish', level: 'full' });
    }
    expect(frameAt(feedWrong, 4000).bowl).toBeNull();
    expect(poseAt(feedWrong, 5000)).toBe('joue');
  });

  test('Jouer bien deviné : joue puis devient content ; mal deviné : boude', () => {
    expect(poseAt(perfect, 5000)).toBe('joue');
    expect(poseAt(perfect, 6999)).toBe('joue');
    expect(poseAt(perfect, 7000)).toBe('content');
    expect(poseAt(perfect, 8999)).toBe('content');
    expect(poseAt(perfect, 9000)).toBe('assis');
    expect(poseAt(none, 5000)).toBe('boude');
  });

  test('Câliner et Laver : content si bien deviné, boude sinon ; jamais de gamelle', () => {
    const wash = resolved(1, react(['LAVER', true], ['CARESSER', false]));
    expect(poseAt(wash, 0)).toBe('content');
    expect(frameAt(wash, 0).bowl).toBeNull();
    expect(poseAt(wash, 5000)).toBe('boude');
    expect(frameAt(wash, 5000).bowl).toBeNull();
  });

  test('Nourrir en seconde action : la gamelle apparaît pendant le second créneau', () => {
    const feedSecond = resolved(2, react(['JOUER', true], ['NOURRIR', true]), 'meat');
    expect(frameAt(feedSecond, 1000).bowl).toBeNull();
    expect(frameAt(feedSecond, 5000).bowl).toEqual({ food: 'meat', level: 'full' });
    expect(frameAt(feedSecond, 7000).bowl).toEqual({ food: 'meat', level: 'empty' });
    expect(frameAt(feedSecond, 9000).bowl).toBeNull();
  });

  test('les actions et les poses ne dépendent que de la réponse, jamais des actions secrètes', () => {
    expect(JSON.stringify(frameAt(perfect, 0))).not.toContain('JOUER');
  });
});

describe('cycle d’une heure — 2/2', () => {
  const at = (ms: number) => poseAt(perfect, REACTIONS + ms);
  test('0–15 min : content / joue (une image toutes les 5 s)', () => {
    expect(at(0)).toBe('content');
    expect(at(4999)).toBe('content');
    expect(at(5000)).toBe('joue');
    expect(at(10 * SEC)).toBe('content');
    expect(at(15 * MIN - 1)).toBe('joue');
  });
  test('15–30 min : joue / assis', () => {
    expect(at(15 * MIN)).toBe('joue');
    expect(at(15 * MIN + 5000)).toBe('assis');
    expect(at(30 * MIN - 1)).toBe('assis');
  });
  test('30–45 min : content / assis', () => {
    expect(at(30 * MIN)).toBe('content');
    expect(at(30 * MIN + 5000)).toBe('assis');
    expect(at(45 * MIN - 1)).toBe('assis');
  });
  test('45–60 min : assis / dort', () => {
    expect(at(45 * MIN)).toBe('assis');
    expect(at(45 * MIN + 5000)).toBe('dort');
    expect(at(HOUR - 1)).toBe('dort');
  });
  test('après 60 min : dort, figé', () => {
    for (const ms of [HOUR, HOUR + 5000, 5 * HOUR, 30 * HOUR]) {
      expect(frameAt(perfect, REACTIONS + ms)).toEqual({ pose: 'dort', phase: 'sleep', reactionIndex: null, bowl: null });
    }
  });
});

describe('cycle d’une heure — 1/2 et 0/2 : exactement le même comportement', () => {
  const marks = [0, 4999, 5000, 14 * MIN, 15 * MIN, 15 * MIN + 5000, 29 * MIN, 30 * MIN, 44 * MIN + 55 * SEC, 45 * MIN, 45 * MIN + 5000, HOUR - 5000, HOUR, 2 * HOUR];
  test('mêmes images à tous les instants', () => {
    for (const ms of marks) expect(poseAt(half, REACTIONS + ms)).toBe(poseAt(none, REACTIONS + ms));
  });
  test('0–15 min : content / boude ; 15–30 : boude / assis ; 30–45 : content / assis ; 45–60 : assis / dort', () => {
    const at = (ms: number) => poseAt(none, REACTIONS + ms);
    expect([at(0), at(5000)]).toEqual(['content', 'boude']);
    expect([at(15 * MIN), at(15 * MIN + 5000)]).toEqual(['boude', 'assis']);
    expect([at(30 * MIN), at(30 * MIN + 5000)]).toEqual(['content', 'assis']);
    expect([at(45 * MIN), at(45 * MIN + 5000)]).toEqual(['assis', 'dort']);
    expect(at(HOUR)).toBe('dort');
  });
  test('1/2 et 0/2 restent distincts dans les données', () => {
    expect(half.matches).toBe(1);
    expect(none.matches).toBe(0);
  });
});

describe('données anciennes ou incomplètes', () => {
  test('sans réactions (ancien serveur) : le cycle démarre au résultat', () => {
    const legacy = resolved(2, []);
    expect(poseAt(legacy, 0)).toBe('content');
    expect(poseAt(legacy, 5000)).toBe('joue');
    expect(poseAt(legacy, HOUR)).toBe('dort');
  });
  test('horodatages invalides ou absents : image neutre, jamais d’exception', () => {
    expect(refugeAnimation({ now: t0, animation: null })).toBe('assis');
    expect(refugeAnimation({ now: t0, animation: {} })).toBe('assis');
    expect(refugeAnimation({ now: t0, animation: { resolvedAt: 'pas-une-date', matches: 2 } })).toBe('assis');
    expect(refugeAnimation({ now: t0, animation: { choiceAt: 'x' } })).toBe('assis');
    expect(refugeAnimation({ now: NaN, animation: perfect })).toBe('assis');
  });
  test('résultat sans matches : traité comme une attente, pas comme un cycle', () => {
    expect(frameAt({ resolvedAt: iso(t0), choiceAt: iso(t0), matches: null }, 5000).phase).toBe('waiting');
  });
  test('horloge de l’appareil en retard sur le serveur : jamais de temps négatif', () => {
    expect(refugeAnimationFrame({ now: t0 - 3 * MIN, animation: perfect }).reactionIndex).toBe(0);
  });
  test('changement de jour sans nouveau choix : le dernier résultat poursuit son cycle puis dort', () => {
    const carried: RefugeAnimationData = { choiceAt: null, resolvedAt: iso(t0), matches: 2, reactions: perfect.reactions };
    expect(poseAt(carried, REACTIONS + 20 * MIN)).toBe('joue');
    expect(poseAt(carried, 24 * HOUR)).toBe('dort');
  });
});

describe('attente du parrain / de la marraine', () => {
  const waiting: RefugeAnimationData = { choiceAt: iso(t0) };
  const at = (ms: number) => poseAt(waiting, ms);
  test('avant 24 h : alternance assis / joue', () => {
    expect([at(0), at(4999), at(5000), at(10 * SEC), at(HOUR)]).toEqual(['assis', 'assis', 'joue', 'assis', 'assis']);
    expect(at(24 * HOUR - 5000)).toBe('joue');
  });
  test('à partir de 24 h : alternance assis / boude', () => {
    expect(at(24 * HOUR)).toBe('assis');
    expect(at(24 * HOUR + 5000)).toBe('boude');
    expect(at(48 * HOUR + 5000)).toBe('boude');
  });
  test('ne bascule jamais vers le sommeil tant que le résultat est en attente', () => {
    for (const h of [0, 1, 2, 12, 23, 24, 25, 100]) {
      expect(frameAt(waiting, h * HOUR + 5000).pose === 'dort').toBe(false);
    }
  });
  test('aucune gamelle, aucun indice sur les actions', () => {
    expect(frameAt(waiting, 5000).bowl).toBeNull();
    expect(JSON.stringify(frameAt(waiting, 5000))).not.toContain('NOURRIR');
  });
});

describe('rattrapage des réactions manquées (rejeu local)', () => {
  const late = REACTIONS + 20 * MIN; // résultat découvert 20 min plus tard
  const replayAt = t0 + late;
  test('rejoue les réactions une fois, depuis l’instant de découverte', () => {
    expect(frameAt(perfect, late, replayAt).phase).toBe('reaction');
    expect(frameAt(perfect, late, replayAt).bowl).toEqual({ food: 'sardines', level: 'full' });
    expect(frameAt(perfect, late + 2500, replayAt).bowl).toEqual({ food: 'sardines', level: 'empty' });
    expect(poseAt(perfect, late + 5000, replayAt)).toBe('joue');
  });
  test('après le rejeu, l’image redevient exactement celle du cycle serveur (aucune dérive)', () => {
    for (const ms of [late + REACTIONS, late + REACTIONS + 5000, late + 2 * MIN, late + 30 * MIN]) {
      expect(poseAt(perfect, ms, replayAt)).toBe(poseAt(perfect, ms));
    }
  });
  test('sans rejeu demandé, rien ne rejoue', () => {
    expect(frameAt(perfect, late).phase).toBe('cycle');
  });
});

describe('minuteur : un seul réveil au prochain changement', () => {
  const next = (animation: RefugeAnimationData | null, ms: number, replayAt?: number) =>
    refugeNextChangeMs({ now: t0 + ms, animation, replayAt });
  test('réactions : bascule gamelle (2 s), retour assis (4 s), créneau suivant (5 s)', () => {
    expect(next(perfect, 0)).toBe(2000);
    expect(next(perfect, 2500)).toBe(1500);
    expect(next(perfect, 4500)).toBe(500);
    expect(next(perfect, 9990)).toBe(50);
  });
  test('cycle : toutes les 5 s, aligné sur la fin des réactions', () => {
    expect(next(perfect, REACTIONS)).toBe(5000);
    expect(next(perfect, REACTIONS + 3000)).toBe(2000);
    expect(next(perfect, REACTIONS + HOUR - 1000)).toBe(1000);
  });
  test('attente : toutes les 5 s, aligné sur le choix', () => {
    expect(next({ choiceAt: iso(t0) }, 1000)).toBe(4000);
  });
  test('sommeil et état neutre : aucun minuteur', () => {
    expect(next(perfect, REACTIONS + REFUGE_CYCLE_MS)).toBeNull();
    expect(next(null, 0)).toBeNull();
    expect(next({}, 0)).toBeNull();
  });
  test('rejeu : suit son propre créneau', () => {
    expect(next(perfect, REACTIONS + 20 * MIN + 500, t0 + REACTIONS + 20 * MIN)).toBe(1500);
  });
});
