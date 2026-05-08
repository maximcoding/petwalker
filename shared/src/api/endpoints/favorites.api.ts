import type { FavoriteToggleResult } from '../../types/favorite.js';
import type { CursorPage, UUID } from '../../types/common.js';
import type { ServiceProviderListing } from '../../types/service-provider.js';
import type { HttpClient } from '../http.js';

/**
 * Owner-side favorites — three small endpoints sit close together so the
 * web/mobile UI can toggle the heart and list saved providers without
 * touching the providers controller.
 *
 * Toggle endpoints are idempotent on the server (insert ON CONFLICT DO
 * NOTHING / delete by composite PK), so optimistic UI is safe.
 */
export class FavoritesApi {
  constructor(private readonly http: HttpClient) {}

  /** Mark a provider as favorited for the calling owner. */
  add(providerId: UUID): Promise<FavoriteToggleResult> {
    return this.http.post(`/providers/${providerId}/favorite`, {});
  }

  /** Remove a provider from the caller's favorites. */
  remove(providerId: UUID): Promise<FavoriteToggleResult> {
    return this.http.delete(`/providers/${providerId}/favorite`);
  }

  /**
   * Cursor-paginated list of saved providers, most-recently-favorited
   * first. Each item is a `ServiceProviderListing` (so the UI can reuse
   * `ProviderCard`); `distanceM` is 0 since we don't have a search origin.
   */
  list(query?: { cursor?: string; limit?: number }): Promise<CursorPage<ServiceProviderListing>> {
    return this.http.get('/me/favorites', query);
  }
}
