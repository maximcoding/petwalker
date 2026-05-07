import { describe, expect, it } from 'vitest';

import { GeoPoint } from './geo-point.js';

describe('GeoPoint', () => {
  it('rejects invalid lat / lng', () => {
    expect(() => new GeoPoint(91, 0)).toThrow(/lat/);
    expect(() => new GeoPoint(0, -181)).toThrow(/lng/);
  });

  it('distanceTo same point is 0', () => {
    const p = new GeoPoint(40.7128, -74.0060);
    expect(p.distanceTo(p)).toBe(0);
  });

  it('distanceTo NYC ↔ LA ≈ 3936 km (Haversine)', () => {
    const nyc = new GeoPoint(40.7128, -74.006);
    const la = { lat: 34.0522, lng: -118.2437 };
    const km = nyc.distanceTo(la) / 1000;
    expect(km).toBeGreaterThan(3930);
    expect(km).toBeLessThan(3950);
  });

  it('isWithin radius', () => {
    const p = new GeoPoint(40.7128, -74.006);
    const near = { lat: 40.7129, lng: -74.0061 }; // ~14m
    const far = { lat: 40.73, lng: -73.99 }; // >1km
    expect(p.isWithin(100, near)).toBe(true);
    expect(p.isWithin(100, far)).toBe(false);
  });

  it('bbox produces a square containing the radius', () => {
    const p = new GeoPoint(40.7128, -74.006);
    const bbox = p.bbox(1000); // 1 km
    expect(bbox.minLat).toBeLessThan(p.lat);
    expect(bbox.maxLat).toBeGreaterThan(p.lat);
    expect(bbox.minLng).toBeLessThan(p.lng);
    expect(bbox.maxLng).toBeGreaterThan(p.lng);
    // Sanity: ~0.009° lat per 1 km at this latitude
    expect(bbox.maxLat - bbox.minLat).toBeCloseTo(0.018, 2);
  });

  it('toJSON returns plain LatLng', () => {
    const p = new GeoPoint(1.5, 2.5);
    expect(p.toJSON()).toEqual({ lat: 1.5, lng: 2.5 });
  });
});
