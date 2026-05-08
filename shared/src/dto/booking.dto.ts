import { z } from 'zod';

import { BookingStatus } from '../enums/booking-status.js';
import { ServiceType } from '../enums/service-type.js';

import { AddressInput } from './address.dto.js';

const uuid = z.string().uuid();

export const CreateBookingDto = z.object({
  providerId: uuid,
  petId: uuid,
  serviceType: z.enum([
    ServiceType.Walking,
    ServiceType.Grooming,
    ServiceType.Sitting,
    ServiceType.Boarding,
    ServiceType.Training,
    ServiceType.Daycare,
    ServiceType.Photography,
    ServiceType.MassageWellness,
    ServiceType.SeniorCare,
    ServiceType.Veterinary,
    ServiceType.Fitness,
  ]),
  scheduledAt: z.string().datetime(),
  // Bumped from 240 → 1440 (24h) so daycare/boarding fit; per-service caps
  // can layer on later in a constraints map.
  durationMin: z.number().int().min(15).max(1440),
  notes: z.string().max(2000).nullable().optional(),
  /**
   * Where to perform the service. The backend resolves to a concrete
   * address using these rules:
   *   - 'owner_user'        → owner's user.address (must be set)
   *   - 'owner_pet'         → pet.address ?? owner.user.address
   *   - 'provider_user'     → provider's user.address
   *   - 'provider_offering' → offering.serviceAddress ?? provider.user.address
   *   - 'custom'            → use `customAddress` from this DTO (required)
   */
  addressSource: z.enum([
    'owner_user',
    'owner_pet',
    'provider_user',
    'provider_offering',
    'custom',
  ]),
  /** Required when `addressSource === 'custom'`. Ignored otherwise. */
  customAddress: AddressInput.optional(),
});
export type CreateBookingDto = z.infer<typeof CreateBookingDto>;

/** Optional reason on cancel. */
export const CancelBookingDto = z.object({
  reason: z.string().max(500).optional(),
});
export type CancelBookingDto = z.infer<typeof CancelBookingDto>;

export const ListBookingsQuery = z.object({
  status: z
    .enum([
      BookingStatus.Pending,
      BookingStatus.Confirmed,
      BookingStatus.InProgress,
      BookingStatus.Completed,
      BookingStatus.Cancelled,
    ])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListBookingsQuery = z.infer<typeof ListBookingsQuery>;
