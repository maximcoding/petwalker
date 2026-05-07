import type { GeoSample } from '../types/common.js';

import { GeoPoint } from './geo-point.js';

/**
 * Polyline — a chronologically-ordered series of GPS samples for a single walk.
 * Persisted as jsonb in the `walks.polyline` column.
 */
export class Polyline {
  readonly samples: GeoSample[];

  constructor(samples: GeoSample[] = []) {
    this.samples = samples;
  }

  static fromSamples(samples: GeoSample[]): Polyline {
    return new Polyline(samples.slice().sort((a, b) => a.t - b.t));
  }

  append(sample: GeoSample): Polyline {
    return new Polyline([...this.samples, sample]);
  }

  /** Total walked distance in metres (sum of segment Haversine distances). */
  distanceM(): number {
    let total = 0;
    for (let i = 1; i < this.samples.length; i++) {
      const a = this.samples[i - 1]!;
      const b = this.samples[i]!;
      total += new GeoPoint(a.lat, a.lng).distanceTo({ lat: b.lat, lng: b.lng });
    }
    return Math.round(total);
  }

  /** Total elapsed wall-clock duration in ms. */
  durationMs(): number {
    if (this.samples.length < 2) return 0;
    return this.samples[this.samples.length - 1]!.t - this.samples[0]!.t;
  }

  /** Average speed in metres / second over the whole walk. */
  averageSpeedMps(): number {
    const dur = this.durationMs() / 1000;
    if (dur <= 0) return 0;
    return this.distanceM() / dur;
  }

  /**
   * Douglas–Peucker-lite simplification — drops points whose perpendicular
   * distance from the line between their neighbours is < epsilon metres.
   * Cheap good-enough variant for shrinking pings before persist.
   */
  simplify(epsilonM = 5): Polyline {
    if (this.samples.length < 3) return this;
    const kept: GeoSample[] = [this.samples[0]!];
    for (let i = 1; i < this.samples.length - 1; i++) {
      const prev = kept[kept.length - 1]!;
      const next = this.samples[i + 1]!;
      const cur = this.samples[i]!;
      const d =
        new GeoPoint(prev.lat, prev.lng).distanceTo({ lat: cur.lat, lng: cur.lng }) +
        new GeoPoint(cur.lat, cur.lng).distanceTo({ lat: next.lat, lng: next.lng }) -
        new GeoPoint(prev.lat, prev.lng).distanceTo({ lat: next.lat, lng: next.lng });
      if (d > epsilonM) kept.push(cur);
    }
    kept.push(this.samples[this.samples.length - 1]!);
    return new Polyline(kept);
  }

  toJSON(): GeoSample[] {
    return this.samples;
  }
}
