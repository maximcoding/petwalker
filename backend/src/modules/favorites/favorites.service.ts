import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray, lt, or } from 'drizzle-orm';

import { decodeCursor } from '../../common/cursor.js';
import { buildCursorPage } from '../../common/pagination.js';
import { DRIZZLE_DB } from '../../database/database.module.js';
import type { Database } from '../../db/client.js';
import {
  providerServiceOfferings,
  serviceProviderProfiles,
  userFavorites,
  users,
  type ServiceOfferingRow,
  type ServiceProviderProfileRow,
  type UserRow,
} from '../../db/schema/index.js';
import { mapServiceOfferingRow } from '../users/service-offering.mapper.js';

import type {
  CursorPage,
  FavoriteToggleResult,
  ServiceProviderListing,
} from '@petwalker/shared';

interface FavoritesCursor {
  /** createdAt of the boundary row, ISO string. */
  t: string;
  /** Tiebreaker — providerId at the boundary. */
  id: string;
}

/**
 * Owner-side favorites — saved providers list + toggle.
 *
 * Toggle endpoints are written to be idempotent so the optimistic UI in
 * web/mobile doesn't have to worry about double-clicks racing the server.
 * The composite PK on (user_id, provider_id) gives us this for free:
 * `INSERT ON CONFLICT DO NOTHING` and `DELETE WHERE PK = ?` are both no-ops
 * if the state is already what the caller asked for.
 */
@Injectable()
export class FavoritesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /** Idempotent — adds the favorite if not already present. */
  async add(userId: string, providerId: string): Promise<FavoriteToggleResult> {
    // Validate the target provider exists; otherwise we'd silently accept
    // any UUID and the user wouldn't know their click did nothing.
    await this.assertProviderExists(providerId);
    await this.db
      .insert(userFavorites)
      .values({ userId, providerId })
      .onConflictDoNothing({ target: [userFavorites.userId, userFavorites.providerId] });
    return { favorited: true };
  }

  /** Idempotent — removes the favorite if present, no-ops otherwise. */
  async remove(userId: string, providerId: string): Promise<FavoriteToggleResult> {
    await this.db
      .delete(userFavorites)
      .where(
        and(eq(userFavorites.userId, userId), eq(userFavorites.providerId, providerId)),
      );
    return { favorited: false };
  }

  /**
   * Cursor-paginated list of saved providers, most-recently-favorited first.
   * Returns the same `ServiceProviderListing` shape used by `/providers` so
   * the UI can reuse `ProviderCard`. `distanceM` is 0 since this list has no
   * search origin — the UI hides it when it's the favorites context.
   */
  async listMine(
    userId: string,
    q: { cursor?: string; limit: number },
  ): Promise<CursorPage<ServiceProviderListing>> {
    const conditions = [eq(userFavorites.userId, userId)];

    const cursor = decodeCursor<FavoritesCursor>(q.cursor);
    if (cursor) {
      const t = new Date(cursor.t);
      conditions.push(
        or(
          lt(userFavorites.createdAt, t),
          and(
            eq(userFavorites.createdAt, t),
            lt(userFavorites.providerId, cursor.id),
          ),
        )!,
      );
    }

    const rows = await this.db
      .select({
        favoritedAt: userFavorites.createdAt,
        favoritedProviderId: userFavorites.providerId,
        profile: serviceProviderProfiles,
        user: { id: users.id, fullName: users.fullName, avatarUrl: users.avatarUrl },
      })
      .from(userFavorites)
      .innerJoin(
        serviceProviderProfiles,
        eq(serviceProviderProfiles.userId, userFavorites.providerId),
      )
      .innerJoin(users, eq(users.id, serviceProviderProfiles.userId))
      .where(and(...conditions))
      .orderBy(desc(userFavorites.createdAt), desc(userFavorites.providerId))
      .limit(q.limit + 1);

    // Pull each provider's active offerings in a single round-trip. We don't
    // try to dedupe-by-service-type here — the favorites listing shows the
    // provider as a whole, not a specific service match, so we surface every
    // active offering they have.
    const providerIds = rows.map((r) => r.favoritedProviderId);
    const offerings = providerIds.length
      ? await this.db
          .select()
          .from(providerServiceOfferings)
          .where(
            and(
              eq(providerServiceOfferings.active, true),
              inArray(providerServiceOfferings.providerId, providerIds),
            ),
          )
      : [];
    const offeringsByProvider = new Map<string, ServiceOfferingRow[]>();
    for (const off of offerings) {
      const list = offeringsByProvider.get(off.providerId) ?? [];
      list.push(off as ServiceOfferingRow);
      offeringsByProvider.set(off.providerId, list);
    }

    return buildCursorPage(
      rows,
      q.limit,
      (r) => mapFavoriteListing(
        {
          profile: r.profile as ServiceProviderProfileRow,
          user: r.user as Pick<UserRow, 'id' | 'fullName' | 'avatarUrl'>,
        },
        offeringsByProvider.get(r.favoritedProviderId) ?? [],
      ),
      (r) => ({
        t: r.favoritedAt.toISOString(),
        id: r.favoritedProviderId,
      } satisfies FavoritesCursor),
    );
  }

  /**
   * Returns the set of provider ids the user has favorited, restricted to
   * the candidate ids passed in. Used by the search service to flag
   * `isFavorited` on listings without a left-join (keeps the search SQL
   * focused on filtering and lets us layer favorites on after the fact).
   */
  async favoritedSubset(userId: string, providerIds: string[]): Promise<Set<string>> {
    if (!providerIds.length) return new Set();
    const rows = await this.db
      .select({ providerId: userFavorites.providerId })
      .from(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, userId),
          inArray(userFavorites.providerId, providerIds),
        ),
      );
    return new Set(rows.map((r) => r.providerId));
  }

  /** True iff `userId` has favorited `providerId`. */
  async isFavorited(userId: string, providerId: string): Promise<boolean> {
    const rows = await this.db
      .select({ providerId: userFavorites.providerId })
      .from(userFavorites)
      .where(
        and(eq(userFavorites.userId, userId), eq(userFavorites.providerId, providerId)),
      )
      .limit(1);
    return rows.length > 0;
  }

  private async assertProviderExists(providerId: string): Promise<void> {
    const rows = await this.db
      .select({ userId: serviceProviderProfiles.userId })
      .from(serviceProviderProfiles)
      .where(eq(serviceProviderProfiles.userId, providerId))
      .limit(1);
    if (!rows.length) throw new NotFoundException('Provider not found');
  }
}

/** Build a listing from the favorites join, with isFavorited hardcoded true. */
function mapFavoriteListing(
  joined: {
    profile: ServiceProviderProfileRow;
    user: Pick<UserRow, 'id' | 'fullName' | 'avatarUrl'>;
  },
  offeringRows: ServiceOfferingRow[],
): ServiceProviderListing {
  return {
    userId: joined.profile.userId,
    fullName: joined.user.fullName ?? '',
    avatarUrl: joined.user.avatarUrl ?? null,
    bio: joined.profile.bio ?? null,
    baseLat: joined.profile.baseLat == null ? null : Number(joined.profile.baseLat),
    baseLng: joined.profile.baseLng == null ? null : Number(joined.profile.baseLng),
    serviceRadiusKm: Number(joined.profile.serviceRadiusKm),
    rating: null,
    reviewCount: 0,
    verified: joined.profile.verifiedAt !== null,
    distanceM: 0, // no origin in the favorites list
    offerings: offeringRows.map((r) => mapServiceOfferingRow(r)),
    isFavorited: true,
  };
}
