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
  // Display-only chips on the provider card. Both nullable so the provider
  // can clear them. The year cap matches the DB CHECK; we also reject any
  // year strictly greater than the current year on the API side (keeps the
  // chip honest — "Walking since 2099" would look ridiculous).
  baseCity: z.string().trim().max(120).nullable().optional(),
  experienceSinceYear: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getUTCFullYear())
    .nullable()
    .optional(),
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
  /**
   * Deprecated. Pass `supportedSources` instead. Older clients can keep
   * sending this; the backend ignores it.
   */
  addressDefault: z.enum(['owner', 'provider', 'either']).optional(),
  /**
   * Provider's allow-list of address sources for this offering. At least
   * one must be true — enforced both here (zod refine) and at the DB
   * level (CHECK constraint). Omit to keep the existing values; on a
   * fresh insert the backend seeds defaults from the service type.
   */
  supportedSources: z
    .object({
      owner: z.boolean(),
      provider: z.boolean(),
      custom: z.boolean(),
    })
    .refine(
      (s) => s.owner || s.provider || s.custom,
      'At least one address source must be supported',
    )
    .optional(),
});
export type UpsertServiceOfferingDto = z.infer<typeof UpsertServiceOfferingDto>;
