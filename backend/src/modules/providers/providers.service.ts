import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, between, eq, gte, isNotNull, lte } from 'drizzle-orm';

import { decodeCursor } from '../../common/cursor.js';
import { buildCursorPage } from '../../common/pagination.js';
import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import {
  providerServiceOfferings,
  serviceProviderProfiles,
  users,
  type ServiceOfferingRow,
  type ServiceProviderProfileRow,
  type UserRow,
} from '../../db/schema/index.js';
import { mapServiceOfferingRow } from '../users/service-offering.mapper.js';

import {
  mapProviderListing,
  type ProviderJoinedRow,
} from './provider-listing.mapper.js';

import { GeoPoint } from '@petwalker/shared/classes';
import type {
  CursorPage,
  SearchProvidersQuery,
  ServiceProviderDetail,
  ServiceProviderListing,
} from '@petwalker/shared';

interface DistanceCursor {
  /** Distance in metres at the boundary of the previous page. */
  d: number;
  /** Tiebreaker — provider userId at the boundary. */
  id: string;
}

@Injectable()
export class ProvidersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async search(q: SearchProvidersQuery): Promise<CursorPage<ServiceProviderListing>> {
    const origin = new GeoPoint(q.lat, q.lng);
    const { minLat, maxLat, minLng, maxLng } = origin.bbox(q.radiusKm * 1000);

    // 1. Pull all candidates within the bbox + matching active offering.
    //    bbox is conservative — distance is verified exactly with Haversine in step 2.
    const conditions = [
      eq(providerServiceOfferings.serviceType, q.serviceType),
      eq(providerServiceOfferings.active, true),
      isNotNull(serviceProviderProfiles.baseLat),
      isNotNull(serviceProviderProfiles.baseLng),
      between(serviceProviderProfiles.baseLat, String(minLat), String(maxLat)),
      between(serviceProviderProfiles.baseLng, String(minLng), String(maxLng)),
    ];
    if (q.maxHourlyCents !== undefined) {
      conditions.push(lte(providerServiceOfferings.hourlyRateCents, q.maxHourlyCents));
    }

    const rows = await this.db
      .select({
        profile: serviceProviderProfiles,
        user: { id: users.id, fullName: users.fullName, avatarUrl: users.avatarUrl },
        offering: providerServiceOfferings,
      })
      .from(serviceProviderProfiles)
      .innerJoin(users, eq(users.id, serviceProviderProfiles.userId))
      .innerJoin(
        providerServiceOfferings,
        eq(providerServiceOfferings.providerId, serviceProviderProfiles.userId),
      )
      .where(and(...conditions));

    // 2. Compute Haversine distance, drop anyone outside the radius, sort.
    const radiusM = q.radiusKm * 1000;
    const enriched = rows
      .map((r) => {
        const lat = Number(r.profile.baseLat);
        const lng = Number(r.profile.baseLng);
        const distanceM = origin.distanceTo({ lat, lng });
        return {
          row: r as ProviderJoinedRow,
          distanceM,
        };
      })
      .filter((x) => x.distanceM <= radiusM)
      .sort((a, b) => {
        if (a.distanceM !== b.distanceM) return a.distanceM - b.distanceM;
        return a.row.profile.userId.localeCompare(b.row.profile.userId);
      });

    // 3. Skip past the cursor, if any.
    const cursor = decodeCursor<DistanceCursor>(q.cursor);
    const sliced = cursor
      ? enriched.filter(
          (x) =>
            x.distanceM > cursor.d ||
            (x.distanceM === cursor.d && x.row.profile.userId > cursor.id),
        )
      : enriched;

    // 4. Build cursor page (over-fetch limit+1 to detect tail).
    return buildCursorPage(
      sliced.slice(0, q.limit + 1),
      q.limit,
      (x) => mapProviderListing(x.row, x.distanceM),
      (x) => ({ d: x.distanceM, id: x.row.profile.userId } satisfies DistanceCursor),
    );
  }

  /** Full profile + offerings + user info. */
  async getProfile(providerId: string): Promise<ServiceProviderDetail> {
    const profileRows = await this.db
      .select()
      .from(serviceProviderProfiles)
      .innerJoin(users, eq(users.id, serviceProviderProfiles.userId))
      .where(eq(serviceProviderProfiles.userId, providerId));
    const joined = profileRows[0] as
      | { service_provider_profiles: ServiceProviderProfileRow; users: UserRow }
      | undefined;
    if (!joined) throw new NotFoundException('Provider not found');

    const offeringRows = await this.db
      .select()
      .from(providerServiceOfferings)
      .where(
        and(
          eq(providerServiceOfferings.providerId, providerId),
          eq(providerServiceOfferings.active, true),
        ),
      );

    return {
      userId: joined.service_provider_profiles.userId,
      fullName: joined.users.fullName ?? '',
      avatarUrl: joined.users.avatarUrl ?? null,
      bio: joined.service_provider_profiles.bio ?? null,
      serviceRadiusKm: Number(joined.service_provider_profiles.serviceRadiusKm),
      baseLat:
        joined.service_provider_profiles.baseLat == null
          ? null
          : Number(joined.service_provider_profiles.baseLat),
      baseLng:
        joined.service_provider_profiles.baseLng == null
          ? null
          : Number(joined.service_provider_profiles.baseLng),
      rating: null, // M5 — reviews
      reviewCount: 0,
      verified: joined.service_provider_profiles.verifiedAt !== null,
      offerings: offeringRows.map((r) => mapServiceOfferingRow(r as ServiceOfferingRow)),
    };
  }
}
