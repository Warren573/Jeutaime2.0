import { describe, it, expect } from 'vitest';
import { profileScrollBottomPadding } from '../src/utils/profileScrollPadding';

describe('profileScrollBottomPadding', () => {
  it.each([0, 20, 108 + 56, 108 + 20])('réserve exactement la hauteur couverte (%i)', height => {
    expect(profileScrollBottomPadding(height)).toBe(height);
  });

  it('ignore une mesure invalide', () => {
    expect(profileScrollBottomPadding(Number.NaN)).toBe(0);
    expect(profileScrollBottomPadding(-10)).toBe(0);
  });
});
