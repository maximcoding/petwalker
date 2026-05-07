import { describe, expect, it } from 'vitest';

import type { GeoSample } from '../types/common.js';

import { Polyline } from './polyline.js';

const baseT = 1_700_000_000_000;

function sample(lat: number, lng: number, dtSec: number): GeoSample {
  return { lat, lng, t: baseT + dtSec * 1000 };
}

describe('Polyline', () => {
  it('empty polyline → 0 distance, 0 duration, 0 speed', () => {
    const p = new Polyline([]);
    expect(p.distanceM()).toBe(0);
    expect(p.durationMs()).toBe(0);
    expect(p.averageSpeedMps()).toBe(0);
  });

  it('two points: distance = Haversine between them', () => {
    const p = new Polyline([sample(40.7128, -74.006, 0), sample(40.7228, -74.006, 60)]);
    // ~1.11 km north
    expect(p.distanceM()).toBeGreaterThan(1100);
    expect(p.distanceM()).toBeLessThan(1120);
    expect(p.durationMs()).toBe(60_000);
  });

  it('averageSpeedMps = distance / duration', () => {
    const p = new Polyline([sample(40.7128, -74.006, 0), sample(40.7228, -74.006, 60)]);
    const expected = p.distanceM() / 60;
    expect(p.averageSpeedMps()).toBeCloseTo(expected, 3);
  });

  it('append returns new Polyline (immutable)', () => {
    const a = new Polyline([sample(0, 0, 0)]);
    const b = a.append(sample(1, 1, 1));
    expect(a.samples).toHaveLength(1);
    expect(b.samples).toHaveLength(2);
  });

  it('fromSamples sorts by t', () => {
    const p = Polyline.fromSamples([
      sample(0, 0, 60),
      sample(0, 0, 0),
      sample(0, 0, 30),
    ]);
    expect(p.samples.map((s) => s.t)).toEqual([baseT, baseT + 30_000, baseT + 60_000]);
  });

  it('simplify drops collinear-ish points (epsilon m)', () => {
    // Three points on the same line, middle one is "redundant" within epsilon.
    const p = new Polyline([sample(0, 0, 0), sample(0.001, 0, 30), sample(0.002, 0, 60)]);
    // distances ≈ 111m + 111m vs straight 222m → bend ≈ 0m → drop middle
    const simplified = p.simplify(5);
    expect(simplified.samples.length).toBeLessThan(p.samples.length);
    expect(simplified.samples[0]).toEqual(p.samples[0]);
    expect(simplified.samples[simplified.samples.length - 1]).toEqual(p.samples[p.samples.length - 1]);
  });
});
