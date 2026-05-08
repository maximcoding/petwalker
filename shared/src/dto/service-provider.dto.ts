import { z } from 'zod';

import { BookingMode } from '../enums/booking-mode.js';
import { ServiceType } from '../enums/service-type.js';

import { AddressInput } from './address.dto.js';

/** Provider's general profile (no prices here — those live in offerings). */
export const UpsertServiceProviderProfileDto = z.object({
  bio: z.string().max(2000).nullable().optional(),
  serviceRadiusKm: z.number().positive().max(100).optional(),
  baseLat: z.number().min(-90).max(90).nullable().optional(),
  baseLng: z.number().min(-180).max(180).nullable().optional(),
});
export type UpsertServiceProviderProfileDto = z.infer<typeof UpsertServiceProviderProfileDto>;

/** Add or update one service offering with its own price + booking style. */
export const UpsertServiceOfferingDto = z.object({
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
  hourlyRateCents: z.number().int().nonnegative().max(100_00_000),
  active: z.boolean().default(true),
  /** Optional — if omitted on insert, the backend picks the per-service default. */
  bookingMode: z.enum([BookingMode.Window, BookingMode.Slot]).optional(),
  /** Slot length in minutes for slot mode (15–1440). Backend defaults if omitted. */
  slotDurationMin: z.number().int().min(15).max(1440).optional(),
  /**
   * Optional per-offering service address. Pass `null` to clear and fall
   * back to the provider's user.address.
   */
  serviceAddress: AddressInput.nullable().optional(),
  /** Default booking-address source ('owner' | 'provider' | 'either'). */
  addressDefault: z.enum(['owner', 'provider', 'either']).optional(),
});
export type UpsertServiceOfferingDto = z.infer<typeof UpsertServiceOfferingDto>;
