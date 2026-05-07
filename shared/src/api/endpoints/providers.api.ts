import type { SearchProvidersQuery } from '../../dto/provider-search.dto.js';
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
}
