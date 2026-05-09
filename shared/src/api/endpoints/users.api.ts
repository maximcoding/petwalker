import type { CreateBlackoutDto } from '../../dto/blackout.dto.js';
import type { ReplaceAvailabilityDto } from '../../dto/availability.dto.js';
import type {
  UpsertServiceOfferingDto,
  UpsertServiceProviderProfileDto,
} from '../../dto/service-provider.dto.js';
import type { UpdateUserDto } from '../../dto/user.dto.js';
import type { AvailabilitySlot } from '../../types/availability.js';
import type { ProviderBlackout } from '../../types/blackout.js';
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

  /**
   * Manually trigger slot publication for a slot-mode offering. Idempotent —
   * returns the count of new slots actually inserted (existing rows
   * collide on the (provider, service, start) unique index and are kept).
   */
  publishSlots(serviceType: string): Promise<{ inserted: number }> {
    return this.http.post(`/users/me/offerings/${serviceType}/publish-slots`, {});
  }

  /** Recurring weekly availability (UTC). PUT replaces ALL slots. */
  getAvailability(): Promise<AvailabilitySlot[]> {
    return this.http.get('/users/me/availability');
  }

  replaceAvailability(body: ReplaceAvailabilityDto): Promise<AvailabilitySlot[]> {
    return this.http.put('/users/me/availability', body);
  }

  /** Provider unavailability windows (vacations, blocked dates). */
  listBlackouts(): Promise<ProviderBlackout[]> {
    return this.http.get('/users/me/blackouts');
  }

  createBlackout(body: CreateBlackoutDto): Promise<ProviderBlackout> {
    return this.http.post('/users/me/blackouts', body);
  }

  deleteBlackout(id: string): Promise<void> {
    return this.http.delete(`/users/me/blackouts/${id}`);
  }
}
