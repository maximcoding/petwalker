import type { LatLng } from '../types/common.js';

/**
 * GeoPoint — immutable lat/lng with distance helpers.
 * Uses the Haversine formula. Sufficient for "nearby walker" filters
 * up to ~100km radius without PostGIS.
 */
export class GeoPoint implements LatLng {
  readonly lat: number;
  readonly lng: number;

  constructor(lat: number, lng: number) {
    if (lat < -90 || lat > 90) throw new Error(`Invalid lat: ${lat}`);
    if (lng < -180 || lng > 180) throw new Error(`Invalid lng: ${lng}`);
    this.lat = lat;
    this.lng = lng;
  }

  static of(p: LatLng): GeoPoint {
    return new GeoPoint(p.lat, p.lng);
  }

  /** Great-circle distance in metres between this point and another. */
  distanceTo(other: LatLng): number {
    const R = 6_371_008.8; // earth mean radius (m)
    const dLat = toRad(other.lat - this.lat);
    const dLng = toRad(other.lng - this.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(this.lat)) * Math.cos(toRad(other.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /** True if `other` is within `radiusM` metres of this point. */
  isWithin(radiusM: number, other: LatLng): boolean {
    return this.distanceTo(other) <= radiusM;
  }

  /**
   * Approximate bounding box for a radius — useful as a SQL prefilter
   * before computing exact Haversine in app code.
   */
  bbox(radiusM: number): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
    const latDelta = radiusM / 111_320;
    const lngDelta = radiusM / (111_320 * Math.cos(toRad(this.lat)));
    return {
      minLat: this.lat - latDelta,
      maxLat: this.lat + latDelta,
      minLng: this.lng - lngDelta,
      maxLng: this.lng + lngDelta,
    };
  }

  toJSON(): LatLng {
    return { lat: this.lat, lng: this.lng };
  }
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
