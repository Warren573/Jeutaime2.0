import { describe, test, expect } from 'vitest';
import { refugeAnimation } from './refugeAnimation';
const start = Date.parse('2026-01-01T12:00:00Z');
const resolvedAt = new Date(start).toISOString();
describe('refugeAnimation', () => {
  test('happy timeline and sleep', () => {
    const pose = (ms: number) => refugeAnimation({now:start+ms,resolvedAt,matches:2});
    expect(pose(0)).toBe('content');
    expect(pose(5000)).toBe('joue');
    expect(pose(900000)).toBe('joue');
    expect(pose(1800000)).toBe('content');
    expect(pose(2700000)).toBe('assis');
    expect(pose(3600000)).toBe('dort');
  });
  test('zero and one share the same animation', () => {
    for (const ms of [0,5000,900000,905000,1800000,2700000,3600000]) {
      expect(refugeAnimation({now:start+ms,resolvedAt,matches:0})).toBe(refugeAnimation({now:start+ms,resolvedAt,matches:1}));
    }
  });
  test('waiting changes after 24 hours', () => {
    expect(refugeAnimation({now:start+5000,choiceAt:resolvedAt})).toBe('joue');
    expect(refugeAnimation({now:start+86405000,choiceAt:resolvedAt})).toBe('boude');
  });
});
