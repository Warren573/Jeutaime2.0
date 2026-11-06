import { describe, it, expect } from 'vitest';
import { profileScrollBottomPadding } from '../src/utils/profileScrollPadding';

describe('profileScrollBottomPadding', () => {
  it('Galaxy A17, échange actif : bloc 108 dp + 56 dp sous le bloc → 180 dp', () => {
    expect(profileScrollBottomPadding('android', 108 + 56)).toBe(180);
  });
  it('iOS : valeur d’origine inchangée (80)', () => {
    expect(profileScrollBottomPadding('ios', 164)).toBe(80);
  });
  it('aucun bloc mesuré (profil personnel, chargement) → 80', () => {
    expect(profileScrollBottomPadding('android', 0)).toBe(80);
    expect(profileScrollBottomPadding('android', Number.NaN)).toBe(80);
  });
  it('ne descend jamais sous la valeur d’origine', () => {
    expect(profileScrollBottomPadding('android', 20)).toBe(80);
  });
});
