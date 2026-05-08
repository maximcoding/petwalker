import { describe, expect, it } from 'vitest';
import {
  getMaxTimesPerDay,
  MAX_TIMES_PER_DAY,
} from './service-type-constraints.js';

describe('MAX_TIMES_PER_DAY', () => {
  it('walking allows up to 4 times per day', () => {
    expect(MAX_TIMES_PER_DAY['walking']).toBe(4);
  });

  it('grooming allows only 1 time per day', () => {
    expect(MAX_TIMES_PER_DAY['grooming']).toBe(1);
  });

  it('boarding allows only 1 time per day', () => {
    expect(MAX_TIMES_PER_DAY['boarding']).toBe(1);
  });

  it('covers all 11 service types', () => {
    const serviceTypes = [
      'walking', 'grooming', 'sitting', 'boarding', 'training',
      'daycare', 'photography', 'massage_wellness', 'senior_care',
      'veterinary', 'fitness',
    ];
    for (const s of serviceTypes) {
      expect(MAX_TIMES_PER_DAY[s as keyof typeof MAX_TIMES_PER_DAY]).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('getMaxTimesPerDay', () => {
  it('returns the cap for a known service', () => {
    expect(getMaxTimesPerDay('walking')).toBe(4);
    expect(getMaxTimesPerDay('fitness')).toBe(2);
  });

  it('falls back to 1 for unknown service types', () => {
    expect(getMaxTimesPerDay('unknown_service' as never)).toBe(1);
  });
});
