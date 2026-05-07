'use client';

import { useMemo } from 'react';

import type { GeoSample } from '@petwalker/shared';

interface Props {
  samples: GeoSample[];
  height?: number;
}

/**
 * Lightweight SVG polyline renderer. We intentionally avoid Leaflet/Mapbox in
 * M3 to keep the dep footprint thin — the M5 polish pass swaps this for a
 * tile-backed map. Until then, this gives you a faithful shape of the trail
 * at a glance, with start (green) and current (orange) markers.
 */
export function WalkTrail({ samples, height = 360 }: Props): JSX.Element {
  const { path, start, end, bbox } = useMemo(() => projected(samples), [samples]);

  if (samples.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500 dark:bg-slate-900"
      >
        Waiting for first GPS ping…
      </div>
    );
  }

  return (
    <div
      style={{ height }}
      className="overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900"
    >
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
      >
        <rect width={VIEWBOX} height={VIEWBOX} fill="transparent" />
        {path ? (
          <polyline
            points={path}
            fill="none"
            stroke="#4456f0"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {start ? <circle cx={start.x} cy={start.y} r={6} fill="#10b981" /> : null}
        {end ? <circle cx={end.x} cy={end.y} r={6} fill="#f97316" /> : null}
      </svg>
      <p className="px-3 py-1 text-xs text-slate-500">
        {samples.length} pings · bbox{' '}
        {bbox.minLat.toFixed(4)}, {bbox.minLng.toFixed(4)} → {bbox.maxLat.toFixed(4)},{' '}
        {bbox.maxLng.toFixed(4)}
      </p>
    </div>
  );
}

const VIEWBOX = 1000;
const PADDING = 40;

interface Projected {
  path: string | null;
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number };
}

function projected(samples: GeoSample[]): Projected {
  if (samples.length === 0) {
    return {
      path: null,
      start: null,
      end: null,
      bbox: { minLat: 0, minLng: 0, maxLat: 0, maxLng: 0 },
    };
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const s of samples) {
    if (s.lat < minLat) minLat = s.lat;
    if (s.lat > maxLat) maxLat = s.lat;
    if (s.lng < minLng) minLng = s.lng;
    if (s.lng > maxLng) maxLng = s.lng;
  }
  // Tiny degenerate bounds (single ping or stationary) — give them headroom.
  if (maxLat - minLat < 1e-5) {
    minLat -= 1e-4;
    maxLat += 1e-4;
  }
  if (maxLng - minLng < 1e-5) {
    minLng -= 1e-4;
    maxLng += 1e-4;
  }

  const spanLat = maxLat - minLat;
  const spanLng = maxLng - minLng;
  const span = Math.max(spanLat, spanLng);
  const usable = VIEWBOX - PADDING * 2;
  const scale = usable / span;

  // Centre on shorter axis so the trail doesn't squish.
  const offsetX = (VIEWBOX - spanLng * scale) / 2;
  const offsetY = (VIEWBOX - spanLat * scale) / 2;

  function project(s: GeoSample): { x: number; y: number } {
    const x = offsetX + (s.lng - minLng) * scale;
    // SVG y grows downwards, latitude grows upwards — invert.
    const y = offsetY + (maxLat - s.lat) * scale;
    return { x, y };
  }

  const points = samples.map(project);
  const path = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return {
    path,
    start: points[0] ?? null,
    end: points[points.length - 1] ?? null,
    bbox: { minLat, minLng, maxLat, maxLng },
  };
}
