import type { FreeSlotsQuery } from '../../dto/free-slots.dto.js';
import type { SearchProvidersQuery } from '../../dto/provider-search.dto.js';
import type { FreeSlot } from '../../types/calendar.js';
import type { CursorPage, UUID } from '../../types/common.js';
import type { ServiceProviderDetail, ServiceProviderListing } from '../../types/service-provider.js';
import type { HttpClient } from '../http.js';

export class ProvidersApi {
  constructor(private readonly http: HttpClient) {}

  search(query: SearchProvidersQuery): Promise<CursorPage<ServiceProviderListing>> {
    return this.http.get('/providers', query);
  }

  /** Full provider profile — bio, location, offerings. Used by `/providers/:id` page. */
  get(providerId: UUID): Promise<ServiceProviderDetail> {
    return this.http.get(`/providers/${providerId}`);
  }

  /**
   * Bookable slots for a provider. The returned `start`/`end` are ISO 8601
   * UTC strings. Owners pick one; the booking form passes the chosen
   * `start` straight to `bookings.create`.
   */
  freeSlots(providerId: UUID, query: FreeSlotsQuery): Promise<FreeSlot[]> {
    return this.http.get(`/providers/${providerId}/free-slots`, query);
  }
}
