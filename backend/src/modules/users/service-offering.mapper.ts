import type { ServiceOfferingRow } from '../../db/schema/service-offerings.js';

import type { BookingMode, ServiceOffering, ServiceType } from '@petwalker/shared';

export function mapServiceOfferingRow(row: ServiceOfferingRow): ServiceOffering {
  return {
    providerId: row.providerId,
    serviceType: row.serviceType as ServiceType,
    hourlyRateCents: row.hourlyRateCents,
    active: row.active,
    // Stored as text — coerce to the shared union. Old rows defaulted to
    // 'window' via the migration so this is safe.
    bookingMode: row.bookingMode as BookingMode,
    slotDurationMin: row.slotDurationMin,
  };
}
