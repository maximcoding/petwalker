import type { ServiceOfferingRow } from '../../db/schema/service-offerings.js';
import type { ServiceProviderProfileRow } from '../../db/schema/service-provider-profiles.js';
import type { UserRow } from '../../db/schema/users.js';
import { mapServiceOfferingRow } from '../users/service-offering.mapper.js';

import type { ServiceProviderListing } from '@petwalker/shared';

/** Joined row used by the search query — profile + user + matching offering. */
export interface ProviderJoinedRow {
  profile: ServiceProviderProfileRow;
  user: Pick<UserRow, 'id' | 'fullName' | 'avatarUrl' | 'createdAt'>;
  offering: ServiceOfferingRow;
}

export function mapProviderListing(
  row: ProviderJoinedRow,
  distanceM: number,
): ServiceProviderListing {
  return {
    userId: row.profile.userId,
    fullName: row.user.fullName ?? '',
    avatarUrl: row.user.avatarUrl ?? null,
    bio: row.profile.bio ?? null,
    baseLat: row.profile.baseLat == null ? null : Number(row.profile.baseLat),
    baseLng: row.profile.baseLng == null ? null : Number(row.profile.baseLng),
    serviceRadiusKm: Number(row.profile.serviceRadiusKm),
    baseCity: row.profile.baseCity ?? null,
    experienceSinceYear: row.profile.experienceSinceYear ?? null,
    registeredAt: row.user.createdAt.toISOString(),
    // Defaults — overwritten by ProvidersService.search() after the
    // aggregate rating + favorites lookups run against the page slice.
    rating: null,
    reviewCount: 0,
    verified: row.profile.verifiedAt !== null,
    distanceM: Math.round(distanceM),
    // Use the canonical offering mapper so any future offering field
    // (bookingMode, slotDurationMin, ...) shows up here automatically.
    offerings: [mapServiceOfferingRow(row.offering)],
    // Default — overwritten by ProvidersService.search() once the
    // favorites lookup runs against the page slice.
    isFavorited: false,
  };
}
