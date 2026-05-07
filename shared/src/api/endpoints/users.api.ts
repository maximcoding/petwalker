import type { ReplaceAvailabilityDto } from '../../dto/availability.dto.js';
import type {
  UpsertServiceOfferingDto,
  UpsertServiceProviderProfileDto,
} from '../../dto/service-provider.dto.js';
import type { UpdateUserDto } from '../../dto/user.dto.js';
import type { AvailabilitySlot } from '../../types/availability.js';
import type { ServiceOffering, ServiceProviderProfile } from '../../types/service-provider.js';
import type { User } from '../../types/user.js';
import type { HttpClient } from '../http.js';

export class UsersApi {
  constructor(private readonly http: HttpClient) {}

  updateMe(body: UpdateUserDto): Promise<User> {
    return this.http.patch('/users/me', body);
  }

  /** General provider profile (bio, base location, radius). Prices live in offerings. */
  getServiceProfile(): Promise<ServiceProviderProfile | null> {
    return this.http.get('/users/me/service-profile');
  }

  upsertServiceProfile(body: UpsertServiceProviderProfileDto): Promise<ServiceProviderProfile> {
    return this.http.put('/users/me/service-profile', body);
  }

  /** Per-service offerings (e.g. walking @ $25/h, grooming @ $40/h). */
  listMyOfferings(): Promise<ServiceOffering[]> {
    return this.http.get('/users/me/offerings');
  }

  upsertOffering(body: UpsertServiceOfferingDto): Promise<ServiceOffering> {
    return this.http.put(`/users/me/offerings/${body.serviceType}`, body);
  }

  removeOffering(serviceType: string): Promise<void> {
    return this.http.delete(`/users/me/offerings/${serviceType}`);
  }

  /** Recurring weekly availability (UTC). PUT replaces ALL slots. */
  getAvailability(): Promise<AvailabilitySlot[]> {
    return this.http.get('/users/me/availability');
  }

  replaceAvailability(body: ReplaceAvailabilityDto): Promise<AvailabilitySlot[]> {
    return this.http.put('/users/me/availability', body);
  }
}
