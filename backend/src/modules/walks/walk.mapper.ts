import type { WalkRow } from '../../db/schema/index.js';

import type { GeoSample, Walk } from '@petwalker/shared';

function iso(v: Date | string | null | undefined): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

function isoRequired(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

export function mapWalkRow(row: WalkRow): Walk {
  return {
    id: row.id,
    bookingId: row.bookingId,
    startedAt: iso(row.startedAt),
    endedAt: iso(row.endedAt),
    polyline: (row.polyline ?? []) as GeoSample[],
    distanceM: row.distanceM ?? null,
    createdAt: isoRequired(row.createdAt),
  };
}
