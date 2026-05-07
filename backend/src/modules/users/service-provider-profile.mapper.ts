import type { ServiceProviderProfileRow } from '../../db/schema/service-provider-profiles.js';

import type { ServiceProviderProfile } from '@petwalker/shared/types';

export function mapServiceProviderProfileRow(
  row: ServiceProviderProfileRow,
): ServiceProviderProfile {
  return {
    userId: row.userId,
    bio: row.bio ?? null,
    serviceRadiusKm: Number(row.serviceRadiusKm),
    baseLat: row.baseLat == null ? null : Number(row.baseLat),
    baseLng: row.baseLng == null ? null : Number(row.baseLng),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
  };
}
