import type { BookingRow } from '../../db/schema/bookings.js';

import type { Booking, CancelledBy, ServiceType } from '@petwalker/shared';

/**
 * Drizzle's `timestamp` columns default to `mode: 'string'` for postgres-js,
 * but the inferred row type still says `Date`. Runtime values can be either
 * a Date instance (depending on driver config) or already an ISO string.
 * `iso()` handles both.
 */
function iso(v: Date | string | null | undefined): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

function isoRequired(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

export function mapBookingRow(row: BookingRow): Booking {
  return {
    id: row.id,
    ownerId: row.ownerId,
    providerId: row.providerId,
    petId: row.petId,
    serviceType: row.serviceType as ServiceType,
    scheduledAt: isoRequired(row.scheduledAt),
    durationMin: row.durationMin,
    status: row.status,
    priceCents: row.priceCents,
    notes: row.notes ?? null,
    cancelledBy: (row.cancelledBy as CancelledBy | null) ?? null,
    cancelledAt: iso(row.cancelledAt),
    cancellationReason: row.cancellationReason ?? null,
    refundCents: row.refundCents,
    appFeeCents: row.appFeeCents,
    providerFeeCents: row.providerFeeCents,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}
