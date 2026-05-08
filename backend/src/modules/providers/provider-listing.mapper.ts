import type { ServiceOfferingRow } from '../../db/schema/service-offerings.js';
import type { ServiceProviderProfileRow } from '../../db/schema/service-provider-profiles.js';
import type { UserRow } from '../../db/schema/users.js';
import { mapServiceOfferingRow } from '../users/service-offering.mapper.js';

import type { ServiceProviderListing } from '@petwalker/shared';

/** Joined row used by the search query — profile + user + matching offering. */
export interface ProviderJoinedRow {
  profile: ServiceProviderProfileRow;
  user: Pick<UserRow, 'id' | 'fullName' | 'avatarUrl'>;
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
    rating: null, // populated in M5 when reviews land; null for MVP
    reviewCount: 0,
    verified: row.profile.verifiedAt !== null,
    distanceM: Math.round(distanceM),
    // Use the canonical offering mapper so any future offering field
    // (bookingMode, slotDurationMin, address...) shows up automatically.
    offerings: [mapServiceOfferingRow(row.offering)],
  };
}
