import type { ServiceOfferingRow } from '../../db/schema/service-offerings.js';

import type { ServiceOffering, ServiceType } from '@petwalker/shared';

export function mapServiceOfferingRow(row: ServiceOfferingRow): ServiceOffering {
  return {
    providerId: row.providerId,
    serviceType: row.serviceType as ServiceType,
    hourlyRateCents: row.hourlyRateCents,
    active: row.active,
  };
}
