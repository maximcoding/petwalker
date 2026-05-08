import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, between, eq, ilike, inArray, isNotNull, lte, or, sql } from 'drizzle-orm';

import { decodeCursor } from '../../common/cursor.js';
import { buildCursorPage } from '../../common/pagination.js';
import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import {
  providerAvailability,
  providerServiceOfferings,
  reviews,
  serviceProviderProfiles,
  users,
  type ServiceOfferingRow,
  type ServiceProviderProfileRow,
  type UserRow,
} from '../../db/schema/index.js';
import { FavoritesService } from '../favorites/favorites.service.js';
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
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    @Inject(FavoritesService) private readonly favorites: FavoritesService,
  ) {}

  async search(
    q: SearchProvidersQuery,
    viewerId?: string,
  ): Promise<CursorPage<ServiceProviderListing>> {
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

    // Free-text search — matches the trimmed query as a case-insensitive
    // substring of either the provider's full name or their bio. ILIKE is
    // fast enough at our current size (10K rows); swap to a pg_trgm GIN
    // index when latency becomes noticeable. Empty/whitespace-only is a
    // no-op (zod already trims).
    const trimmed = q.q?.trim();
    if (trimmed) {
      const pattern = `%${trimmed.replace(/[%_]/g, (ch) => `\\${ch}`)}%`;
      conditions.push(
        or(
          ilike(users.fullName, pattern),
          ilike(serviceProviderProfiles.bio, pattern),
        )!,
      );
    }

    const rows = await this.db
      .select({
        profile: serviceProviderProfiles,
        user: {
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
        },
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
    const page = buildCursorPage(
      sliced.slice(0, q.limit + 1),
      q.limit,
      (x) => mapProviderListing(x.row, x.distanceM),
      (x) => ({ d: x.distanceM, id: x.row.profile.userId } satisfies DistanceCursor),
    );

    // 5. Layer aggregate rating + reviewCount onto the page slice. We do
    //    this after pagination so the AVG/COUNT scan only touches the
    //    providers that will actually be sent to the client.
    if (page.items.length > 0) {
      const ratings = await this.aggregateRatings(page.items.map((p) => p.userId));
      page.items = page.items.map((p) => {
        const agg = ratings.get(p.userId);
        return {
          ...p,
          rating: agg?.rating ?? null,
          reviewCount: agg?.reviewCount ?? 0,
        };
      });
    }

    // 6. Layer per-viewer `isFavorited` after pagination so we only ask the
    //    favorites table for the providers actually being returned.
    if (viewerId && page.items.length > 0) {
      const favorited = await this.favorites.favoritedSubset(
        viewerId,
        page.items.map((p) => p.userId),
      );
      page.items = page.items.map((p) => ({ ...p, isFavorited: favorited.has(p.userId) }));
    }
    return page;
  }

  /**
   * Group-by aggregate of the reviews table for a list of provider ids.
   * Returns a Map keyed by providerId. Providers with no reviews are
   * absent from the map (not present with `0`/`null` — the caller fills
   * those defaults).
   *
   * Why a separate method: the same logic is needed by `getProfile` and
   * by the favorites listing in the future, and isolating it makes the
   * future swap to a denormalised `service_provider_profiles.rating_avg`
   * column a one-line change.
   */
  private async aggregateRatings(
    providerIds: string[],
  ): Promise<Map<string, { rating: number; reviewCount: number }>> {
    if (!providerIds.length) return new Map();
    const rows = await this.db
      .select({
        providerId: reviews.providerId,
        avg: sql<string>`avg(${reviews.rating})::numeric(3,2)`,
        count: sql<number>`count(*)::int`,
      })
      .from(reviews)
      .where(inArray(reviews.providerId, providerIds))
      .groupBy(reviews.providerId);
    const out = new Map<string, { rating: number; reviewCount: number }>();
    for (const r of rows) {
      out.set(r.providerId, {
        rating: Number(r.avg),
        reviewCount: Number(r.count),
      });
    }
    return out;
  }

  /** Full profile + offerings + user info. */
  async getProfile(
    providerId: string,
    viewerId?: string,
  ): Promise<ServiceProviderDetail> {
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

    const [isFavorited, ratings, availabilityRows] = await Promise.all([
      viewerId ? this.favorites.isFavorited(viewerId, providerId) : Promise.resolve(false),
      this.aggregateRatings([providerId]),
      this.db
        .select()
        .from(providerAvailability)
        .where(eq(providerAvailability.providerId, providerId)),
    ]);
    const agg = ratings.get(providerId);

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
      baseCity: joined.service_provider_profiles.baseCity ?? null,
      experienceSinceYear: joined.service_provider_profiles.experienceSinceYear ?? null,
      registeredAt: joined.users.createdAt.toISOString(),
      rating: agg?.rating ?? null,
      reviewCount: agg?.reviewCount ?? 0,
      verified: joined.service_provider_profiles.verifiedAt !== null,
      offerings: offeringRows.map((r) => mapServiceOfferingRow(r as ServiceOfferingRow)),
      availability: availabilityRows.map((r) => ({
        dayOfWeek: r.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        startTime: r.startTime.slice(0, 5),
        endTime: r.endTime.slice(0, 5),
      })),
      isFavorited,
    };
  }
}
